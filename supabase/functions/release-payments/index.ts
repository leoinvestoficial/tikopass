import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find completed negotiations where event date has passed (2+ hours ago)
    // and payment hasn't been captured yet
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: negotiations, error } = await supabaseAdmin
      .from("negotiations")
      .select("id, payment_intent_id, ticket_id, seller_id, tickets(event_id, events(date))")
      .eq("status", "completed")
      .eq("payment_status", "paid")
      .not("payment_intent_id", "is", null);

    if (error) throw error;

    let released = 0;
    let errors = 0;

    for (const neg of (negotiations || [])) {
      const eventDate = (neg as any).tickets?.events?.date;
      if (!eventDate) continue;

      // Only release if event date has passed by 2+ hours
      const eventEnd = new Date(eventDate + "T23:59:59Z");
      eventEnd.setHours(eventEnd.getHours() + 2);
      if (new Date() < eventEnd) continue;

      try {
        // Check if PaymentIntent needs capturing
        const pi = await stripe.paymentIntents.retrieve(neg.payment_intent_id!);
        
        if (pi.status === "requires_capture") {
          // Capture the payment
          await stripe.paymentIntents.capture(neg.payment_intent_id!);
          console.log(`Captured payment for negotiation ${neg.id}`);
        }

        // Update wallet transaction to available
        await supabaseAdmin
          .from("wallet_transactions")
          .update({
            status: "available",
            released_at: new Date().toISOString(),
          })
          .eq("negotiation_id", neg.id)
          .eq("type", "sale");

        // Update ticket to completed
        await supabaseAdmin
          .from("tickets")
          .update({ status: "completed" })
          .eq("id", neg.ticket_id);

        // Invalidate buyer access tokens
        await supabaseAdmin
          .from("buyer_access")
          .update({ invalidated_at: new Date().toISOString() })
          .eq("ticket_id", neg.ticket_id);

        released++;
      } catch (err) {
        console.error(`Error releasing payment for negotiation ${neg.id}:`, err);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, released, errors, total: (negotiations || []).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("release-payments error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
