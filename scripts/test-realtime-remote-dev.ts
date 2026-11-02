import { createClient } from "@supabase/supabase-js";
import { signRealtimeToken, getSupabaseRealtimeConfig } from "../src/lib/supabase-realtime";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://lcexncppqesfnsdetoqv.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhuY3BwcWVzZm5zZGV0b3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0ODQ3ODksImV4cCI6MjEwODA2MDc4OX0.MR9A1fzITEbXc8mw-5p1lMHRAAMsIwumpwd-uYti3vI";
process.env.SUPABASE_JWT_SECRET =
  "EPEvygl8b+qDOgaCSr5RYvMVMNl2iPUpl8UlzuxEcIHFK91qDcWhmNjo4nERoNHP1E3fpncD5ftdWMJQXxEVRw==";

const config = getSupabaseRealtimeConfig()!;

async function mintToken(userId: string, role: string) {
  const res = await signRealtimeToken({
    id: userId,
    email: `${userId}@example.com`,
    role,
  });
  return res!.token;
}

function testChannelSubscription(
  token: string,
  channelTopic: string,
  options: { isPrivate: boolean } = { isPrivate: true }
): Promise<{ status: string; error?: string }> {
  return new Promise((resolve) => {
    const client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          apikey: config.anonKey,
        },
      },
    });

    // Set auth token on supabase client for Realtime
    client.realtime.setAuth(token);

    const channel = client.channel(channelTopic, {
      config: {
        private: options.isPrivate,
      },
    });

    const timeout = setTimeout(() => {
      channel.unsubscribe();
      resolve({ status: "TIMEOUT", error: "Subscription timed out after 10000ms" });
    }, 10000);

    channel.subscribe((status, err) => {
      console.log(`[debug ${channelTopic}] Status event:`, status, err);
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        channel.unsubscribe();
        resolve({ status: "SUBSCRIBED" });
      } else if (status === "CHANNEL_ERROR") {
        clearTimeout(timeout);
        channel.unsubscribe();
        resolve({ status: "CHANNEL_ERROR", error: err?.message || "Channel authorization rejected by Supabase" });
      } else if (status === "TIMED_OUT") {
        clearTimeout(timeout);
        channel.unsubscribe();
        resolve({ status: "TIMED_OUT", error: err?.message });
      } else if (status === "CLOSED") {
        // channel closed
      }
    });
  });
}

async function main() {
  console.log("=== SUPABASE REALTIME LIVE ACCEPTANCE TEST ===");
  console.log("Target Supabase Project: lcexncppqesfnsdetoqv (ap-northeast-2)");
  console.log("URL:", config.url);

  const userAId = "usr-test-alice-aaa";
  const userBId = "usr-test-bob-bbb";
  const adminId = "usr-test-staff-admin";

  const tokenUserB = await mintToken(userBId, "CUSTOMER");
  const tokenAdmin = await mintToken(adminId, "ADMIN");

  console.log("\n1. Testing: User B (CUSTOMER) attempting to subscribe to private channel 'user-" + userAId + "'");
  const res1 = await testChannelSubscription(tokenUserB, `user-${userAId}`, { isPrivate: true });
  console.log("Result 1:", res1.status, res1.error ? `(${res1.error})` : "");

  console.log("\n2. Testing: User B (CUSTOMER) attempting to subscribe to private channel 'admin-orders'");
  const res2 = await testChannelSubscription(tokenUserB, "admin-orders", { isPrivate: true });
  console.log("Result 2:", res2.status, res2.error ? `(${res2.error})` : "");

  console.log("\n3. Testing: User B (CUSTOMER) subscribing to their OWN private channel 'user-" + userBId + "'");
  const res3 = await testChannelSubscription(tokenUserB, `user-${userBId}`, { isPrivate: true });
  console.log("Result 3:", res3.status);

  console.log("\n4. Testing: Admin (STAFF/ADMIN) subscribing to private channel 'admin-orders'");
  const res4 = await testChannelSubscription(tokenAdmin, "admin-orders", { isPrivate: true });
  console.log("Result 4:", res4.status);

  console.log("\n5. Testing: User B subscribing to public channel 'menu-availability'");
  const res5 = await testChannelSubscription(tokenUserB, "menu-availability", { isPrivate: false });
  console.log("Result 5:", res5.status);

  console.log("\n=== EVALUATION ===");
  const test1Passed = res1.status === "CHANNEL_ERROR";
  const test2Passed = res2.status === "CHANNEL_ERROR";
  const test3Passed = res3.status === "SUBSCRIBED";
  const test4Passed = res4.status === "SUBSCRIBED";
  const test5Passed = res5.status === "SUBSCRIBED";

  console.log("User B denied user A channel:", test1Passed ? "PASS (REJECTED)" : "FAIL (" + res1.status + ")");
  console.log("User B denied admin-orders channel:", test2Passed ? "PASS (REJECTED)" : "FAIL (" + res2.status + ")");
  console.log("User B allowed own user B channel:", test3Passed ? "PASS (SUBSCRIBED)" : "FAIL (" + res3.status + ")");
  console.log("Admin allowed admin-orders channel:", test4Passed ? "PASS (SUBSCRIBED)" : "FAIL (" + res4.status + ")");
  console.log("User B allowed public menu channel:", test5Passed ? "PASS (SUBSCRIBED)" : "FAIL (" + res5.status + ")");

  if (test1Passed && test2Passed && test3Passed && test4Passed && test5Passed) {
    console.log("\nALL 5 LIVE SUPABASE REALTIME ACCEPTANCE TESTS PASSED!");
  } else {
    console.error("\nONE OR MORE TESTS FAILED.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
