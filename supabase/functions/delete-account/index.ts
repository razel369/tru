import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(401, { error: "Authentication required" });
  }

  let body: { confirmation?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid request" });
  }
  if (body.confirmation !== "DELETE") {
    return jsonResponse(400, { error: "Deletion confirmation required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(503, { error: "Account deletion is unavailable" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.slice("Bearer ".length);
  const userResult = await admin.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    return jsonResponse(401, { error: "Authentication required" });
  }

  const deletion = await admin.rpc("delete_account_by_id", {
    target_user_id: userResult.data.user.id,
  });
  if (deletion.error) {
    console.error("delete-account failed", deletion.error.code ?? "unknown");
    return jsonResponse(500, { error: "Account deletion failed" });
  }

  return jsonResponse(200, { deleted: true });
});
