import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TICKETING_DOMAINS = [
  { label: "Eventim", domain: "eventim.com.br" },
  { label: "Livepass", domain: "livepass.com.br" },
  { label: "Sympla", domain: "sympla.com.br" },
  { label: "Tickets For Fun", domain: "ticketsforfun.com.br" },
  { label: "Clube do Ingresso", domain: "clubedoingresso.com" },
  { label: "Guichê Web", domain: "guicheweb.com.br" },
  { label: "Ticket Maker", domain: "ticketmaker.com.br" },
  { label: "Ingresse", domain: "ingresse.com" },
  { label: "Bilheteria Digital", domain: "bilheteriadigital.com" },
  { label: "BlueTicket", domain: "blueticket.com.br" },
  { label: "Uhuu", domain: "uhuu.com" },
  { label: "Articket", domain: "articket.com.br" },
  { label: "Ingresso Digital", domain: "ingressodigital.com" },
];
const TICKETING_PLATFORMS = TICKETING_DOMAINS.map((platform) => platform.label).join(", ");
const SEARCH_STOP_WORDS = new Set([
  "a", "o", "e", "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
  "para", "por", "com", "tour", "show", "shows", "evento", "eventos", "festival", "festa",
  "ingresso", "ingressos",
]);
const MUSIC_CATEGORIES = ["Sertanejo", "Funk", "Rock", "Pagode", "Eletrônico", "Forró", "Outro"];

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

function stripAccents(text: string): string {
  return normalizeText(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toSearchKey(text: string): string {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return toSearchKey(text)
    .split(" ")
    .filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
}

function buildSearchVariants(query: string, city: string): string[] {
  const exact = normalizeText(query);
  const accentless = stripAccents(query);
  const coreTokens = tokenize(query).slice(0, 5).join(" ");

  return uniqueStrings([
    exact,
    `${exact} ${city}`,
    `${exact} ingresso ${city}`,
    accentless !== exact ? accentless : "",
    accentless !== exact ? `${accentless} ${city}` : "",
    coreTokens,
    coreTokens ? `${coreTokens} ${city}` : "",
  ]);
}

function buildTicketingSearchQuery(term: string, city: string): string {
  const domains = TICKETING_DOMAINS.map(({ domain }) => `site:${domain}`).join(" OR ");
  return `${term} ${city} (show OR festival OR turnê OR concerto OR reveillon OR ingresso) (${domains})`;
}

function scoreEventMatch(event: AIEvent, query: string, city: string): number {
  const queryKey = toSearchKey(query);
  const cityKey = toSearchKey(city);
  const eventKey = toSearchKey(`${event.name} ${event.venue} ${event.city}`);
  const tokens = tokenize(query);
  const matchedTokens = tokens.filter((token) => eventKey.includes(token)).length;

  let score = tokens.length > 0 ? matchedTokens / tokens.length : 0;
  if (queryKey && eventKey.includes(queryKey)) score += 0.6;
  if (cityKey && toSearchKey(event.city).includes(cityKey)) score += 0.25;
  return score;
}

function dedupeEvents(events: AIEvent[]): AIEvent[] {
  const deduped = new Map<string, AIEvent>();

  for (const event of events) {
    const key = `${toSearchKey(event.name)}|${event.date}|${toSearchKey(event.city)}`;
    if (!deduped.has(key)) deduped.set(key, event);
  }

  return [...deduped.values()];
}

async function searchPerplexity(query: string, city: string): Promise<string> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) return "";

  try {
    const domainFilter = TICKETING_DOMAINS.map(({ domain }) => domain);
    const queries = buildSearchVariants(query, city).slice(0, 4);

    const responses = await Promise.all(queries.map(async (variant) => {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: `Você é um assistente especializado em shows e concertos musicais no Brasil. Busque APENAS eventos de música (shows, concertos, festivais musicais, turnês). Priorize páginas das ticketeiras ${TICKETING_PLATFORMS}. Considere variações com e sem acento como o mesmo evento. Ignore resultados irrelevantes ou pouco relacionados ao termo pesquisado.`,
            },
            {
              role: "user",
              content: `Encontre eventos musicais reais relacionados a "${query}" em ${city} e região. Rode uma busca ampla também pela variação "${variant}". Retorne nome principal do evento, data, horário, local exato, cidade e, se houver, produtora ou página oficial.`,
            },
          ],
          search_recency_filter: "year",
          search_domain_filter: domainFilter,
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
    }));

    return responses.filter(Boolean).join("\n\n---\n\n");
  } catch (e) {
    console.error("Perplexity search error:", e);
    return "";
  }
}

