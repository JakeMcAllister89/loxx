// v3
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const { action, payload } = await req.json();

    if (action === "list") {
      const { data, error } = await admin
        .from("products")
        .select("*")
        .order("cylinder_type")
        .order("price_gbp");
      if (error) return json({ error: error.message }, 500);
      return json({ products: data ?? [] });
    }

    if (action === "insert_cylinder_type") {
      const { name, sort_order } = payload;
      const { data, error } = await admin.from("cylinder_types").insert({ name, sort_order, is_active: true }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }
    if (action === "update_cylinder_type") {
      const { id, ...updates } = payload;
      const { error } = await admin.from("cylinder_types").update(updates).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    if (action === "delete_cylinder_type") {
      const { id } = payload;
      const { error } = await admin.from("cylinder_types").update({ is_active: false }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    if (action === "insert_product") {
      const { data, error } = await admin.from("products").insert(payload).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }
    if (action === "update_product") {
      const { id, ...updates } = payload;
      const { error } = await admin.from("products").update(updates).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    if (action === "delete_product") {
      const { id } = payload;
      const { error } = await admin.from("products").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: "Server error" }, 500);
  }
});
