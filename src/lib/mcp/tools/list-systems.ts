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
  name: "list_key_systems",
  title: "List key systems",
  description: "List the master key systems the signed-in user has access to in their organisation.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true }; }
    const { data, error } = await supabaseForUser(ctx)
      .from("key_systems")
      .select("id,name,reference,status,created_at")
      .order("created_at", { ascending: false });
    if (error) { console.error("[mcp] tool error:", error);
      return { content: [{ type: "text", text: "Something went wrong processing your request" }], isError: true }; }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { systems: data ?? [] },
    };
  },
});
