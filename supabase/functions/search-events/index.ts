import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AIEvent = {
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  category: string;
};

async function searchPerplexity(query: string, city: string): Promise<string> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) {
    console.warn("PERPLEXITY_API_KEY not configured, skipping web search");
    return "";
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "Você é um assistente que busca eventos reais em Salvador, Bahia e região. Retorne informações detalhadas sobre eventos: nome completo, data, horário, local/venue exato, cidade. Inclua eventos futuros E eventos recentes (últimos 12 meses). Seja preciso com datas e locais.",
          },
          {
            role: "user",
            content: `Encontre eventos reais em ${city} e região da Bahia relacionados a: "${query}". Inclua eventos de ticketeiras como Sympla e Ingresse. Liste nome, data, horário, local e cidade de cada evento encontrado.`,
          },
        ],
        search_recency_filter: "year",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Perplexity error:", response.status, text);
      return "";
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];
    console.log("Perplexity found content, citations:", citations.length);
    return content + "\n\nFontes: " + citations.join(", ");
  } catch (e) {
    console.error("Perplexity search error:", e);
    return "";
  }
}

async function scrapeTicketPlatforms(query: string, city: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    console.warn("FIRECRAWL_API_KEY not configured, skipping ticket scraping");
    return "";
  }

  const searchQuery = `${query} ${city} Bahia ingressos`;
  const results: string[] = [];

  try {
    // Search Firecrawl for events on ticketing platforms
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 6,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Firecrawl search error:", response.status, text);
      return "";
    }

    const data = await response.json();
    const items = data.data || [];
    console.log("Firecrawl found results:", items.length);

    for (const item of items) {
      const snippet = (item.markdown || item.description || "").slice(0, 500);
      results.push(`[${item.title || ""}] ${item.url || ""}\n${snippet}`);
    }
  } catch (e) {
    console.error("Firecrawl error:", e);
  }

  return results.join("\n\n---\n\n");
}

/** Normalize text: fix common encoding artifacts and ensure proper Unicode */
function normalizeText(text: string): string {
  // NFC normalization to compose accented characters properly
  let normalized = text.normalize("NFC");
  // Remove null bytes and other control chars (except newline/tab)
  normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Fix common mojibake patterns (latin1 misinterpreted as utf8)
  const mojibakeMap: Record<string, string> = {
    "Ã£": "ã", "Ã¡": "á", "Ã©": "é", "Ã­": "í", "Ã³": "ó", "Ãº": "ú",
    "Ã¢": "â", "Ãª": "ê", "Ã´": "ô", "Ã§": "ç", "Ã±": "ñ",
    "Ã€": "À", "Ã": "Á", "Ã‰": "É", "Ã"": "Ó", "Ãš": "Ú",
    "Ã‚": "Â", "ÃŠ": "Ê", "Ã"": "Ô", "Ã‡": "Ç",
    "Ã£o": "ão", "Ã§Ã£o": "ção",
  };
  for (const [bad, good] of Object.entries(mojibakeMap)) {
    normalized = normalized.replaceAll(bad, good);
  }
  // Remove replacement character U+FFFD
  normalized = normalized.replace(/\uFFFD/g, "");
  return normalized.trim();
}

async function structureWithGemini(
  query: string,
  city: string,
  perplexityData: string,
  firecrawlData: string
): Promise<AIEvent[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `Você é um assistente que estrutura dados de eventos reais na Bahia, Brasil.
Hoje é ${today}. O ano atual é ${today.slice(0, 4)}.
Com base nos dados de busca web e scraping de ticketeiras fornecidos, extraia eventos reais.
REGRAS:
- Use APENAS informações encontradas nos dados fornecidos. NÃO invente eventos.
- Se um evento aparece em múltiplas fontes, combine as informações mais precisas.
- ATENÇÃO COM DATAS: Muitos eventos são recorrentes (acontecem todo ano). Se os dados mencionam um evento que acontece anualmente e os dados são de edições passadas, ajuste o ano para ${today.slice(0, 4)} ou ${parseInt(today.slice(0, 4)) + 1} quando fizer sentido. Exemplo: se "Santa Maré" aconteceu em abril de 2025, a edição de 2026 provavelmente será em abril de ${today.slice(0, 4)}.
- Se a data exata não for clara, use a data mais provável baseada no padrão do evento, mas NUNCA use anos passados para eventos recorrentes que ainda vão acontecer.
- Para eventos que já aconteceram e não são recorrentes, mantenha a data original e inclua o ano no nome.
- Categorias permitidas: Shows, Esportes, Teatro, Festivais, Stand-up, Conferências.
- Locais conhecidos de Salvador: Arena Fonte Nova, Concha Acústica do TCA, WET Salvador, Casa Pia, Groove Bar, Bahia Café Hall, Arena Parque, Largo do Pelourinho, Mali (casa de eventos).
- Se não houver dados suficientes para um campo, faça sua melhor estimativa baseada no contexto.`;

  const userPrompt = `Busca: "${query}" em ${city} e região da Bahia.

DADOS DA BUSCA WEB (Perplexity):
${perplexityData || "Nenhum resultado da busca web."}

DADOS DE TICKETEIRAS (Firecrawl - Sympla/Ingresse/outros):
${firecrawlData || "Nenhum resultado de ticketeiras."}

Extraia até 8 eventos reais encontrados nos dados acima. NÃO invente eventos que não estejam nos dados.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_events",
            description: "Return a list of real events found in the provided data",
            parameters: {
              type: "object",
              properties: {
                events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Nome completo do evento (com ano se passado)" },
                      date: { type: "string", description: "Data no formato YYYY-MM-DD" },
                      time: { type: "string", description: "Horário no formato HH:MM" },
                      venue: { type: "string", description: "Nome do local/venue" },
                      city: { type: "string", description: "Cidade" },
                      category: {
                        type: "string",
                        enum: ["Shows", "Esportes", "Teatro", "Festivais", "Stand-up", "Conferências"],
                      },
                    },
                    required: ["name", "date", "time", "venue", "city", "category"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["events"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_events" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Muitas buscas. Tente novamente em alguns segundos.");
    if (response.status === 402) throw new Error("Créditos de IA esgotados.");
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall?.function?.arguments) return [];

  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.events || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, city } = await req.json();
    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ error: "Query too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cityFilter = city || "Salvador";
    console.log(`Searching events: "${query}" in ${cityFilter}`);

    // Run Perplexity web search and Firecrawl scraping in parallel
    const [perplexityData, firecrawlData] = await Promise.all([
      searchPerplexity(query, cityFilter),
      scrapeTicketPlatforms(query, cityFilter),
    ]);

    console.log(
      `Data collected - Perplexity: ${perplexityData.length} chars, Firecrawl: ${firecrawlData.length} chars`
    );

    // Structure results with Gemini
    const events = await structureWithGemini(query, cityFilter, perplexityData, firecrawlData);
    console.log("Final events:", events.length);

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-events error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Muitas buscas") ? 429 : msg.includes("Créditos") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
