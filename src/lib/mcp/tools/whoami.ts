import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in My LOXX user's profile and organisation.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const [{ data: profile }, { data: member }] = await Promise.all([
      supabase.from("profiles").select("id,name,first_name,last_name,email,company,role,is_admin").eq("id", ctx.getUserId()).maybeSingle(),
      supabase.from("org_members").select("org_id,org_role,status").eq("user_id", ctx.getUserId()).eq("status", "active").maybeSingle(),
    ]);
    const out = { profile: profile ?? null, membership: member ?? null };
    return {
      content: [{ type: "text", text: JSON.stringify(out) }],
      structuredContent: out,
    };
  },
});
