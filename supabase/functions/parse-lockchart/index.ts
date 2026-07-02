import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized — please sign in" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { createClient } = await import("npm:@supabase/supabase-js@2");
  const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized — please sign in" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large — maximum 10MB" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    // Base64 encode in chunks to avoid call-stack overflow on large PDFs
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);

    const prompt = `You are a master key system specialist analysing a UK locksmith document. Your job is to extract the key hierarchy from this PDF.

STEP 1 — Classify the document:
- LOCKCHART: shows keys + doors and which keys open which doors. May be a hierarchical list (GMK → MK → SMK → doors) OR a matrix grid (doors as rows, keys as columns, with crosses/dots marking access).
- PINNING SCHEDULE: shows pin stack heights, bitting codes, or core combinations for cutting keys. Contains numeric pin codes per key (e.g. "1-4-2-5-6-3") but no door/key access relationships.

If this document is a PINNING SCHEDULE (not a lockchart), return EXACTLY:
{"error": "pinning_schedule", "message": "This looks like a pinning schedule, not a lockchart. Please upload a lockchart showing the key hierarchy and door list."}

STEP 2 — If it is a lockchart, extract the hierarchy as JSON:
{
  "system_name": "string",
  "nodes": [
    {
      "level": "GMK|SMK|CK|CYL",
      "label": "string",
      "location": "string or null — area/zone/building name for MK and SMK (e.g. 'Main Building', 'Ground Floor')",
      "parent_label": "string or null for root",
      "cylinder_type": "string or null",
      "finish": "string or null",
      "room_name": "string or null",
      "key_ref": "string or null",
      "key_qty": number or null
    }
  ]
}

HIERARCHY RULES:
- Every system has exactly one GMK (Grand Master Key) at the root.
- MK = Master Key (groups of areas), SMK = Sub Master Key (zones within an area), CK = Change Key (single door group), CYL = Cylinder (physical hardware on a door).
- For CYL nodes, use room_name for the door/room and set label to the same value if needed.
- For MK/SMK nodes, populate "location" with the area/zone/building name (e.g. "Main Building", "Ground Floor", "East Wing").

MATRIX/GRID LAYOUTS:
- If the document is a matrix (doors as rows, keys as columns with × or • marks), infer the hierarchy from the column headers: GMK is the column that opens everything, MK columns open subsets, SMK columns open smaller subsets, individual differ keys open one door. Build the tree from this access pattern.

COMMON UK LAYOUTS:
- Numbered door lists grouped under MK/SMK headings: "MK1 – Main Building" then doors "1. Reception, 2. Office, 3. Server Room…" → MK label "MK1", location "Main Building", with CYL children for each door.
- Tabbed sections per area, each with its own SMK at top and numbered doors below.
- Always preserve exact room/door names as written.

CYLINDER TYPES — map to these codes where possible: EKZ-12, AZG, C-KDZ36K36, C-DZ36/36, C-KDZ36K41, C-DZ36/41, C-KDZ31K31, C-OKZ36K36, C-AZG. If unsure, leave null.

Return ONLY valid JSON, no markdown fences, no commentary.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("anthropic error", anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: `Anthropic API error (${anthropicRes.status})` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await anthropicRes.json();
    const text = result?.content?.[0]?.type === "text" ? result.content[0].text : "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Could not parse lockchart — model did not return valid JSON", raw: text }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
