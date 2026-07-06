// Shared rate-limit helper. Uses the public.check_rate_limit(_key, _max, _window_minutes)
// database function, which atomically records an attempt and returns whether it is
// allowed within the given rolling window.
//
// Usage:
//   const rl = await checkRateLimit(admin, `signup:${ip}`, 5, 60);
//   if (!rl.allowed) return rl.response;
//
// If the DB call fails we fail-open (allow), and log the error — we never want a
// broken rate-limit table to take down the whole endpoint.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const RATE_LIMIT_BODY = JSON.stringify({ error: "Too many attempts, please try again later." });

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function checkRateLimit(
  admin: SupabaseClient,
  key: string,
  max: number,
  windowMinutes: number,
  corsHeaders: Record<string, string> = {},
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      _key: key,
      _max: max,
      _window_minutes: windowMinutes,
    });
    if (error) {
      console.error("[rate-limit] rpc failed, failing open:", error);
      return { allowed: true };
    }
    if (data === false) {
      return {
        allowed: false,
        response: new Response(RATE_LIMIT_BODY, {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      };
    }
    return { allowed: true };
  } catch (e) {
    console.error("[rate-limit] unexpected error, failing open:", e);
    return { allowed: true };
  }
}
