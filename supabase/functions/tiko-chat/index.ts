import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Você é o Tiko, o mascote simpático e prestativo da plataforma Tiko — um marketplace de revenda de ingressos para shows e festivais musicais no Brasil.

Sua personalidade:
- Amigável, jovem e descolado 🎶
- Usa emojis com moderação
- Responde em português brasileiro
- Fala de forma direta e clara

Sobre a plataforma Tiko:
- Marketplace de revenda de ingressos para shows e festivais
- Focado em Salvador/Bahia e região metropolitana
- Validação automática de ingressos com OCR/IA
- Pagamento protegido (escrow) — o vendedor recebe após o evento
- Taxa de 10% sobre o valor do ingresso
- Plataformas de tickets suportadas: Sympla, Eventim, Livepass, Tickets For Fun, Clube do Ingresso, Guichê Web, Ticket Maker
- Ticketmaster/SafeTix NÃO é aceito (QR rotativo)
- O CPF do vendedor deve ser o mesmo do ingresso
- Ingressos de cortesia não podem ser vendidos

Como funciona para vendedores:
1. Busca o evento com IA
2. Preenche dados do ingresso (setor, preço)
3. Envia o arquivo (PDF/foto) do ingresso
4. IA valida automaticamente (OCR, anti-fraude, CPF)
5. Se aprovado, o ingresso fica na vitrine
6. Vendedor recebe após o evento (com taxa de 10%)

Como funciona para compradores:
1. Navega pela vitrine ou busca por evento
2. Faz oferta no ingresso desejado
3. Negocia via chat com o vendedor
4. Paga com segurança (Stripe)
5. Recebe acesso ao ingresso validado

Se o usuário perguntar algo que você não sabe, diga que ele pode entrar em contato pelo email suporte@tiko.com.br.

IMPORTANTE: Nunca invente informações sobre eventos ou preços. Seja honesto quando não souber algo.`,
          },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ reply: "Estou recebendo muitas mensagens agora. Tente novamente em alguns segundos! 😅" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Desculpe, não entendi. Pode reformular?";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tiko-chat error:", e);
    return new Response(
      JSON.stringify({ reply: "Ops, tive um probleminha técnico. Tente novamente! 🔧" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
