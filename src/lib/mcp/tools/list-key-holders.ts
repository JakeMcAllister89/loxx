import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_key_holders",
  title: "List key holders",
  description: "List active key holders in the signed-in user's organisation.",
  inputSchema: {
    include_archived: z.boolean().optional().describe("Set true to also include archived key holders."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_archived }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("key_holders")
      .select("id,name,email,phone,role,archived_at,created_at")
      .order("name");
    if (!include_archived) q = q.is("archived_at", null);
    const { data, error } = await q;
    if (error) {
      console.error("[mcp] list_key_holders error:", error);
      return { content: [{ type: "text", text: "Something went wrong processing your request" }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { key_holders: data ?? [] },
    };
  },
});
