import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listKeySystemsTool from "./tools/list-systems";
import listOrdersTool from "./tools/list-orders";
import listKeyHoldersTool from "./tools/list-key-holders";
import whoamiTool from "./tools/whoami";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "myloxx-mcp",
  title: "My LOXX",
  version: "0.1.0",
  instructions:
    "Tools for querying a My LOXX master key platform account. Use `whoami` to confirm the signed-in user, `list_key_systems` to see the organisation's master key systems, `list_orders` to see recent hardware orders, and `list_key_holders` to see people currently holding keys.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listKeySystemsTool, listOrdersTool, listKeyHoldersTool],
});
