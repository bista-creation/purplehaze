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

type GroundingPackage = {
  name: string;
  pricePerPerson: number;
  eventType: string;
  minGuests: number;
  description: string;
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

    // 2. Global Daily Spend / Usage Cap & Spend Alert
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
    if (globalLimit.remaining <= MayaService.GLOBAL_DAILY_CAP * 0.2) {
      console.warn(
        `[Maya Spend Alert] Global daily usage is at ${(1 - globalLimit.remaining / MayaService.GLOBAL_DAILY_CAP) * 100}%! Remaining: ${globalLimit.remaining}/${MayaService.GLOBAL_DAILY_CAP}`,
      );
    }

    // 3. Per-User Daily Usage Cap & Alert
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
    if (userLimit.remaining <= MayaService.USER_DAILY_CAP * 0.2) {
      console.warn(
        `[Maya Spend Alert] User ${userOrIp} reached 80% daily quota (${MayaService.USER_DAILY_CAP - userLimit.remaining}/${MayaService.USER_DAILY_CAP}).`,
      );
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
    const [dishes, venues, packages] = await Promise.all([
      prisma.dish.findMany({
        where: { isAvailable: true },
        select: { name: true, price: true, description: true, category: { select: { name: true } } },
        take: 30,
      }),
      prisma.venue.findMany({
        where: { isActive: true },
        select: { name: true, capacity: true, description: true },
      }),
      prisma.eventMenuPackage.findMany({
        where: { isActive: true },
        select: { name: true, pricePerPerson: true, eventType: true, minGuests: true, description: true },
        orderBy: { pricePerPerson: "asc" },
      }),
    ]);

    const reply = this.generateGroundedResponse(sanitized, dishes, venues, packages);

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
      .slice(0, 300) // Input length restriction
      .replace(/<[^>]*>?/gm, "") // Strip HTML tags
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[email]") // Zero PII: strip emails
      .replace(/(?:\+977[- ]?)?(?:98|97)\d{8}/g, "[phone]") // Zero PII: strip phone numbers
      .replace(/(ignore previous instructions|system prompt|reveal secrets|delete tables)/gi, "[redacted]")
      .trim();
  }

  private generateGroundedResponse(
    query: string,
    dishes: GroundingDish[],
    venues: GroundingVenue[],
    packages: GroundingPackage[],
  ): { text: string; actions?: MayaAction[] } {
    const q = query.toLowerCase();

    // 1. Banquet / Event / Catering / 100 people / Wedding / Celebrations
    const isBanquetEvent =
      q.includes("banquet") ||
      q.includes("catering") ||
      q.includes("wedding") ||
      q.includes("reception") ||
      q.includes("corporate") ||
      q.includes("seminar") ||
      q.includes("gathering") ||
      (q.includes("event") && !q.includes("sport")) ||
      (q.includes("100") && (q.includes("people") || q.includes("person") || q.includes("guest") || q.includes("pax"))) ||
      (q.includes("party") && (q.includes("price") || q.includes("cost") || q.includes("package") || q.includes("menu") || q.includes("buffet") || q.includes("people") || q.includes("guest")));

    if (isBanquetEvent) {
      const refId = "PH-EVT-" + Math.floor(1000 + Math.random() * 9000);
      const packageLines =
        packages.length > 0
          ? packages.map((p) => `• ${p.name}: starting from NPR ${p.pricePerPerson} / person`).join("\n")
          : [
              "• Corporate Conference & Executive Hi-Tea: starting from NPR 950 / person",
              "• Pure Vegetarian Satvik Banquet: starting from NPR 1,200 / person",
              "• Birthday & Family Celebration Feast: starting from NPR 1,250 / person",
              "• Biratnagar Barbeque & Lawn Party: starting from NPR 1,550 / person",
              "• Royal Garden Wedding Banquet: starting from NPR 1,850 / person",
            ].join("\n");

      return {
        text: `Namaste! For banquets and special celebrations (including gatherings of 100 guests or more), our event catering packages start from budget-friendly rates:\n\n${packageLines}\n\n✨ 100% Customizable: Every package is completely customizable to match your exact budget, menu preferences, and guest count.\n\n📋 Inquiry Reference: #${refId} (Please quote this reference number when speaking with our team).\n\nPlease contact our dedicated event team to plan your celebration:\n• Restaurant Manager & WhatsApp: +977 9851150987 (Manager, Executive Chef & Social Media; calls & WhatsApp)\n• Restaurant Owner: +977 9852022202 (Raju Khadka, Owner; direct calls)\n• Landlines: +977 21 464193, +977 21 465192\n• Email: purplehaze_biratnagar@gmail.com\n\nYou can also explore package details and submit an instant event booking inquiry online: https://purplehaze.com.np/events`,
        actions: [
          { label: "Book Event Online", action: "OPEN_EVENT_BOOKING", payload: { href: "/events" } },
          { label: "View Event Menus", action: "NAVIGATE_EVENT_MENU", payload: { href: "/events/menu" } },
          { label: "WhatsApp Event Team", action: "OPEN_WHATSAPP", payload: { phone: "9779851150987" } },
        ],
      };
    }

    // 2. Approved Public Contact Channels / Owner / Manager / Phone
    const isContact =
      q.includes("contact") ||
      q.includes("phone") ||
      q.includes("number") ||
      q.includes("whatsapp") ||
      q.includes("call") ||
      q.includes("manager") ||
      q.includes("owner") ||
      q.includes("raju") ||
      q.includes("landline") ||
      q.includes("email") ||
      q.includes("address") ||
      q.includes("location") ||
      q.includes("hours") ||
      q.includes("timing");

    if (isContact) {
      return {
        text: `Here are our approved public contact channels for Purple Haze Restro & Garden:\n\n• Restaurant Manager & WhatsApp: +977 9851150987 (Manager, Executive Chef & Social Media; calls & WhatsApp)\n• Restaurant Owner: +977 9852022202 (Raju Khadka, Owner; direct calls)\n• Landlines: +977 21 464193, +977 21 465192\n• Email: purplehaze_biratnagar@gmail.com\n• Address: Airport Road, Biratnagar 56613, Koshi Province, Nepal\n• Opening Hours: 9:00 AM – 10:00 PM daily`,
        actions: [
          { label: "Call Manager", action: "CALL_PHONE", payload: { phone: "+9779851150987" } },
          { label: "WhatsApp Us", action: "OPEN_WHATSAPP", payload: { phone: "9779851150987" } },
          { label: "View Contact Page", action: "NAVIGATE", payload: { href: "/contact" } },
        ],
      };
    }

    // 3. Venues / Hall / Lawn / Garden Seating Capacity
    if (q.includes("venue") || q.includes("hall") || q.includes("lawn") || q.includes("capacity")) {
      const sample =
        venues.length > 0
          ? venues.map((v) => `${v.name} (Capacity: up to ${v.capacity || "150+"} guests)`).join(", ")
          : "Grand Banquet Hall (up to 150 guests), Open-air Garden Lawn (up to 250+ guests), and Private Dining Rooms";

      return {
        text: `We offer versatile venue spaces at Purple Haze: ${sample}. All spaces are fully equipped with audio/mic setup, garden ambiance, and dedicated banquet catering. You can book an event reservation online or call our manager directly.`,
        actions: [
          { label: "Book Venue Online", action: "OPEN_EVENT_BOOKING", payload: { href: "/events" } },
          { label: "WhatsApp Manager", action: "OPEN_WHATSAPP", payload: { phone: "9779851150987" } },
        ],
      };
    }

    // 4. Menu / Food / Recommendations / Popular Dishes
    if (
      q.includes("recommend") ||
      q.includes("popular") ||
      q.includes("dish") ||
      q.includes("food") ||
      q.includes("menu") ||
      q.includes("momo") ||
      q.includes("pizza") ||
      q.includes("curry") ||
      q.includes("thali") ||
      q.includes("dinner") ||
      q.includes("lunch")
    ) {
      const sample =
        dishes.length > 0
          ? dishes.slice(0, 4).map((d) => `${d.name} (NPR ${d.price / 100})`).join(", ")
          : "Authentic Thakali Thali, Jhaneko & Tandoori Mo:Mo, Royal Butter Chicken, Chef Special Wood-fired Pizzas";

      return {
        text: `Welcome to Purple Haze Restro & Garden! Some of our most popular guest favorites include: ${sample}. Our full dynamic menu features 4 curated cuisines: Authentic Nepali, Continental & Italian, Pan Asian, and Indian with fast delivery and dine-in options. Would you like to view our full menu or add anything to your order?`,
        actions: [
          { label: "Explore Menu", action: "NAVIGATE_MENU", payload: { href: "/menu" } },
          { label: "Event Menus", action: "NAVIGATE_EVENT_MENU", payload: { href: "/events/menu" } },
        ],
      };
    }

    // 5. Default Warm Welcome
    return {
      text: "Namaste! I am Maya, your Purple Haze assistant. I can help you explore our food & drink menu, recommend chef specials, share event & banquet packages (starting from NPR 950/person with customizable menus for 100+ guests), or connect you with our manager. How may I assist you today?",
      actions: [
        { label: "Explore Menu", action: "NAVIGATE_MENU", payload: { href: "/menu" } },
        { label: "Event Packages", action: "OPEN_EVENT_BOOKING", payload: { href: "/events" } },
        { label: "Contact Us", action: "NAVIGATE", payload: { href: "/contact" } },
      ],
    };
  }
}

export const mayaService = new MayaService();
