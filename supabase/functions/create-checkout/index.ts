import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_PERCENT = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Usuário não autenticado");

    const { negotiation_id } = await req.json();
    if (!negotiation_id) throw new Error("negotiation_id é obrigatório");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: negotiation, error: negError } = await supabaseAdmin
      .from("negotiations")
      .select("*, tickets(*, events(*))")
      .eq("id", negotiation_id)
      .single();

    if (negError || !negotiation) throw new Error("Negociação não encontrada");
    if (negotiation.buyer_id !== user.id) throw new Error("Apenas o comprador pode pagar");
    if (negotiation.status !== "accepted") throw new Error("Negociação precisa estar aceita para pagar");
    if (negotiation.payment_status === "paid") throw new Error("Pagamento já realizado");

    const ticketPrice = negotiation.offer_price;
    const platformFee = Math.round(ticketPrice * PLATFORM_FEE_PERCENT) / 100;
    const totalAmount = Math.round((ticketPrice + platformFee) * 100); // centavos

    const eventName = negotiation.tickets?.events?.name || "Ingresso";
    const sector = negotiation.tickets?.sector || "";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // ESCROW: Use manual capture — money is authorized but NOT captured yet
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `${eventName} - ${sector}`,
              description: `Ingresso via TICKET4U (taxa de ${PLATFORM_FEE_PERCENT}% inclusa)`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        capture_method: "manual", // ESCROW: authorize only, capture later post-event
      },
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&negotiation_id=${negotiation_id}`,
      cancel_url: `${req.headers.get("origin")}/negotiations`,
      metadata: {
        negotiation_id,
        ticket_id: negotiation.ticket_id,
        buyer_id: user.id,
        seller_id: negotiation.seller_id,
        platform_fee: platformFee.toString(),
        ticket_price: ticketPrice.toString(),
      },
    });

    await supabaseAdmin
      .from("negotiations")
      .update({
        checkout_session_id: session.id,
        payment_status: "pending",
        platform_fee: platformFee,
      })
      .eq("id", negotiation_id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
