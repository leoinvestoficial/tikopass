import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TICKETING_PLATFORMS = "Ticketmaster, Eventim, Livepass, Sympla, Tickets For Fun, Clube do Ingresso, Guichê Web, Ticket Maker";
const MUSIC_CATEGORIES = ["Shows", "Festivais", "Sertanejo", "Rock & Pop", "Pagode & Samba", "Eletrônica"];

type AIEvent = {
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  category: string;
};

function normalizeText(text: string): string {
  let normalized = text.normalize("NFC");
  normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  normalized = normalized.replace(/\uFFFD/g, "");
  return normalized.trim();
}

async function searchPerplexity(query: string, city: string): Promise<string> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) return "";

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
            content: `Você é um assistente especializado em shows e concertos musicais no Brasil. Busque APENAS eventos de música (shows, concertos, festivais musicais, turnês). Foque nas ticketeiras: ${TICKETING_PLATFORMS}. Retorne nome completo do artista/banda, data, horário, local/venue exato, cidade.`,
          },
          {
            role: "user",
            content: `Encontre shows e eventos musicais em ${city} e região relacionados a: "${query}". Busque nas ticketeiras ${TICKETING_PLATFORMS}. Liste nome do show/artista, data, horário, local e cidade.`,
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
    return normalizeText(content + "\n\nFontes: " + citations.join(", "));
  } catch (e) {
    console.error("Perplexity search error:", e);
    return "";
  }
}

async function scrapeTicketPlatforms(query: string, city: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return "";

  const searchQuery = `${query} ${city} show ingresso site:sympla.com.br OR site:eventim.com.br OR site:ticketmaster.com.br OR site:livepass.com.br OR site:ticketsforfun.com.br OR site:clubedoingresso.com.br OR site:guicheweb.com.br OR site:ticketmaker.com.br`;
  const results: string[] = [];

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 8,
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
      const snippet = normalizeText((item.markdown || item.description || "").slice(0, 500));
      results.push(`[${normalizeText(item.title || "")}] ${item.url || ""}\n${snippet}`);
    }
  } catch (e) {
    console.error("Firecrawl error:", e);
  }

  return results.join("\n\n---\n\n");
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

  const systemPrompt = `Você é um assistente especializado em shows e eventos musicais no Brasil.
Hoje é ${today}. O ano atual é ${today.slice(0, 4)}.
Com base nos dados de busca web e scraping de ticketeiras fornecidos, extraia APENAS eventos de MÚSICA (shows, concertos, festivais musicais, turnês de artistas/bandas).
REGRAS:
- Use APENAS informações encontradas nos dados fornecidos. NÃO invente eventos.
- APENAS eventos musicais: shows, concertos, festivais de música, turnês. IGNORE eventos esportivos, teatro, conferências, etc.
- Se um evento aparece em múltiplas fontes, combine as informações mais precisas.
- Se a data exata não for clara, use a data mais provável. NUNCA use anos passados para eventos recorrentes futuros.
- Categorias permitidas APENAS: ${MUSIC_CATEGORIES.join(", ")}.
  - Shows: show individual de artista/banda
  - Festivais: festival com múltiplos artistas
  - Sertanejo: shows de artistas sertanejos
  - Rock & Pop: shows de rock, pop, indie
  - Pagode & Samba: shows de pagode, samba, axé
  - Eletrônica: festas e shows de música eletrônica, DJs
- Ticketeiras reconhecidas: ${TICKETING_PLATFORMS}.
- IMPORTANTE: Use SEMPRE acentos corretos em português.`;

  const userPrompt = `Busca: "${query}" em ${city}.

DADOS DA BUSCA WEB (Perplexity):
${perplexityData || "Nenhum resultado."}

DADOS DE TICKETEIRAS (Firecrawl):
${firecrawlData || "Nenhum resultado."}

Extraia até 8 shows/eventos musicais reais encontrados nos dados acima.`;

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
            description: "Return a list of real music events found",
            parameters: {
              type: "object",
              properties: {
                events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Nome do show/artista" },
                      date: { type: "string", description: "YYYY-MM-DD" },
                      time: { type: "string", description: "HH:MM" },
                      venue: { type: "string", description: "Nome do local/venue" },
                      city: { type: "string", description: "Cidade" },
                      category: {
                        type: "string",
                        enum: MUSIC_CATEGORIES,
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
  return (parsed.events || []).map((e: AIEvent) => ({
    ...e,
    name: normalizeText(e.name),
    venue: normalizeText(e.venue),
    city: normalizeText(e.city),
  }));
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
    console.log(`Searching music events: "${query}" in ${cityFilter}`);

    const [perplexityData, firecrawlData] = await Promise.all([
      searchPerplexity(query, cityFilter),
      scrapeTicketPlatforms(query, cityFilter),
    ]);

    console.log(`Data collected - Perplexity: ${perplexityData.length} chars, Firecrawl: ${firecrawlData.length} chars`);

    const events = await structureWithGemini(query, cityFilter, perplexityData, firecrawlData);
    console.log("Final music events:", events.length);

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
