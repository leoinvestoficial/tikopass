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

    if (session.payment_status === "paid") {
      // Update negotiation
      await supabaseAdmin
        .from("negotiations")
        .update({
          payment_status: "paid",
          payment_intent_id: session.payment_intent as string,
          status: "completed",
        })
        .eq("id", negotiation_id);

      // Get ticket_id from negotiation
      const { data: neg } = await supabaseAdmin
        .from("negotiations")
        .select("ticket_id")
        .eq("id", negotiation_id)
        .single();

      if (neg) {
        // Mark ticket as sold
        await supabaseAdmin
          .from("tickets")
          .update({ status: "sold" })
          .eq("id", neg.ticket_id);
      }

      return new Response(
        JSON.stringify({ success: true, payment_status: "paid" }),
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
