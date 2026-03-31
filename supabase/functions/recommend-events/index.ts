import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { city, category } = await req.json();
    const cityFilter = city || "";
    const categoryFilter = category || "";

    if (!cityFilter) {
      return new Response(JSON.stringify({ events: [], city: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching trending events for: ${cityFilter}, category: ${categoryFilter || "all"}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    let webData = "";
    if (PERPLEXITY_KEY) {
      try {
        const categoryHint = categoryFilter ? ` Foque em eventos da categoria ${categoryFilter}.` : "";
        const today = new Date().toISOString().split("T")[0];
        const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${PERPLEXITY_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              { role: "system", content: `Você é um especialista em shows e festivais musicais no Brasil. Busque APENAS eventos de GRANDE PORTE e ALTA REPERCUSSÃO: turnês nacionais/internacionais de artistas famosos, festivais virais nas redes sociais (como Retronejo, Oboe, Bossa, Mali Pé na Areia, etc.), shows com grande adesão do público jovem.${categoryHint} Busque nas plataformas: Ticketmaster, Eventim, Livepass, Sympla, Tickets For Fun, Clube do Ingresso, Guichê Web, Ticket Maker. NÃO inclua eventos pequenos, bares, casas de show locais ou eventos corporativos.` },
              { role: "user", content: `Quais são os próximos GRANDES shows, festivais e eventos musicais mais comentados e virais em ${cityFilter} e região metropolitana?${categoryFilter ? ` Foque na categoria ${categoryFilter}.` : ""} Hoje é ${today}. Quero APENAS eventos de grande porte com alta repercussão nas redes sociais e mídia, turnês famosas, festivais renomados. Liste os mais relevantes dos próximos 90 dias com datas, locais e artistas.` },
            ],
            search_recency_filter: "month",
          }),
        });
        if (pRes.ok) {
          const d = await pRes.json();
          webData = d.choices?.[0]?.message?.content || "";
          console.log("Perplexity trending data length:", webData.length);
        }
      } catch (e) { console.error("Perplexity error:", e); }
    }

    const today = new Date().toISOString().split("T")[0];
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `Você estrutura dados de grandes shows e eventos musicais reais e VIRAIS no Brasil. Hoje é ${today}. Extraia APENAS shows/concertos/festivais musicais de GRANDE PORTE que realmente existam e tenham alta repercussão.${categoryFilter ? ` Foque na categoria ${categoryFilter}.` : ""} Priorize eventos virais com grande adesão do público jovem, turnês famosas e festivais renomados. IGNORE eventos pequenos ou não-musicais. Categorias possíveis: Sertanejo, Rock & Pop, Pagode & Samba, Eletrônica, MPB & Axé, Funk & Rap. Use acentos corretos em português.` },
          { role: "user", content: `Grandes shows e festivais trending em ${cityFilter}${categoryFilter ? ` na categoria ${categoryFilter}` : ""}:\n\n${webData || "Sem dados de busca disponíveis."}\n\nExtraia até 8 grandes shows/eventos musicais reais dos próximos 90 dias.${categoryFilter ? ` APENAS da categoria ${categoryFilter}.` : ""} APENAS eventos de grande porte, virais e com alta repercussão.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_events",
            description: "Return trending events",
            parameters: {
              type: "object",
              properties: {
                events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      date: { type: "string", description: "YYYY-MM-DD" },
                      time: { type: "string", description: "HH:MM" },
                      venue: { type: "string" },
                      city: { type: "string" },
                      category: { type: "string", enum: ["Sertanejo", "Rock & Pop", "Pagode & Samba", "Eletrônica", "MPB & Axé", "Funk & Rap"] },
                    },
                    required: ["name", "date", "time", "venue", "city", "category"],
                  },
                },
              },
              required: ["events"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_events" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const events = toolCall?.function?.arguments
      ? JSON.parse(toolCall.function.arguments).events || []
      : [];

    console.log("Trending events:", events.length);

    return new Response(JSON.stringify({ events, city: cityFilter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-events error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", events: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
