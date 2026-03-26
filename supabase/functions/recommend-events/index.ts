import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { city } = await req.json();
    const cityFilter = city || "Salvador";

    console.log(`Fetching recommended events for: ${cityFilter}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    // Search for trending events via Perplexity
    let webData = "";
    if (PERPLEXITY_KEY) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${PERPLEXITY_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              { role: "system", content: "Você busca os próximos shows e concertos musicais populares em uma cidade brasileira. Foque APENAS em eventos de música: shows, turnês, festivais musicais. Busque nas ticketeiras Ticketmaster, Eventim, Livepass, Sympla, Tickets For Fun, Clube do Ingresso, Guichê Web e Ticket Maker." },
              { role: "user", content: `Quais são os próximos shows e concertos musicais em ${cityFilter} e região? Hoje é ${today}. Liste os shows mais relevantes dos próximos 30 dias com nome do artista/banda, data, horário e local.` },
            ],
            search_recency_filter: "month",
          }),
        });
        if (pRes.ok) {
          const d = await pRes.json();
          webData = d.choices?.[0]?.message?.content || "";
          console.log("Perplexity recommended data length:", webData.length);
        }
      } catch (e) { console.error("Perplexity error:", e); }
    }

    // Structure with Gemini
    const today = new Date().toISOString().split("T")[0];
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `Você estrutura dados de shows e eventos musicais reais no Brasil. Hoje é ${today}. Extraia APENAS shows/concertos/festivais musicais que existam nos dados fornecidos. IGNORE eventos não-musicais. Categorias: Shows, Festivais, Sertanejo, Rock & Pop, Pagode & Samba, Eletrônica. Use acentos corretos em português.` },
          { role: "user", content: `Shows e concertos em ${cityFilter}:\n\n${webData || "Sem dados de busca disponíveis."}\n\nExtraia até 6 shows/eventos musicais reais dos próximos 30 dias.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_events",
            description: "Return recommended events",
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
                      category: { type: "string", enum: ["Shows", "Festas", "Esportes", "Teatro", "Festivais", "Stand-up"] },
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

    console.log("Recommended events:", events.length);

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
