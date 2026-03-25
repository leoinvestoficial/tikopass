import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Check = { id: string; label: string; passed: boolean; detail: string };

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

    const checks: Check[] = [];

    // 1. Download file from private bucket
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("tickets-custody")
      .download(storage_path);

    if (downloadError || !fileData) {
      await rejectTicket(supabaseAdmin, ticket_id, null, "Erro ao baixar arquivo para validação.", []);
      return jsonResponse({ success: false, reason: "Erro ao baixar arquivo para validação.", checks: [] });
    }

    // 2. Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    if (uint8.length > 10 * 1024 * 1024) {
      const reason = "Arquivo muito grande. Máximo 10MB.";
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, []);
      return jsonResponse({ success: false, reason, checks: [] });
    }

    const base64 = base64Encode(uint8);

    // ========== CAMADA 1: OCR via Google Vision API ==========
    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!GOOGLE_VISION_API_KEY) throw new Error("GOOGLE_VISION_API_KEY não configurada");

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
    const visionPayload = {
      requests: [{
        image: { content: base64 },
        features: [
          { type: "TEXT_DETECTION", maxResults: 50 },
          { type: "LOGO_DETECTION", maxResults: 10 },
          { type: "WEB_DETECTION", maxResults: 5 },
        ],
      }],
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
      const reason = "Erro na análise do documento. Tente novamente com uma imagem mais clara.";
      checks.push({ id: "ocr_read", label: "Leitura OCR", passed: false, detail: "Falha ao processar imagem" });
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks });
    }

    const visionResult = await visionResponse.json();
    const annotations = visionResult.responses?.[0];

    if (!annotations) {
      const reason = "Não foi possível analisar o arquivo. Envie uma foto clara do ingresso.";
      checks.push({ id: "ocr_read", label: "Leitura OCR", passed: false, detail: "Nenhum conteúdo detectado" });
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks });
    }

    const fullText = annotations.fullTextAnnotation?.text ||
                     annotations.textAnnotations?.[0]?.description || "";
    const detectedLogos = (annotations.logoAnnotations || []).map((l: any) => l.description?.toLowerCase() || "");
    const webEntities = (annotations.webDetection?.webEntities || []).map((e: any) => e.description?.toLowerCase() || "");

    console.log("OCR text length:", fullText.length);
    checks.push({ id: "ocr_read", label: "Leitura OCR", passed: fullText.length > 10, detail: fullText.length > 10 ? `${fullText.length} caracteres extraídos` : "Texto insuficiente" });

    const textLower = fullText.toLowerCase();

    // ========== VALIDAÇÃO: É um ingresso? ==========
    const ticketKeywords = [
      "ingresso", "ticket", "entrada", "qr code", "código", "pedido",
      "setor", "pista", "camarote", "arquibancada", "meia", "inteira",
      "portão", "gate", "admit", "seat", "row", "section",
      "sympla", "eventim", "ingresse", "ticketmaster", "eventbrite",
      "ticket360", "uhuu", "even3", "bilheteria digital", "ticket maker",
      "comprovante", "confirmação", "e-ticket", "voucher",
      "data do evento", "local do evento", "horário",
      "registro", "participante", "organizador", "titular",
    ];

    const antiKeywords = [
      "meme", "receita", "curriculum", "currículo", "nota fiscal",
      "boleto bancário", "fatura", "extrato", "holerite",
      "selfie", "instagram", "facebook", "twitter",
    ];

    const matchedTicketKeywords = ticketKeywords.filter(k => textLower.includes(k));
    const matchedAntiKeywords = antiKeywords.filter(k => textLower.includes(k));

    console.log("Ticket keywords found:", matchedTicketKeywords);

    const platformNames = ["sympla", "eventim", "ingresse", "ticketmaster", "eventbrite",
                          "ticket360", "uhuu", "even3", "bilheteria digital", "ticket maker", "quentro"];
    const detectedPlatform = platformNames.find(p =>
      textLower.includes(p) ||
      detectedLogos.some((l: string) => l.includes(p)) ||
      webEntities.some((e: string) => e.includes(p))
    );

    const isLikelyTicket = matchedTicketKeywords.length >= 3 && matchedAntiKeywords.length === 0;
    const hasMinimalTicketStructure = matchedTicketKeywords.length >= 1 && detectedPlatform;

    checks.push({
      id: "is_ticket",
      label: "Documento é ingresso",
      passed: isLikelyTicket || !!hasMinimalTicketStructure,
      detail: isLikelyTicket || hasMinimalTicketStructure
        ? `${matchedTicketKeywords.length} indicadores encontrados`
        : matchedAntiKeywords.length > 0
          ? `Parece ser ${matchedAntiKeywords[0]}, não um ingresso`
          : "Indicadores insuficientes de ingresso",
    });

    if (detectedPlatform) {
      checks.push({ id: "platform", label: "Plataforma detectada", passed: true, detail: capitalize(detectedPlatform) });
    }

    if (!isLikelyTicket && !hasMinimalTicketStructure) {
      const reason = matchedAntiKeywords.length > 0
        ? `O arquivo parece ser um(a) ${matchedAntiKeywords[0]}, não um ingresso.`
        : fullText.length < 20
          ? "Não foi possível extrair texto do arquivo. Envie uma foto nítida ou PDF do ingresso."
          : "O arquivo enviado não parece ser um ingresso válido.";
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks });
    }

    // ========== CAMADA 2: Detecção de cortesia ==========
    const courtesyPatterns = [
      /cortesia/i, /venda\s*proibida/i, /não\s*(é\s*)?transferível/i,
      /uso\s*pessoal/i, /intransferível/i, /proibida\s*a?\s*venda/i,
      /proibido\s*vender/i, /gratuito/i,
    ];
    const matchedCourtesy = courtesyPatterns.filter(p => p.test(fullText));
    const isCourtesy = matchedCourtesy.length > 0;

    checks.push({
      id: "courtesy_check",
      label: "Tipo de ingresso",
      passed: !isCourtesy,
      detail: isCourtesy
        ? "Ingresso de cortesia — venda proibida"
        : "Ingresso comercial ✓",
    });

    // ========== CAMADA 2b: Validação de CPF ==========
    const cpfMatches = fullText.match(/\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}/g) || [];
    let cpfValid = true;
    let cpfDetail = "Nenhum CPF detectado";

    if (cpfMatches.length > 0) {
      const invalidCpfs = ["000.000.000-00", "111.111.111-11", "222.222.222-22",
        "333.333.333-33", "444.444.444-44", "555.555.555-55",
        "666.666.666-66", "777.777.777-77", "888.888.888-88", "999.999.999-99",
        "00000000000", "11111111111", "22222222222", "33333333333",
        "44444444444", "55555555555", "66666666666", "77777777777",
        "88888888888", "99999999999"];
      const foundInvalid = cpfMatches.find(cpf => invalidCpfs.includes(cpf.replace(/\s/g, "")));
      if (foundInvalid) {
        cpfValid = false;
        cpfDetail = `CPF ${foundInvalid} é inválido`;
      } else {
        cpfDetail = "CPF válido detectado ✓";
      }
    }

    checks.push({ id: "cpf_check", label: "CPF do titular", passed: cpfValid, detail: cpfDetail });

    // ========== CAMADA 2c: Titular genérico ==========
    const genericHolderPatterns = [
      /comissários?/i, /staff/i, /organiza(dor|ção)/i, /imprensa/i,
      /convidado/i, /promoter/i, /assessor/i,
    ];
    const holderExtracted = extractHolder(fullText);
    const isGenericHolder = genericHolderPatterns.some(p => p.test(holderExtracted || ""));

    checks.push({
      id: "holder_check",
      label: "Titular identificado",
      passed: !isGenericHolder,
      detail: isGenericHolder
        ? `Titular genérico: "${holderExtracted}"`
        : holderExtracted ? `Titular: ${holderExtracted} ✓` : "Titular não detectado",
    });

    // ========== Block if courtesy ticket ==========
    if (isCourtesy) {
      const reason = "Ingresso de cortesia com venda proibida. Este tipo de ingresso não pode ser comercializado na plataforma.";
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks });
    }

    // ========== CAMADA 3: SafeTix / Ticketmaster ==========
    let identifiedPlatform = detectedPlatform || "desconhecida";

    if (identifiedPlatform === "ticketmaster" || identifiedPlatform === "quentro") {
      const reason = "Ingressos da Ticketmaster usam SafeTix (QR rotativo). O vendedor deve transferir pelo app Quentro.";
      checks.push({ id: "safetix", label: "SafeTix", passed: false, detail: reason });
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks, platform: "ticketmaster", requires_transfer: true });
    }

    // ========== CAMADA 4: Extração e comparação com evento ==========
    const extracted = extractTicketData(fullText);
    console.log("Extracted data:", JSON.stringify(extracted));

    if (extracted.event_name) {
      checks.push({ id: "ocr_event_name", label: "Nome do evento", passed: true, detail: extracted.event_name });
    }
    if (extracted.event_date) {
      checks.push({ id: "ocr_event_date", label: "Data do evento", passed: true, detail: extracted.event_date });
    }

    if (event_id) {
      const { data: event } = await supabaseAdmin
        .from("events").select("name, date").eq("id", event_id).single();

      if (event && extracted.event_name) {
        const similarity = levenshteinSimilarity(extracted.event_name.toLowerCase(), event.name.toLowerCase());
        console.log(`Event name similarity: "${extracted.event_name}" vs "${event.name}" = ${similarity}`);
        const matched = similarity >= 0.4;
        checks.push({
          id: "event_match",
          label: "Correspondência com evento",
          passed: matched,
          detail: matched
            ? `"${extracted.event_name}" corresponde a "${event.name}" ✓`
            : `"${extracted.event_name}" não corresponde a "${event.name}"`,
        });
        if (!matched) {
          const reason = `O ingresso parece ser do evento "${extracted.event_name}", mas você selecionou "${event.name}".`;
          await rejectTicket(supabaseAdmin, ticket_id, extracted.ticket_code, reason, checks);
          return jsonResponse({ success: false, reason, checks });
        }
      }
    }

    // ========== CAMADA 5: Anti-duplicidade ==========
    const ticketCode = extracted.ticket_code;

    if (ticketCode) {
      const encoder = new TextEncoder();
      const data = encoder.encode(ticketCode);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data: existingHash } = await supabaseAdmin
        .from("ticket_hashes").select("id, ticket_id").eq("hash", hashHex).eq("status", "active").maybeSingle();

      const isDuplicate = !!existingHash;
      checks.push({
        id: "duplicate_check",
        label: "Ingresso único",
        passed: !isDuplicate,
        detail: isDuplicate ? "Código já cadastrado na plataforma" : "Sem duplicidade encontrada ✓",
      });

      if (isDuplicate) {
        const reason = "Ingresso duplicado detectado. Este código já foi cadastrado.";
        await rejectTicket(supabaseAdmin, ticket_id, ticketCode, reason, checks);
        return jsonResponse({ success: false, reason, checks });
      }

      await supabaseAdmin.from("ticket_hashes").insert({ hash: hashHex, ticket_id, status: "active" });
    } else {
      checks.push({ id: "duplicate_check", label: "Ingresso único", passed: true, detail: "Código não detectado (verificação manual recomendada)" });
    }

    // ========== APROVADO ==========
    await supabaseAdmin
      .from("tickets")
      .update({ status: "validated", validated_at: new Date().toISOString(), extracted_code: ticketCode || null, validation_checks: checks })
      .eq("id", ticket_id);

    return jsonResponse({
      success: true, status: "validated", platform: identifiedPlatform, extracted, checks,
    });

  } catch (error) {
    console.error("validate-ticket error:", error);
    if (ticketId) {
      try { await rejectTicket(supabaseAdmin, ticketId, null, "Erro interno na validação.", []); } catch {}
    }
    return new Response(
      JSON.stringify({ success: false, reason: "Erro na validação do ingresso. Tente novamente.", checks: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// ========== Helper functions ==========

function extractHolder(text: string): string | null {
  const patterns = [
    /(?:titular|participante|nome)[:\s]+(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim().split("\n")[0].trim();
  }
  return null;
}

function extractTicketData(text: string) {
  const textLower = text.toLowerCase();

  let event_name: string | null = null;
  const eventPatterns = [/evento[:\s]+(.+)/i, /show[:\s]+(.+)/i, /espetáculo[:\s]+(.+)/i];
  for (const p of eventPatterns) {
    const m = text.match(p);
    if (m) { event_name = m[1].trim(); break; }
  }
  // Fallback: first bold-like line (usually the event name in ticket PDFs)
  if (!event_name) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) event_name = lines[0];
  }

  let event_date: string | null = null;
  const datePatterns = [/(\d{2}\/\d{2}\/\d{4})/, /(\d{2}\.\d{2}\.\d{4})/, /(\d{4}-\d{2}-\d{2})/, /(\d{2}\s+de\s+\w+\s+de\s+\d{4})/i];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) { event_date = m[1]; break; }
  }

  let ticket_code: string | null = null;
  const codePatterns = [
    /(?:pedido|order|código|code|ingresso|ticket|registro)\s*(?:#|n[°ºo]?\.?\s*)?[:.]?\s*([A-Z0-9]{4,})/i,
    /(?:n[°ºo]?\s*do\s*(?:pedido|ingresso|ticket))\s*[:.]?\s*([A-Z0-9]{4,})/i,
    /(?:código\s*de\s*barras|barcode)\s*[:.]?\s*([A-Z0-9]{6,})/i,
    /registro\s+([A-Z0-9]{6,})/i,
  ];
  for (const p of codePatterns) {
    const m = text.match(p);
    if (m) { ticket_code = m[1]; break; }
  }

  let venue: string | null = null;
  const venuePatterns = [/(?:local|venue|endereço|onde)[:\s-]+(.+)/i];
  for (const p of venuePatterns) {
    const m = text.match(p);
    if (m) { venue = m[1].trim(); break; }
  }

  let sector: string | null = null;
  const sectorPatterns = [/(?:setor|sector|área|area|pista|camarote|arquibancada)[:\s]+(.+)/i];
  for (const p of sectorPatterns) {
    const m = text.match(p);
    if (m) { sector = m[1].trim(); break; }
  }

  return { event_name, event_date, ticket_code, venue, sector };
}

async function rejectTicket(supabase: any, ticketId: string, code: string | null, reason: string, checks: Check[]) {
  await supabase
    .from("tickets")
    .update({
      status: "rejected",
      extracted_code: code,
      rejection_reason: reason,
      validation_checks: checks,
    })
    .eq("id", ticketId);
  console.log("Ticket rejected:", ticketId, reason);
}

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - matrix[a.length][b.length] / maxLen;
}
