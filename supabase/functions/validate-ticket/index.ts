import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

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

  let ticketId: string | null = null;

  try {
    const { ticket_id, event_id, storage_path } = await req.json();
    ticketId = ticket_id;
    if (!ticket_id || !storage_path) throw new Error("ticket_id e storage_path obrigatórios");

    // 1. Download file from private bucket
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("tickets-custody")
      .download(storage_path);

    if (downloadError || !fileData) throw new Error("Erro ao baixar arquivo para validação");

    // 2. Convert file to base64 safely (no stack overflow)
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    
    // Check file size - reject files > 10MB
    if (uint8.length > 10 * 1024 * 1024) {
      await rejectTicket(supabaseAdmin, ticket_id, null);
      return jsonResponse({ success: false, reason: "Arquivo muito grande. Máximo 10MB." });
    }

    const base64 = base64Encode(uint8);
    const mimeType = storage_path.endsWith(".pdf") ? "application/pdf" : 
                     storage_path.endsWith(".png") ? "image/png" : "image/jpeg";

    // 3. OCR via Lovable AI (Gemini) - extract text and validate if it's a real ticket
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

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
                text: `Você é um validador de ingressos. Analise esta imagem/documento e determine:

1. Este arquivo é realmente um ingresso/ticket para um evento? (shows, festivais, jogos, teatro, etc.)
2. Se SIM, extraia as informações abaixo.
3. Se NÃO é um ingresso (é uma foto aleatória, documento, meme, etc.), defina is_valid_ticket como false.

Responda APENAS com JSON válido neste formato:
{
  "is_valid_ticket": true/false,
  "confidence": 0.0 a 1.0,
  "rejection_reason": "motivo se não for ingresso, ou null",
  "event_name": "nome do evento ou null",
  "event_date": "YYYY-MM-DD ou null",
  "event_time": "HH:MM ou null",
  "venue": "local ou null",
  "sector": "setor ou null",
  "seat": "assento ou null",
  "ticket_code": "código único do ingresso (barcode, QR code text, número do pedido) ou null"
}

IMPORTANTE: Seja rigoroso. Apenas marque is_valid_ticket=true se o documento claramente parece um ingresso com informações como evento, data, código de barras/QR, etc.`,
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
      const errText = await ocrResponse.text();
      console.error("OCR API error:", ocrResponse.status, errText);
      await rejectTicket(supabaseAdmin, ticket_id, null);
      return jsonResponse({ success: false, reason: "Erro na validação. Tente novamente com uma imagem mais clara." });
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
      await rejectTicket(supabaseAdmin, ticket_id, null);
      return jsonResponse({ success: false, reason: "Não foi possível analisar o arquivo. Envie uma foto clara do ingresso." });
    }

    // 4. CHECK: Is it actually a ticket?
    if (!extracted.is_valid_ticket || extracted.confidence < 0.6) {
      await rejectTicket(supabaseAdmin, ticket_id, extracted.ticket_code);
      const reason = extracted.rejection_reason || "O arquivo enviado não parece ser um ingresso válido. Envie uma foto ou PDF do seu ingresso.";
      return jsonResponse({ success: false, reason });
    }

    // 5. Compare with event data if event_id provided
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

        if (similarity < 0.4) {
          await rejectTicket(supabaseAdmin, ticket_id, extracted.ticket_code);
          return jsonResponse({
            success: false,
            reason: `O ingresso parece ser do evento "${extracted.event_name}", mas você selecionou "${event.name}". Verifique o evento correto.`,
          });
        }
      }
    }

    const ticketCode = extracted.ticket_code;

    // 6. Hash check for duplicates (only if code found)
    if (ticketCode) {
      const encoder = new TextEncoder();
      const data = encoder.encode(ticketCode);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data: existingHash } = await supabaseAdmin
        .from("ticket_hashes")
        .select("id, ticket_id")
        .eq("hash", hashHex)
        .eq("status", "active")
        .maybeSingle();

      if (existingHash) {
        await rejectTicket(supabaseAdmin, ticket_id, ticketCode);
        return jsonResponse({
          success: false,
          reason: "Ingresso duplicado detectado. Este código já foi cadastrado na plataforma.",
        });
      }

      // Save hash
      await supabaseAdmin.from("ticket_hashes").insert({
        hash: hashHex,
        ticket_id: ticket_id,
        status: "active",
      });
    }

    // 7. APPROVED - update ticket
    await supabaseAdmin
      .from("tickets")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        extracted_code: ticketCode || null,
      })
      .eq("id", ticket_id);

    return jsonResponse({ success: true, status: "validated", extracted });
  } catch (error) {
    console.error("validate-ticket error:", error);

    // On error, REJECT the ticket (don't auto-approve)
    if (ticketId) {
      try {
        await rejectTicket(supabaseAdmin, ticketId, null);
      } catch {}
    }

    return new Response(
      JSON.stringify({ success: false, reason: "Erro na validação do ingresso. Tente novamente." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function rejectTicket(supabase: any, ticketId: string, code: string | null) {
  await supabase
    .from("tickets")
    .update({ status: "rejected", extracted_code: code })
    .eq("id", ticketId);
}

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
