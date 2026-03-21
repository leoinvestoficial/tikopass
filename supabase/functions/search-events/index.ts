import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const today = new Date().toISOString().split("T")[0];
    const cityFilter = city || "Salvador";
    const regionContext = `em ${cityFilter} e região metropolitana da Bahia (incluindo Salvador, Lauro de Freitas, Camaçari, Feira de Santana, Porto Seguro, Ilhéus, Santo Amaro, Praia do Forte e litoral baiano)`;

    const systemPrompt = `Você é um assistente especializado em encontrar eventos reais na Bahia, Brasil, especialmente em Salvador e região metropolitana.
Você conhece profundamente a cena cultural, musical e esportiva da Bahia.
Hoje é ${today}.
IMPORTANTE: Retorne TANTO eventos futuros QUANTO eventos recentes que já aconteceram (últimos 6 meses).
Para eventos passados, mantenha a data real em que ocorreram.
Seja preciso com datas, locais e nomes dos eventos.
Inclua eventos de todos os portes - grandes festivais, festas, shows em bares e casas de show, eventos esportivos, peças de teatro, stand-up, etc.
Considere locais conhecidos como: Arena Fonte Nova, Concha Acústica do TCA, Teatro Castro Alves, Wet'n Wild, Arena Parque, Largo do Pelourinho, Casa Pia, Groove Bar, WET, Bahia Café Hall, e similares.
Inclua eventos sazonais como réveillons (ex: Réveillon Destino na Praia do Forte), carnaval, festas juninas, micaretas, lavagens, festas populares baianas, e eventos sertanejos como Retronejo.`;

    const userPrompt = `Busque eventos reais ${regionContext} relacionados a: "${query}".
Retorne até 8 eventos reais, incluindo eventos futuros E eventos que já aconteceram recentemente.
Para eventos passados que são recorrentes (como Réveillon Destino, Retronejo, Festival de Verão), inclua a edição mais recente mesmo que já tenha ocorrido.
Para cada evento, inclua: nome exato do evento (com ano se aplicável), data (formato YYYY-MM-DD), horário, local/venue exato, cidade e categoria (uma de: Shows, Esportes, Teatro, Festivais, Stand-up, Conferências).
Se não souber a data exata, use a data mais provável baseada em edições anteriores.
Exemplos de eventos da região: Retronejo Salvador (Casa Pia), Réveillon Destino (Praia do Forte), Festival de Verão Salvador, Fest Verão Paraíso, jogos do Bahia e Vitória na Fonte Nova.`;

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
              description: "Return a list of real events found",
              parameters: {
                type: "object",
                properties: {
                  events: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome completo do evento" },
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas buscas. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ events: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    console.log("AI found events:", parsed.events?.length || 0);

    return new Response(JSON.stringify({ events: parsed.events || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-events error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
