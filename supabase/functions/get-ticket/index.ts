import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("Usuário não autenticado");

    const url = new URL(req.url);
    const accessToken = url.searchParams.get("token");
    if (!accessToken) throw new Error("Token de acesso obrigatório");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify buyer_access token
    const { data: access, error: accessError } = await supabaseAdmin
      .from("buyer_access")
      .select("*")
      .eq("token", accessToken)
      .eq("buyer_id", user.id)
      .is("invalidated_at", null)
      .single();

    if (accessError || !access) throw new Error("Acesso não autorizado ou token inválido");

    // Check expiration
    if (new Date(access.expires_at) < new Date()) {
      throw new Error("Token expirado");
    }

    // Get ticket storage path
    const { data: ticket } = await supabaseAdmin
      .from("tickets")
      .select("storage_path")
      .eq("id", access.ticket_id)
      .single();

    if (!ticket?.storage_path) throw new Error("Ingresso não encontrado");

    // Download from private bucket
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("tickets-custody")
      .download(ticket.storage_path);

    if (downloadError || !fileData) throw new Error("Erro ao acessar ingresso");

    // Determine content type
    const ext = ticket.storage_path.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "pdf" ? "application/pdf" :
      ext === "png" ? "image/png" : "image/jpeg";

    // Stream with no-download headers
    const arrayBuffer = await fileData.arrayBuffer();
    return new Response(arrayBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("get-ticket error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
  }
});
