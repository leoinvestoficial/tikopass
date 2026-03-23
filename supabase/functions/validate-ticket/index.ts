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

    // 2. Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    if (uint8.length > 10 * 1024 * 1024) {
      await rejectTicket(supabaseAdmin, ticket_id, null, "Arquivo muito grande. Máximo 10MB.");
      return jsonResponse({ success: false, reason: "Arquivo muito grande. Máximo 10MB." });
    }

    const base64 = base64Encode(uint8);
    const isPdf = storage_path.endsWith(".pdf");
    const mimeType = isPdf ? "application/pdf" : 
                     storage_path.endsWith(".png") ? "image/png" : "image/jpeg";

    // ========== CAMADA 1: OCR via Google Vision API ==========
    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!GOOGLE_VISION_API_KEY) throw new Error("GOOGLE_VISION_API_KEY não configurada");

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

    // For PDFs, we use DOCUMENT_TEXT_DETECTION; for images, TEXT_DETECTION
    const visionPayload = {
      requests: [
        {
          image: { content: base64 },
          features: [
            { type: "TEXT_DETECTION", maxResults: 50 },
            { type: "LOGO_DETECTION", maxResults: 10 },
            { type: "WEB_DETECTION", maxResults: 5 },
          ],
        },
      ],
    };

    console.log("Calling Google Vision API...");
    const visionResponse = await fetch(visionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visionPayload),
    });

    if (!visionResponse.ok) {
      const errText = await visionResponse.text();
      console.error("Google Vision API error:", visionResponse.status, errText);
      await rejectTicket(supabaseAdmin, ticket_id, null, "Erro na análise do documento. Tente novamente.");
      return jsonResponse({ success: false, reason: "Erro na análise do documento. Tente novamente com uma imagem mais clara." });
    }

    const visionResult = await visionResponse.json();
    const annotations = visionResult.responses?.[0];
    
    if (!annotations) {
      await rejectTicket(supabaseAdmin, ticket_id, null, "Não foi possível analisar o arquivo.");
      return jsonResponse({ success: false, reason: "Não foi possível analisar o arquivo. Envie uma foto clara do ingresso." });
    }

    const fullText = annotations.fullTextAnnotation?.text || 
                     annotations.textAnnotations?.[0]?.description || "";
    const detectedLogos = (annotations.logoAnnotations || []).map((l: any) => l.description?.toLowerCase() || "");
    const webEntities = (annotations.webDetection?.webEntities || []).map((e: any) => e.description?.toLowerCase() || "");

    console.log("OCR text length:", fullText.length);
    console.log("Detected logos:", detectedLogos);
    console.log("Web entities:", webEntities.slice(0, 5));

    // ========== VALIDAÇÃO: É um ingresso? ==========
    const textLower = fullText.toLowerCase();

    // Keywords that indicate a ticket
    const ticketKeywords = [
      "ingresso", "ticket", "entrada", "qr code", "código", "pedido",
      "setor", "pista", "camarote", "arquibancada", "meia", "inteira",
      "portão", "gate", "admit", "seat", "row", "section",
      "sympla", "eventim", "ingresse", "ticketmaster", "eventbrite",
      "ticket360", "uhuu", "even3", "bilheteria digital", "ticket maker",
      "comprovante", "confirmação", "e-ticket", "voucher",
      "data do evento", "local do evento", "horário",
    ];

    // Keywords that indicate NOT a ticket (false positives)
    const antiKeywords = [
      "meme", "receita", "curriculum", "currículo", "nota fiscal",
      "boleto bancário", "fatura", "extrato", "holerite",
      "selfie", "instagram", "facebook", "twitter",
    ];

    const matchedTicketKeywords = ticketKeywords.filter(k => textLower.includes(k));
    const matchedAntiKeywords = antiKeywords.filter(k => textLower.includes(k));

    console.log("Ticket keywords found:", matchedTicketKeywords);
    console.log("Anti keywords found:", matchedAntiKeywords);

    // Decision: need at least 3 ticket keywords and no anti-keywords
    const isLikelyTicket = matchedTicketKeywords.length >= 3 && matchedAntiKeywords.length === 0;
    
    // Also check logos and web entities for ticket platforms
    const platformNames = ["sympla", "eventim", "ingresse", "ticketmaster", "eventbrite", 
                          "ticket360", "uhuu", "even3", "bilheteria digital", "ticket maker", "quentro"];
    const detectedPlatform = platformNames.find(p => 
      textLower.includes(p) || 
      detectedLogos.some((l: string) => l.includes(p)) ||
      webEntities.some((e: string) => e.includes(p))
    );

    const hasMinimalTicketStructure = matchedTicketKeywords.length >= 1 && detectedPlatform;

    if (!isLikelyTicket && !hasMinimalTicketStructure) {
      // Not enough evidence this is a ticket
      const reason = matchedAntiKeywords.length > 0
        ? `O arquivo enviado parece ser um(a) ${matchedAntiKeywords[0]}, não um ingresso.`
        : fullText.length < 20
          ? "Não foi possível extrair texto do arquivo. Envie uma foto nítida ou PDF do ingresso."
          : "O arquivo enviado não parece ser um ingresso válido. Envie o PDF ou foto do ingresso com informações como evento, data, setor e código visíveis.";
      
      await rejectTicket(supabaseAdmin, ticket_id, null, reason);
      return jsonResponse({ success: false, reason });
    }

    // ========== CAMADA 2: Identificação da plataforma e extração de dados ==========

    // Detect platform from QR URLs or text
    let identifiedPlatform = detectedPlatform || "desconhecida";
    
    // Check for SafeTix (Ticketmaster) - block these
    if (identifiedPlatform === "ticketmaster" || identifiedPlatform === "quentro") {
      await rejectTicket(supabaseAdmin, ticket_id, null, 
        "Ingressos da Ticketmaster usam SafeTix (QR rotativo). Não é possível validar por upload. O vendedor deve transferir o ingresso pelo app Quentro diretamente para o comprador.");
      return jsonResponse({ 
        success: false, 
        reason: "Ingressos da Ticketmaster usam SafeTix (QR rotativo). Não é possível validar por upload. O vendedor deve transferir o ingresso pelo app Quentro diretamente para o comprador.",
        platform: "ticketmaster",
        requires_transfer: true,
      });
    }

    // Extract key fields from OCR text
    const extracted = extractTicketData(fullText);
    console.log("Extracted data:", JSON.stringify(extracted));

    // ========== CAMADA 3: Comparação com evento cadastrado ==========
    if (event_id) {
      const { data: event } = await supabaseAdmin
        .from("events")
        .select("name, date")
        .eq("id", event_id)
        .single();

      if (event && extracted.event_name) {
        const similarity = levenshteinSimilarity(
          extracted.event_name.toLowerCase(),
          event.name.toLowerCase()
        );

        console.log(`Event name similarity: "${extracted.event_name}" vs "${event.name}" = ${similarity}`);

        if (similarity < 0.4) {
          const reason = `O ingresso parece ser do evento "${extracted.event_name}", mas você selecionou "${event.name}". Verifique o evento correto.`;
          await rejectTicket(supabaseAdmin, ticket_id, extracted.ticket_code, reason);
          return jsonResponse({ success: false, reason });
        }
      }
    }

    // ========== CAMADA 4: Anti-duplicidade (hash) ==========
    const ticketCode = extracted.ticket_code;
    
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
        await rejectTicket(supabaseAdmin, ticket_id, ticketCode, "Ingresso duplicado detectado.");
        return jsonResponse({
          success: false,
          reason: "Ingresso duplicado detectado. Este código já foi cadastrado na plataforma.",
        });
      }

      await supabaseAdmin.from("ticket_hashes").insert({
        hash: hashHex,
        ticket_id: ticket_id,
        status: "active",
      });
    }

    // ========== APROVADO ==========
    await supabaseAdmin
      .from("tickets")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        extracted_code: ticketCode || null,
      })
      .eq("id", ticket_id);

    return jsonResponse({ 
      success: true, 
      status: "validated", 
      platform: identifiedPlatform,
      extracted,
    });

  } catch (error) {
    console.error("validate-ticket error:", error);
    if (ticketId) {
      try { await rejectTicket(supabaseAdmin, ticketId, null, "Erro interno na validação."); } catch {}
    }
    return new Response(
      JSON.stringify({ success: false, reason: "Erro na validação do ingresso. Tente novamente." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// ========== Helper functions ==========

function extractTicketData(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const textLower = text.toLowerCase();

  // Extract event name - usually the largest/first prominent text
  let event_name: string | null = null;
  // Look for patterns like "Evento: X" or the first line that looks like an event name
  const eventPatterns = [
    /evento[:\s]+(.+)/i,
    /show[:\s]+(.+)/i,
    /espetáculo[:\s]+(.+)/i,
  ];
  for (const p of eventPatterns) {
    const m = text.match(p);
    if (m) { event_name = m[1].trim(); break; }
  }

  // Extract date
  let event_date: string | null = null;
  const datePatterns = [
    /(\d{2}\/\d{2}\/\d{4})/,
    /(\d{2}\.\d{2}\.\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{2}\s+de\s+\w+\s+de\s+\d{4})/i,
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) { event_date = m[1]; break; }
  }

  // Extract ticket code / order number
  let ticket_code: string | null = null;
  const codePatterns = [
    /(?:pedido|order|código|code|ingresso|ticket)\s*(?:#|n[°ºo]?\.?\s*)?[:.]?\s*([A-Z0-9]{4,})/i,
    /(?:n[°ºo]?\s*do\s*(?:pedido|ingresso|ticket))\s*[:.]?\s*([A-Z0-9]{4,})/i,
    /(?:código\s*de\s*barras|barcode)\s*[:.]?\s*([A-Z0-9]{6,})/i,
  ];
  for (const p of codePatterns) {
    const m = text.match(p);
    if (m) { ticket_code = m[1]; break; }
  }

  // Extract venue
  let venue: string | null = null;
  const venuePatterns = [
    /(?:local|venue|endereço|onde)[:\s]+(.+)/i,
  ];
  for (const p of venuePatterns) {
    const m = text.match(p);
    if (m) { venue = m[1].trim(); break; }
  }

  // Extract sector
  let sector: string | null = null;
  const sectorPatterns = [
    /(?:setor|sector|área|area|pista|camarote|arquibancada)[:\s]+(.+)/i,
  ];
  for (const p of sectorPatterns) {
    const m = text.match(p);
    if (m) { sector = m[1].trim(); break; }
  }

  return { event_name, event_date, ticket_code, venue, sector };
}

async function rejectTicket(supabase: any, ticketId: string, code: string | null, _reason: string) {
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
