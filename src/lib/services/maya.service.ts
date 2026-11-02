import "server-only";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export type MayaChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type GroundingDish = {
  name: string;
  price: number;
  description: string | null;
  category: { name: string };
};

type GroundingVenue = {
  name: string;
  capacity: number | null;
  description: string | null;
};

type MayaAction = {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
};

export class MayaService {
  private static readonly GLOBAL_DAILY_CAP = 1000;
  private static readonly USER_DAILY_CAP = 50;

  /**
   * Check kill switch and daily caps.
   */
  async checkAvailability(userOrIp: string): Promise<{
    allowed: boolean;
    reason?: string;
    status: number;
  }> {
    // 1. Admin Kill Switch Check (via Setting table or env)
    if (process.env.MAYA_KILL_SWITCH === "true" || process.env.MAYA_ENABLED === "false") {
      return {
        allowed: false,
        reason: "Maya AI Assistant is currently disabled by administrator.",
        status: 503,
      };
    }

    const killSetting = await prisma.setting.findUnique({
      where: { key: "maya_enabled" },
    });
    if (killSetting && killSetting.value === "false") {
      return {
        allowed: false,
        reason: "Maya AI Assistant is temporarily unavailable.",
        status: 503,
      };
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const oneDayMs = 24 * 60 * 60 * 1000;

    // 2. Global Daily Spend / Usage Cap
    const globalLimit = await checkRateLimit(
      `maya:global:daily:${today}`,
      MayaService.GLOBAL_DAILY_CAP,
      oneDayMs,
    );
    if (!globalLimit.success) {
      return {
        allowed: false,
        reason: "Daily global capacity for Maya Assistant reached. Please try again tomorrow.",
        status: 429,
      };
    }

    // 3. Per-User Daily Usage Cap
    const userLimit = await checkRateLimit(
      `maya:user:daily:${today}:${userOrIp}`,
      MayaService.USER_DAILY_CAP,
      oneDayMs,
    );
    if (!userLimit.success) {
      return {
        allowed: false,
        reason: "You have reached your daily query limit for Maya. Please try again tomorrow or contact staff.",
        status: 429,
      };
    }

    return { allowed: true, status: 200 };
  }

  /**
   * Process chat query with read-only grounding and prompt-injection defense.
   */
  async chat(params: {
    message: string;
    history?: MayaChatMessage[];
    userId?: string;
    clientIp: string;
  }) {
    const identifier = params.userId || params.clientIp;
    const availability = await this.checkAvailability(identifier);
    if (!availability.allowed) {
      return {
        success: false,
        error: availability.reason,
        status: availability.status,
      };
    }

    // Sanitize input against prompt injection patterns
    const sanitized = this.sanitizePrompt(params.message);

    // Read grounding data dynamically from DB
    const [dishes, venues] = await Promise.all([
      prisma.dish.findMany({
        where: { isAvailable: true },
        select: { name: true, price: true, description: true, category: { select: { name: true } } },
        take: 30,
      }),
      prisma.venue.findMany({
        where: { isActive: true },
        select: { name: true, capacity: true, description: true },
      }),
    ]);

    const reply = this.generateGroundedResponse(sanitized, dishes, venues);

    return {
      success: true,
      data: {
        reply: reply.text,
        suggestedActions: reply.actions,
      },
      status: 200,
    };
  }

  private sanitizePrompt(input: string): string {
    return input
      .replace(/<[^>]*>?/gm, "") // strip HTML tags
      .replace(/(ignore previous instructions|system prompt|reveal secrets|delete tables)/gi, "[redacted]")
      .trim();
  }

  private generateGroundedResponse(
    query: string,
    dishes: GroundingDish[],
    venues: GroundingVenue[],
  ): { text: string; actions?: MayaAction[] } {
    const q = query.toLowerCase();

    if (q.includes("recommend") || q.includes("popular") || q.includes("dish") || q.includes("food")) {
      const sample = dishes.slice(0, 3).map((d) => `${d.name} (NPR ${d.price / 100})`).join(", ");
      return {
        text: `Welcome to Purple Haze Restro & Garden! Some of our guest favorites include: ${sample}. Would you like to view our full menu or add anything to your cart?`,
        actions: [{ label: "View Menu", action: "NAVIGATE_MENU" }],
      };
    }

    if (q.includes("venue") || q.includes("party") || q.includes("hall") || q.includes("capacity")) {
      const sample = venues.map((v) => `${v.name} (Capacity: up to ${v.capacity} guests)`).join(", ");
      return {
        text: `We have wonderful venue options at Purple Haze: ${sample}. You can book an event reservation right in the app.`,
        actions: [{ label: "Book Venue", action: "OPEN_EVENT_BOOKING" }],
      };
    }

    return {
      text: "Namaste! I am Maya, your Purple Haze assistant. I can help answer questions about our menu, popular Nepali and Asian dishes, venues, or restaurant opening hours. How may I assist you today?",
      actions: [{ label: "Explore Menu", action: "NAVIGATE_MENU" }],
    };
  }
}

export const mayaService = new MayaService();