async function scrapeTicketPlatforms(query: string, city: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return "";

  const results: string[] = [];

  try {
    const searchVariants = buildSearchVariants(query, city).slice(0, 4);

    const searches = await Promise.all(searchVariants.map(async (variant) => {
      const response = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: buildTicketingSearchQuery(variant, city),
          limit: 6,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Firecrawl search error:", response.status, text);
        return [];
      }

      const data = await response.json();
      return data.data || [];
    }));

    const seenUrls = new Set<string>();
    for (const items of searches) {
      for (const item of items) {
        if (!item?.url || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        const snippet = normalizeText((item.markdown || item.description || "").slice(0, 700));
        results.push(`[${normalizeText(item.title || "")}] ${item.url}\n${snippet}`);
      }
    }

    console.log("Firecrawl unique results:", results.length);
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
- Priorize eventos diretamente relacionados ao termo pesquisado. Se a busca for por "Oboé", NÃO retorne eventos sem relação clara com Oboé.
- Considere nomes com e sem acento, abreviações e pequenas variações como o mesmo evento.
- Se a data exata não for clara, use a data mais provável. NUNCA use anos passados para eventos recorrentes futuros.
- Categorias permitidas APENAS: ${MUSIC_CATEGORIES.join(", ")}.
  - Sertanejo: shows de artistas sertanejos (sertanejo, sofrência, arrocha)
  - Funk: shows de funk, baile funk, MC
  - Rock: shows de rock, pop, indie, metal, punk, alternativo
  - Pagode: shows de pagode, samba, axé, MPB
  - Eletrônico: festas e shows de música eletrônica, DJs, raves
  - Forró: shows de forró, piseiro, vaquejada, pé de serra
  - Outro: festivais, shows que não se encaixam nas categorias acima
- Ticketeiras reconhecidas: ${TICKETING_PLATFORMS}.
- IMPORTANTE: Use SEMPRE acentos corretos em português.`;

  const userPrompt = `Busca: "${query}" em ${city}.

DADOS DA BUSCA WEB (Perplexity):
${perplexityData || "Nenhum resultado."}

DADOS DE TICKETEIRAS (Firecrawl):
${firecrawlData || "Nenhum resultado."}

Extraia até 8 shows/eventos musicais reais encontrados nos dados acima.
Se não houver correspondência forte com "${query}", retorne lista vazia.`;

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
  return dedupeEvents(
    (parsed.events || [])
      .map((e: AIEvent) => ({
        ...e,
        name: normalizeText(e.name),
        venue: normalizeText(e.venue),
        city: normalizeText(e.city),
      }))
      .filter((event: AIEvent) => scoreEventMatch(event, query, city) >= (tokenize(query).length <= 1 ? 0.35 : 0.5))
      .sort((a: AIEvent, b: AIEvent) => scoreEventMatch(b, query, city) - scoreEventMatch(a, query, city))
  ).slice(0, 8);
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

    let [perplexityData, firecrawlData] = await Promise.all([
      searchPerplexity(query, cityFilter),
      scrapeTicketPlatforms(query, cityFilter),
    ]);

    if (!perplexityData && !firecrawlData) {
      const relaxedQuery = stripAccents(query);
      if (relaxedQuery && relaxedQuery !== query) {
        const [fallbackPerplexity, fallbackFirecrawl] = await Promise.all([
          searchPerplexity(relaxedQuery, cityFilter),
          scrapeTicketPlatforms(relaxedQuery, cityFilter),
        ]);
        perplexityData = fallbackPerplexity;
        firecrawlData = fallbackFirecrawl;
      }
    }

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
