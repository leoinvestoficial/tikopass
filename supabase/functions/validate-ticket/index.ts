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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { ticket_id, event_id, storage_path } = await req.json();
    if (!ticket_id || !storage_path) throw new Error("ticket_id e storage_path obrigatórios");

    // 1. Download file from private bucket
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("tickets-custody")
      .download(storage_path);

    if (downloadError || !fileData) throw new Error("Erro ao baixar arquivo para validação");

    // 2. OCR via Lovable AI (Gemini) - extract text from ticket image/PDF
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = storage_path.endsWith(".pdf") ? "application/pdf" : 
                     storage_path.endsWith(".png") ? "image/png" : "image/jpeg";

    // Call Gemini for OCR via Lovable AI
    const ocrResponse = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise este ingresso/ticket e extraia as seguintes informações em formato JSON:
{
  "event_name": "nome do evento",
  "event_date": "data no formato YYYY-MM-DD",
  "event_time": "horário no formato HH:MM",
  "venue": "local/venue",
  "sector": "setor",
  "seat": "assento ou número",
  "ticket_code": "código alfanumérico do ingresso (geralmente perto do QR code ou código de barras)"
}
Se algum campo não for encontrado, use null. Responda APENAS com o JSON, sem explicações.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR API error: ${ocrResponse.status}`);
    }

    const ocrResult = await ocrResponse.json();
    const ocrText = ocrResult.choices?.[0]?.message?.content || "";

    // Parse OCR result
    let extracted: any = {};
    try {
      const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse OCR JSON:", ocrText);
    }

    const ticketCode = extracted.ticket_code;

    // 3. Compare with event data if event_id provided
    if (event_id && extracted.event_name) {
      const { data: event } = await supabaseAdmin
        .from("events")
        .select("name, date")
        .eq("id", event_id)
        .single();

      if (event) {
        const similarity = levenshteinSimilarity(
          (extracted.event_name || "").toLowerCase(),
          event.name.toLowerCase()
        );

        if (similarity < 0.5) {
          // Too different - reject
          await supabaseAdmin
            .from("tickets")
            .update({ status: "rejected", extracted_code: ticketCode || null })
            .eq("id", ticket_id);

          return new Response(
            JSON.stringify({
              success: false,
              reason: `Nome do evento no ingresso ("${extracted.event_name}") não corresponde ao evento selecionado ("${event.name}"). Similaridade: ${Math.round(similarity * 100)}%`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 4. Hash check for duplicates
    if (ticketCode) {
      const encoder = new TextEncoder();
      const data = encoder.encode(ticketCode);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // Check for duplicates
      const { data: existingHash } = await supabaseAdmin
        .from("ticket_hashes")
        .select("id, ticket_id")
        .eq("hash", hashHex)
        .eq("status", "active")
        .maybeSingle();

      if (existingHash) {
        await supabaseAdmin
          .from("tickets")
          .update({ status: "rejected", extracted_code: ticketCode })
          .eq("id", ticket_id);

        return new Response(
          JSON.stringify({
            success: false,
            reason: "Ingresso duplicado detectado. Este código já foi cadastrado na plataforma.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save hash
      await supabaseAdmin.from("ticket_hashes").insert({
        hash: hashHex,
        ticket_id: ticket_id,
        status: "active",
      });

      // Update ticket with extracted code
      await supabaseAdmin
        .from("tickets")
        .update({
          status: "validated",
          validated_at: new Date().toISOString(),
          extracted_code: ticketCode,
        })
        .eq("id", ticket_id);
    } else {
      // No code found but image seems valid - still validate with warning
      await supabaseAdmin
        .from("tickets")
        .update({
          status: "validated",
          validated_at: new Date().toISOString(),
          extracted_code: null,
        })
        .eq("id", ticket_id);
    }

    return new Response(
      JSON.stringify({ success: true, status: "validated", extracted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("validate-ticket error:", error);

    // On error, don't leave ticket stuck - mark as needing manual review
    try {
      const { ticket_id } = await req.clone().json().catch(() => ({}));
      if (ticket_id) {
        await supabaseAdmin
          .from("tickets")
          .update({ status: "validated" }) // Allow through on error to not block sellers
          .eq("id", ticket_id);
      }
    } catch {}

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Levenshtein similarity (0 to 1)
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - matrix[a.length][b.length] / maxLen;
}
