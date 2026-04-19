import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * release-payment
 *
 * Two modes:
 *  - { order_id }                        → process a single order (called after buyer confirms)
 *  - { mode: "scheduled" } or no body    → cron mode: scan all orders eligible for release
 *
 * Release rules:
 *  - immediate         → release as soon as buyer confirms
 *  - 48h_buffer        → release 48h after buyer confirmation (24h for top sellers)
 *  - post_event_24h    → release 24h after event date, regardless of buyer confirmation
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (body.order_id) {
      const result = await processOrder(supabaseAdmin, body.order_id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scheduled mode → scan all eligible orders
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, ticket_id, status, payment_released_at, tickets(transfer_status, detected_ticketeira, events(date))")
      .neq("status", "completed")
      .neq("status", "refunded")
      .is("payment_released_at", null);

    let released = 0;
    let skipped = 0;

    for (const order of orders || []) {
      const t: any = (order as any).tickets;
      if (!t) {
        skipped++;
        continue;
      }
      // Disputes block release
      if (t.transfer_status === "disputed") {
        skipped++;
        continue;
      }

      // Get release rule
      let releaseRule = "post_event_24h";
      if (t.detected_ticketeira) {
        const { data: cfg } = await supabaseAdmin
          .from("ticketeira_config")
          .select("release_rule")
          .eq("slug", t.detected_ticketeira)
          .single();
        if (cfg) releaseRule = cfg.release_rule;
      }

      const eventDate: string | undefined = t.events?.date;
      const now = new Date();

      let shouldRelease = false;

      if (releaseRule === "immediate" && t.transfer_status === "buyer_confirmed") {
        shouldRelease = true;
      } else if (releaseRule === "48h_buffer" && t.transfer_status === "buyer_confirmed") {
        // Look up buyer confirmation time from log
        const { data: log } = await supabaseAdmin
          .from("transfer_status_log")
          .select("created_at")
          .eq("order_id", order.id)
          .eq("new_status", "buyer_confirmed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (log) {
          const confirmedAt = new Date(log.created_at);
          const releaseAt = new Date(confirmedAt.getTime() + 48 * 60 * 60 * 1000);
          if (now >= releaseAt) shouldRelease = true;
        }
      } else if (releaseRule === "post_event_24h" && eventDate) {
        const eventEnd = new Date(eventDate + "T23:59:59");
        eventEnd.setHours(eventEnd.getHours() + 24);
        if (now >= eventEnd) shouldRelease = true;
      }

      if (shouldRelease) {
        await processOrder(supabaseAdmin, order.id);
        released++;
      } else {
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, released, skipped, total: (orders || []).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("release-payment error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processOrder(supabase: any, orderId: string) {
  // Fetch order
  const { data: order } = await supabase
    .from("orders")
    .select("*, tickets(*)")
    .eq("id", orderId)
    .single();
  if (!order) throw new Error("Order não encontrada");
  if (order.payment_released_at) {
    return { success: true, already_released: true };
  }

  const ticket = (order as any).tickets;

  // Update order
  await supabase
    .from("orders")
    .update({ status: "completed", payment_released_at: new Date().toISOString() })
    .eq("id", orderId);

  // Update ticket transfer_status to released
  await supabase
    .from("tickets")
    .update({ transfer_status: "released", status: "completed" })
    .eq("id", ticket.id);

  // Mark wallet sale transaction as available
  await supabase
    .from("wallet_transactions")
    .update({
      status: "available",
      released_at: new Date().toISOString(),
    })
    .eq("negotiation_id", order.negotiation_id)
    .eq("type", "sale");

  // Status log
  await supabase.from("transfer_status_log").insert({
    ticket_id: ticket.id,
    order_id: orderId,
    old_status: ticket.transfer_status,
    new_status: "released",
    changed_by: "system",
    notes: "Pagamento liberado para o vendedor",
  });

  // Notify seller
  await supabase.from("transfer_notifications").insert({
    ticket_id: ticket.id,
    order_id: orderId,
    recipient_id: order.seller_id,
    recipient_type: "seller",
    channel: "in_app",
    status: "sent",
    sent_at: new Date().toISOString(),
    message_text: JSON.stringify({
      title: "Pagamento liberado!",
      body: "O valor da sua venda já está disponível na sua carteira para saque.",
    }),
  });

  return { success: true, released: true };
}
