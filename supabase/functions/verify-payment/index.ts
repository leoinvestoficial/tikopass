import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getTransferInstructions(platform: string, level: string): string {
  const p = platform.toLowerCase();
  if (p.includes("sympla")) return "Acesse o app Sympla → Meus Ingressos → Transferir → insira o e-mail do comprador. Se o ingresso não for transferível, acesse pelo site, tire print do QR e envie pelo chat.";
  if (p.includes("eventim")) return "Acesse eventim.com.br → encontre o ingresso → clique em 'Transferir Ingresso' → copie o link gerado → envie ao comprador pelo chat.";
  if (p.includes("ticket360")) return "Acesse o app Ticket360 → Meus Ingressos → transfira para o e-mail do comprador. Limite: 2 ingressos por CPF. Bloqueio 2h após abertura.";
  if (p.includes("ticket maker") || p.includes("ticketmaker")) return "Acesse ticketmaker.com.br ou o app → localize o ingresso → use a opção de transferência de titularidade → insira o e-mail do comprador. A transferência é única e invalida o original.";
  if (p.includes("ticketmaster") || p.includes("quentro")) return "Abra o app Quentro → localize o ingresso → toque em Transferir → insira o e-mail do comprador. O comprador precisa ter conta no Quentro.";
  if (p.includes("ingresse")) return "Acesse o app Ingresse → Meus Ingressos → Transferir → insira o e-mail do comprador.";
  if (p.includes("bilheteria digital")) return "Acesse o app Bilheteria Digital → Meus Ingressos → Transferir → insira o e-mail do comprador. Transferência única.";
  if (p.includes("livepass")) return "Ingresso em custódia — entregue automaticamente ao comprador após confirmação do pagamento. Nenhuma ação necessária.";
  if (p.includes("tickets for fun") || p.includes("t4f")) return "Envie o PDF pelo chat da Tiko Pass após confirmação do pagamento. Mantenha a compra ativa na T4F até o evento.";
  if (level === "yellow") return "O arquivo do ingresso está em custódia e será entregue automaticamente ao comprador. Nenhuma ação necessária.";
  return "Transfira o ingresso para o comprador seguindo as instruções da plataforma de origem e confirme a transferência pelo chat.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, negotiation_id } = await req.json();
    if (!session_id || !negotiation_id) throw new Error("session_id e negotiation_id são obrigatórios");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // With manual capture, payment_status will be "unpaid" until captured,
    // but the PaymentIntent status will be "requires_capture" meaning money is authorized
    const paymentIntentId = session.payment_intent as string;
    let isAuthorized = false;

    if (paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      isAuthorized = pi.status === "requires_capture";
    }

    if (isAuthorized || session.payment_status === "paid") {
      // Update negotiation
      await supabaseAdmin
        .from("negotiations")
        .update({
          payment_status: "paid",
          payment_intent_id: paymentIntentId,
          status: "completed",
        })
        .eq("id", negotiation_id);

      // Get negotiation details
      const { data: neg } = await supabaseAdmin
        .from("negotiations")
        .select("ticket_id, buyer_id, seller_id, offer_price, platform_fee")
        .eq("id", negotiation_id)
        .single();

      if (neg) {
        // Mark ticket as sold
        await supabaseAdmin
          .from("tickets")
          .update({ status: "sold" })
          .eq("id", neg.ticket_id);

        // Get ticket details for platform info
        const { data: ticketData } = await supabaseAdmin
          .from("tickets")
          .select("source_platform")
          .eq("id", neg.ticket_id)
          .single();

        // Determine guarantee level based on platform
        const platform = ticketData?.source_platform?.toLowerCase() || "";
        let guaranteeLevel = "yellow";
        const greenPlatforms = ["sympla", "eventim", "ticket360", "ticketmaster", "quentro", "ingresse", "bilheteria digital", "guiche web", "blueticket", "uhuu", "ingresso digital", "articket"];
        const orangePlatforms = ["ticket maker", "ticketmaker"];
        if (greenPlatforms.some(p => platform.includes(p))) guaranteeLevel = "green";
        else if (orangePlatforms.some(p => platform.includes(p))) guaranteeLevel = "orange";

        // Generate transfer instructions based on platform
        const transferInstructions = getTransferInstructions(platform, guaranteeLevel);

        // Create wallet transaction for seller (pending until event passes)
        const sellerAmount = neg.offer_price - (neg.platform_fee || 0);
        await supabaseAdmin
          .from("wallet_transactions")
          .insert({
            user_id: neg.seller_id,
            negotiation_id: negotiation_id,
            type: "sale",
            amount: sellerAmount,
            status: "pending",
            description: "Venda de ingresso — liberação após o evento",
          });

        // Create buyer_access token (72h, renewable until event)
        const token = crypto.randomUUID() + "-" + crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

        await supabaseAdmin
          .from("buyer_access")
          .insert({
            ticket_id: neg.ticket_id,
            buyer_id: neg.buyer_id,
            token,
            expires_at: expiresAt,
          });

        // Create ticket_transfer record for tracking
        await supabaseAdmin
          .from("ticket_transfers")
          .insert({
            negotiation_id: negotiation_id,
            ticket_id: neg.ticket_id,
            seller_id: neg.seller_id,
            buyer_id: neg.buyer_id,
            status: guaranteeLevel === "yellow" ? "transferred" : "pending_transfer",
            platform: ticketData?.source_platform || "unknown",
            guarantee_level: guaranteeLevel,
            transfer_instructions: transferInstructions,
            transferred_at: guaranteeLevel === "yellow" ? new Date().toISOString() : null,
          });

        // Create order record (idempotent on negotiation_id)
        const { data: orderRow } = await supabaseAdmin
          .from("orders")
          .upsert({
            negotiation_id: negotiation_id,
            ticket_id: neg.ticket_id,
            seller_id: neg.seller_id,
            buyer_id: neg.buyer_id,
            amount: neg.offer_price,
            status: "paid",
          }, { onConflict: "negotiation_id" })
          .select("id")
          .single();

        // Trigger on-sale-confirmed for ticketeira-aware notifications/instructions
        if (orderRow?.id) {
          try {
            await supabaseAdmin.functions.invoke("on-sale-confirmed", {
              body: { order_id: orderRow.id },
            });
          } catch (e) {
            console.error("on-sale-confirmed invoke failed:", e);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, payment_status: "authorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, payment_status: session.payment_status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
