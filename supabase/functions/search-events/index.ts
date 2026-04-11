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
  { label: "Zig Tickets", domain: "zigtickets.com.br" },
  { label: "Lets Events", domain: "lets.events" },
  { label: "Fever", domain: "ffrr.co" },
  { label: "Shotgun", domain: "shotgun.live" },
];
const TICKETING_PLATFORMS = TICKETING_DOMAINS.map((p) => p.label).join(", ");

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

// ── Text utilities ──

function normalizeText(text: string): string {
  let n = text.normalize("NFC");
  n = n.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  n = n.replace(/\uFFFD/g, "");
  return n.trim();
}

function stripAccents(text: string): string {
  return normalizeText(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toSearchKey(text: string): string {
  return stripAccents(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return toSearchKey(text).split(" ").filter((t) => t.length > 1 && !SEARCH_STOP_WORDS.has(t));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => normalizeText(v)).filter(Boolean))];
}

// ── Search helpers ──

function buildSearchVariants(query: string, city: string): string[] {
  const exact = normalizeText(query);
  const accentless = stripAccents(query);
  const coreTokens = tokenize(query).slice(0, 5).join(" ");

  return uniqueStrings([
    exact,
    `${exact} ${city}`,
    `${exact} ingresso ${city}`,
    `${exact} show ${city} 2026`,
    accentless !== exact ? accentless : "",
    accentless !== exact ? `${accentless} ${city}` : "",
    coreTokens,
    coreTokens ? `${coreTokens} ${city}` : "",
  ]);
}

function scoreEventMatch(event: AIEvent, query: string, city: string): number {
  const queryKey = toSearchKey(query);
  const cityKey = toSearchKey(city);
  const eventKey = toSearchKey(`${event.name} ${event.venue} ${event.city}`);
  const tokens = tokenize(query);
  const matchedTokens = tokens.filter((t) => eventKey.includes(t)).length;

  let score = tokens.length > 0 ? matchedTokens / tokens.length : 0;
  if (queryKey && eventKey.includes(queryKey)) score += 0.6;
  if (cityKey && toSearchKey(event.city).includes(cityKey)) score += 0.25;

  // Boost events whose name contains ALL query tokens
  if (tokens.length > 0 && tokens.every((t) => toSearchKey(event.name).includes(t))) score += 0.3;

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

// ── Perplexity search ──

async function searchPerplexity(query: string, city: string): Promise<string> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) return "";

  try {
    const domainFilter = TICKETING_DOMAINS.map(({ domain }) => domain);
    const variants = buildSearchVariants(query, city).slice(0, 3);

    // One broad web search + one ticketing-focused search
    const searches = [
      // Broad search without domain filter for maximum coverage
      fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: `Você é um assistente que busca shows e eventos musicais no Brasil. Retorne informações detalhadas: nome COMPLETO do evento/artista, data exata (dia/mês/ano), horário, nome do LOCAL/CASA DE SHOW (NUNCA "A Definir" — busque o venue real), cidade. Busque nas ticketeiras: ${TICKETING_PLATFORMS}, e também em Google, redes sociais e sites oficiais dos artistas.`,
            },
            {
              role: "user",
              content: `Encontre TODOS os shows e eventos musicais de "${query}" em ${city} e região para 2025/2026. Inclua turnês, festivais e shows avulsos. Para cada evento, informe obrigatoriamente o local/casa de show real onde será realizado.`,
            },
          ],
          search_recency_filter: "year",
        }),
      }),
      // Ticketing domain focused search
      fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: `Busque exclusivamente em ticketeiras brasileiras: ${TICKETING_PLATFORMS}. Retorne nome do evento, data, local exato e link de compra.`,
            },
            {
              role: "user",
              content: `Pesquise "${variants[0]}" nas ticketeiras. Variações: ${variants.slice(1).map(v => `"${v}"`).join(", ")}. Liste todos os resultados encontrados com nome, data, horário e venue.`,
            },
          ],
          search_recency_filter: "year",
          search_domain_filter: domainFilter,
        }),
      }),
    ];

    const responses = await Promise.all(searches);
    const results: string[] = [];

    for (const response of responses) {
      if (!response.ok) {
        const text = await response.text();
        console.error("Perplexity error:", response.status, text);
        continue;
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const citations = data.citations || [];
      if (content) results.push(normalizeText(content + "\n\nFontes: " + citations.join(", ")));
    }

    return results.join("\n\n---\n\n");
  } catch (e) {
    console.error("Perplexity search error:", e);
    return "";
  }
}

// ── Firecrawl scraping ──

