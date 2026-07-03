// v2
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SR);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: prof } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!(prof as any)?.is_admin) return json({ error: "Forbidden" }, 403);

    const out: { id: string; last_sign_in_at: string | null; email_confirmed_at: string | null }[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) { console.error(error); return json({ error: "Something went wrong processing your request" }, 500); }
      for (const u of data.users) {
        out.push({
          id: u.id,
          last_sign_in_at: (u as any).last_sign_in_at ?? null,
          email_confirmed_at: (u as any).email_confirmed_at ?? null,
        });
      }
      if (data.users.length < 1000) break;
      page++;
    }
    return json({ users: out });
  } catch (e: any) {
    return json({ error: "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
