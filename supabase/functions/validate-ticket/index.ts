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
    const { ticket_id, event_id, storage_path, seller_id } = await req.json();
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

    // Detect mime type from storage_path
    const ext = storage_path.split(".").pop()?.toLowerCase() || "jpg";
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
    };
    const mimeType = mimeMap[ext] || "image/jpeg";

    // ========== OCR via Lovable AI (Gemini Vision) ==========
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    console.log("Calling Lovable AI (Gemini) for OCR analysis...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um sistema de validação de ingressos. Analise a imagem/documento enviado e extraia TODAS as informações visíveis em formato JSON puro (sem markdown, sem backticks).

Retorne exatamente este formato JSON:
{
  "is_ticket": true/false,
  "confidence": 0-100,
  "full_text": "todo o texto extraído do documento",
  "event_name": "nome do evento ou null",
  "event_date": "data do evento ou null",
  "ticket_code": "código/número do ingresso, pedido, order ID ou null",
  "qr_content": "conteúdo do QR code se visível ou null",
  "barcode": "código de barras se visível ou null",
  "cpf_numbers": ["lista de CPFs encontrados"],
  "holder_name": "nome do titular ou null",
  "venue": "local do evento ou null",
  "sector": "setor/área ou null",
  "seat": "assento ou null",
  "row": "fila ou null",
  "platform": "plataforma emissora (sympla, eventim, livepass, ticketmaster, etc) ou null",
  "ticket_type": "tipo (inteira, meia, cortesia, etc) ou null",
  "is_courtesy": true/false,
  "has_sale_prohibition": true/false,
  "is_non_transferable": true/false,
  "anti_keywords_found": ["lista de palavras anti-ingresso encontradas"],
  "logos_detected": ["logos visíveis"],
  "unique_identifiers": ["todos os códigos únicos encontrados no documento"]
}

IMPORTANTE:
- Extraia TODOS os números, códigos e identificadores únicos
- Identifique QR codes, códigos de barras e seus conteúdos
- Detecte se é cortesia ou tem proibição de venda
- Identifique a plataforma emissora (Sympla, Eventim, Livepass, Tickets For Fun, Clube do Ingresso, Guichê Web, Ticket Maker, Ticketmaster, etc)
- Retorne APENAS o JSON, sem texto adicional`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise este documento de ingresso e extraia todas as informações:" },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        const reason = "Sistema de validação temporariamente sobrecarregado. Tente novamente em alguns minutos.";
        checks.push({ id: "ocr_read", label: "Leitura OCR", passed: false, detail: "Rate limit atingido" });
        await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
        return jsonResponse({ success: false, reason, checks });
      }

      const reason = "Erro na análise do documento. Tente novamente com uma imagem mais clara.";
      checks.push({ id: "ocr_read", label: "Leitura OCR", passed: false, detail: "Falha ao processar imagem" });
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    console.log("AI raw response length:", rawContent.length);

    // Parse AI JSON response
    let extracted: any;
    try {
      // Remove markdown code blocks if present
      const cleanJson = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      extracted = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
      const reason = "Não foi possível analisar o arquivo. Envie uma foto clara e nítida do ingresso.";
      checks.push({ id: "ocr_read", label: "Leitura OCR", passed: false, detail: "Resposta inválida da IA" });
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks });
    }

    const fullText = extracted.full_text || "";
    console.log("OCR text length:", fullText.length, "Is ticket:", extracted.is_ticket, "Confidence:", extracted.confidence);

    // ========== CHECK: OCR Read ==========
    checks.push({
      id: "ocr_read",
      label: "Leitura OCR",
      passed: fullText.length > 10,
      detail: fullText.length > 10 ? `${fullText.length} caracteres extraídos com IA` : "Texto insuficiente",
    });

    // ========== CHECK: Is it a ticket? ==========
    const isTicket = extracted.is_ticket === true && (extracted.confidence || 0) >= 40;
    const hasAntiKeywords = (extracted.anti_keywords_found || []).length > 0;

    checks.push({
      id: "is_ticket",
      label: "Documento é ingresso",
      passed: isTicket && !hasAntiKeywords,
      detail: isTicket
        ? `Confiança: ${extracted.confidence}%`
        : hasAntiKeywords
          ? `Parece ser ${extracted.anti_keywords_found[0]}, não um ingresso`
          : "Documento não identificado como ingresso",
    });

    // ========== CHECK: Platform ==========
    const detectedPlatform = extracted.platform?.toLowerCase() || null;
    if (detectedPlatform) {
      checks.push({ id: "platform", label: "Plataforma detectada", passed: true, detail: capitalize(detectedPlatform) });
    }

    if (!isTicket) {
      const reason = hasAntiKeywords
        ? `O arquivo parece ser um(a) ${extracted.anti_keywords_found[0]}, não um ingresso.`
        : fullText.length < 20
          ? "Não foi possível extrair texto do arquivo. Envie uma foto nítida ou PDF do ingresso."
          : "O arquivo enviado não parece ser um ingresso válido.";
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks });
    }

    // ========== CHECK: Courtesy ticket ==========
    const isCourtesy = extracted.is_courtesy === true || extracted.has_sale_prohibition === true;

    checks.push({
      id: "courtesy_check",
      label: "Tipo de ingresso",
      passed: !isCourtesy,
      detail: isCourtesy
        ? "Ingresso de cortesia — venda proibida"
        : extracted.ticket_type ? `${capitalize(extracted.ticket_type)} ✓` : "Ingresso comercial ✓",
    });

    // ========== CHECK: CPF validation ==========
    const cpfMatches = extracted.cpf_numbers || [];
    let cpfValid = true;
    let cpfDetail = "Nenhum CPF detectado no ingresso";

    if (cpfMatches.length > 0) {
      const invalidCpfs = [
        "000.000.000-00", "111.111.111-11", "222.222.222-22", "333.333.333-33",
        "444.444.444-44", "555.555.555-55", "666.666.666-66", "777.777.777-77",
        "888.888.888-88", "999.999.999-99",
      ];
      const foundInvalid = cpfMatches.find((cpf: string) =>
        invalidCpfs.includes(cpf) || invalidCpfs.includes(cpf.replace(/[\s.-]/g, ""))
      );

      if (foundInvalid) {
        cpfValid = false;
        cpfDetail = `CPF ${foundInvalid} é inválido`;
      } else if (seller_id) {
        const { data: sellerProfile } = await supabaseAdmin
          .from("profiles").select("cpf").eq("user_id", seller_id).single();

        if (sellerProfile?.cpf) {
          const sellerCpfClean = sellerProfile.cpf.replace(/\D/g, "");
          const ticketCpfClean = cpfMatches[0].replace(/\D/g, "");
          if (sellerCpfClean !== ticketCpfClean) {
            cpfValid = false;
            cpfDetail = `CPF do ingresso (${cpfMatches[0]}) não corresponde ao CPF cadastrado na sua conta`;
          } else {
            cpfDetail = "CPF corresponde ao cadastro ✓";
          }
        } else {
          cpfDetail = "CPF detectado no ingresso (cadastre seu CPF no perfil para validação automática)";
        }
      } else {
        cpfDetail = "CPF válido detectado ✓";
      }
    }

    checks.push({ id: "cpf_check", label: "CPF do titular", passed: cpfValid, detail: cpfDetail });

    if (!cpfValid && cpfMatches.length > 0) {
      await rejectTicket(supabaseAdmin, ticket_id, null, cpfDetail, checks);
      return jsonResponse({ success: false, reason: cpfDetail, checks });
    }

    // ========== CHECK: Holder name ==========
    const holderName = extracted.holder_name;
    const genericHolderPatterns = [
      /comissários?/i, /staff/i, /organiza(dor|ção)/i, /imprensa/i,
      /convidado/i, /promoter/i, /assessor/i,
    ];
    const isGenericHolder = genericHolderPatterns.some(p => p.test(holderName || ""));

    checks.push({
      id: "holder_check",
      label: "Titular identificado",
      passed: !isGenericHolder,
      detail: isGenericHolder
        ? `Titular genérico: "${holderName}"`
        : holderName ? `Titular: ${holderName} ✓` : "Titular não detectado",
    });

    // ========== Block courtesy ==========
    if (isCourtesy) {
      const reason = "Ingresso de cortesia com venda proibida. Este tipo de ingresso não pode ser comercializado na plataforma.";
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks });
    }

    // ========== CHECK: SafeTix / Ticketmaster ==========
    if (detectedPlatform === "ticketmaster" || detectedPlatform === "quentro") {
      const reason = "Ingressos da Ticketmaster usam SafeTix (QR rotativo). O vendedor deve transferir pelo app Quentro.";
      checks.push({ id: "safetix", label: "SafeTix", passed: false, detail: reason });
      await rejectTicket(supabaseAdmin, ticket_id, null, reason, checks);
      return jsonResponse({ success: false, reason, checks, platform: "ticketmaster", requires_transfer: true });
    }

    // ========== CHECK: Event name match ==========
    if (extracted.event_name) {
      checks.push({ id: "ocr_event_name", label: "Nome do evento", passed: true, detail: extracted.event_name });
    }
    if (extracted.event_date) {
      checks.push({ id: "ocr_event_date", label: "Data do evento", passed: true, detail: extracted.event_date });
    }

    if (event_id && extracted.event_name) {
      const { data: event } = await supabaseAdmin
        .from("events").select("name, date").eq("id", event_id).single();

      if (event) {
        const matched = fuzzyEventMatch(extracted.event_name, event.name);
        console.log(`Event match: "${extracted.event_name}" vs "${event.name}" = ${matched}`);
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

    // ========== CHECK: Duplicate (QR code / unique identifiers) ==========
    // Collect all unique identifiers from the ticket
    const allIdentifiers: string[] = [];
    if (extracted.ticket_code) allIdentifiers.push(String(extracted.ticket_code).trim());
    if (extracted.qr_content) allIdentifiers.push(String(extracted.qr_content).trim());
    if (extracted.barcode) allIdentifiers.push(String(extracted.barcode).trim());
    if (extracted.unique_identifiers) {
      for (const uid of extracted.unique_identifiers) {
        const s = String(uid).trim();
        if (s && !allIdentifiers.includes(s)) allIdentifiers.push(s);
      }
    }

    // Filter out very short or generic identifiers
    const meaningfulIds = allIdentifiers.filter(id => id.length >= 4);
    const primaryCode = extracted.qr_content || extracted.barcode || extracted.ticket_code;

    if (meaningfulIds.length > 0) {
      // Hash EACH identifier individually and check for duplicates
      const hashesToCheck: string[] = [];
      for (const identifier of meaningfulIds) {
        const encoder = new TextEncoder();
        const data = encoder.encode(identifier);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        hashesToCheck.push(hashHex);
      }

      console.log(`Checking ${hashesToCheck.length} identifier hashes for duplicates...`);

      // Check ALL hashes at once for any match
      const { data: existingHashes } = await supabaseAdmin
        .from("ticket_hashes")
        .select("id, ticket_id, hash")
        .in("hash", hashesToCheck)
        .eq("status", "active");

      // Filter out hashes that belong to the current ticket (re-validation)
      const duplicates = (existingHashes || []).filter(h => h.ticket_id !== ticket_id);
      const isDuplicate = duplicates.length > 0;

      checks.push({
        id: "duplicate_check",
        label: "Ingresso único",
        passed: !isDuplicate,
        detail: isDuplicate
          ? "QR Code ou código já cadastrado na plataforma"
          : `Verificado: sem duplicidade ✓ (${meaningfulIds.length} identificador(es))`,
      });

      if (isDuplicate) {
        const reason = "Ingresso duplicado detectado. Este QR Code ou código já foi cadastrado por outro vendedor.";
        await rejectTicket(supabaseAdmin, ticket_id, primaryCode, reason, checks);
        return jsonResponse({ success: false, reason, checks });
      }

      // Insert ALL hashes for this ticket
      const hashInserts = hashesToCheck.map(h => ({ hash: h, ticket_id, status: "active" }));
      await supabaseAdmin.from("ticket_hashes").insert(hashInserts);
    } else {
      checks.push({
        id: "duplicate_check",
        label: "Ingresso único",
        passed: true,
        detail: "Código não detectado (verificação manual recomendada)",
      });
    }

    // ========== APPROVED ==========
    await supabaseAdmin
      .from("tickets")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        extracted_code: primaryCode || null,
        validation_checks: checks,
      })
      .eq("id", ticket_id);

    return jsonResponse({
      success: true,
      status: "validated",
      platform: detectedPlatform || "desconhecida",
      extracted: {
        event_name: extracted.event_name,
        event_date: extracted.event_date,
        ticket_code: extracted.ticket_code,
        venue: extracted.venue,
        sector: extracted.sector,
        qr_content: extracted.qr_content,
        holder_name: extracted.holder_name,
      },
      checks,
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

function normalizeEventName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSetSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeEventName(a).split(" ").filter(t => t.length > 1));
  const tokensB = new Set(normalizeEventName(b).split(" ").filter(t => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) if (tokensB.has(t)) intersection++;
  return intersection / Math.max(tokensA.size, tokensB.size);
}

function fuzzyEventMatch(extracted: string, selected: string): boolean {
  // Direct levenshtein
  const lev = levenshteinSimilarity(extracted.toLowerCase(), selected.toLowerCase());
  if (lev >= 0.4) return true;
  // Token-set similarity (handles "A - B" vs "B - A")
  const tokenSim = tokenSetSimilarity(extracted, selected);
  if (tokenSim >= 0.6) return true;
  // Containment check
  const normA = normalizeEventName(extracted);
  const normB = normalizeEventName(selected);
  if (normA.includes(normB) || normB.includes(normA)) return true;
  return false;
}
