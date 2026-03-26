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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const ticketId = formData.get("ticket_id") as string;
    const eventId = formData.get("event_id") as string;

    if (!file || !ticketId) throw new Error("Arquivo e ticket_id são obrigatórios");

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Formato não aceito. Use PDF, JPG ou PNG.");
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Arquivo muito grande. Máximo 10MB.");
    }

    // Generate safe filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const uniqueName = crypto.randomUUID();
    const storagePath = `${ticketId}/${uniqueName}.${ext}`;

    // Upload to private bucket
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("tickets-custody")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw new Error("Erro ao salvar arquivo: " + uploadError.message);

    // Update ticket status to pending_validation
    await supabaseAdmin
      .from("tickets")
      .update({
        storage_path: storagePath,
        status: "pending_validation",
      })
      .eq("id", ticketId)
      .eq("seller_id", user.id);

    // Trigger validation asynchronously
    const validateUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/validate-ticket`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Fire and forget - don't await
    fetch(validateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ ticket_id: ticketId, event_id: eventId, storage_path: storagePath, seller_id: user.id }),
    }).catch((err) => console.error("Failed to trigger validation:", err));

    return new Response(
      JSON.stringify({ success: true, ticket_id: ticketId, status: "pending_validation" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("upload-ticket error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