async function scrapeTicketPlatforms(query: string, city: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return "";

  const results: string[] = [];

  try {
    const variants = buildSearchVariants(query, city).slice(0, 3);
    const domains = TICKETING_DOMAINS.map(({ domain }) => `site:${domain}`).join(" OR ");

    // Build diverse search queries
    const searchQueries = [
      // Ticketing-focused
      ...variants.map((v) => `${v} (show OR festival OR turnê OR ingresso) (${domains})`),
      // Google general search for broader coverage
      `"${normalizeText(query)}" ${city} show ingresso 2026`,
      `"${stripAccents(query)}" ${city} ingressos comprar`,
    ];

    const searches = await Promise.all(
      searchQueries.slice(0, 5).map(async (q) => {
        const response = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            limit: 5,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("Firecrawl error:", response.status, text);
          return [];
        }
        const data = await response.json();
        return data.data || [];
      })
    );

    const seenUrls = new Set<string>();
    for (const items of searches) {
      for (const item of items) {
        if (!item?.url || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        const snippet = normalizeText((item.markdown || item.description || "").slice(0, 800));
        results.push(`[${normalizeText(item.title || "")}] ${item.url}\n${snippet}`);
      }
    }

    console.log("Firecrawl unique results:", results.length);
  } catch (e) {
    console.error("Firecrawl error:", e);
  }

  return results.join("\n\n---\n\n");
}

// ── AI structuring ──

async function structureWithGemini(
  query: string,
  city: string,
  perplexityData: string,
  firecrawlData: string,
): Promise<AIEvent[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `Você é um assistente especializado em shows e eventos musicais no Brasil.
Hoje é ${today}. O ano atual é ${today.slice(0, 4)}.
REGRAS ESTRITAS:
- Use APENAS informações dos dados fornecidos. NÃO invente eventos.
- APENAS eventos musicais: shows, concertos, festivais de música, turnês.
- IGNORE eventos esportivos, teatro, conferências, palestras religiosas.
- Combine informações de múltiplas fontes para obter o dado mais preciso.
- VENUE: Use o nome REAL da casa de show/local. NUNCA use "A Definir", "TBA", ou "Local a confirmar". Se não souber o venue exato, use o melhor dado disponível nos resultados.
- Considere nomes com e sem acento como o MESMO evento (Oboé = Oboe).
- Datas: use apenas datas futuras (>= ${today}). Para eventos recorrentes, use a próxima data.
- Categorias: ${MUSIC_CATEGORIES.join(", ")}.
  Sertanejo: sertanejo, sofrência, arrocha
  Funk: funk, baile funk, MC
  Rock: rock, pop, indie, metal, punk, alternativo
  Pagode: pagode, samba, axé, MPB
  Eletrônico: eletrônica, DJ, rave
  Forró: forró, piseiro, vaquejada
  Outro: festivais multi-gênero, outros
- Ticketeiras: ${TICKETING_PLATFORMS}.
- Use SEMPRE acentos corretos em português.`;

  const userPrompt = `Busca: "${query}" em ${city}.

DADOS WEB (Perplexity):
${perplexityData || "Nenhum resultado."}

DADOS TICKETEIRAS (Firecrawl):
${firecrawlData || "Nenhum resultado."}

Extraia até 10 eventos musicais reais. Priorize eventos diretamente relacionados a "${query}".
Para buscas genéricas (como "shows em Salvador"), retorne os principais eventos futuros da cidade.
Se "${query}" é nome de artista/banda, retorne TODOS os shows encontrados desse artista.`;

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
                      name: { type: "string", description: "Nome completo do show/artista/evento" },
                      date: { type: "string", description: "YYYY-MM-DD" },
                      time: { type: "string", description: "HH:MM ou 00:00 se desconhecido" },
                      venue: { type: "string", description: "Nome real da casa de show ou local" },
                      city: { type: "string", description: "Cidade" },
                      category: { type: "string", enum: MUSIC_CATEGORIES },
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
  const tokens = tokenize(query);
  const isGenericSearch = tokens.length === 0 || 
    ["shows", "eventos", "festas", "festival"].some((w) => toSearchKey(query).includes(w));

  // Use relaxed threshold for generic searches, stricter for specific artist/event searches
  const minScore = isGenericSearch ? 0.1 : tokens.length <= 1 ? 0.25 : 0.4;

  return dedupeEvents(
    (parsed.events || [])
      .map((e: AIEvent) => ({
        ...e,
        name: normalizeText(e.name),
        venue: normalizeText(e.venue),
        city: normalizeText(e.city),
      }))
      .filter((event: AIEvent) => scoreEventMatch(event, query, city) >= minScore)
      .sort((a: AIEvent, b: AIEvent) => scoreEventMatch(b, query, city) - scoreEventMatch(a, query, city))
  ).slice(0, 10);
}

// ── Handler ──

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
    console.log(`Searching: "${query}" in ${cityFilter}`);

    let [perplexityData, firecrawlData] = await Promise.all([
      searchPerplexity(query, cityFilter),
      scrapeTicketPlatforms(query, cityFilter),
    ]);

    // Fallback with accent-stripped query if no results
    if (!perplexityData && !firecrawlData) {
      const relaxed = stripAccents(query);
      if (relaxed !== query) {
        console.log(`Retrying with accent-stripped query: "${relaxed}"`);
        [perplexityData, firecrawlData] = await Promise.all([
          searchPerplexity(relaxed, cityFilter),
          scrapeTicketPlatforms(relaxed, cityFilter),
        ]);
      }
    }

    console.log(`Data: Perplexity ${perplexityData.length}ch, Firecrawl ${firecrawlData.length}ch`);

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
