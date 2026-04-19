import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fillPlaceholders(text: string, data: Record<string, string>): string {
  return Object.entries(data).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, v ?? ""),
    text || ""
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { negotiation_id } = await req.json();
    if (!negotiation_id) throw new Error("negotiation_id obrigatório");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch negotiation with related data
    const { data: neg, error: negErr } = await supabaseAdmin
      .from("negotiations")
      .select("*, tickets(*, events(*))")
      .eq("id", negotiation_id)
      .single();
    if (negErr || !neg) throw new Error("Negociação não encontrada");

    const ticket = (neg as any).tickets;
    const event = ticket?.events;
    if (!ticket || !event) throw new Error("Ingresso ou evento não encontrado");

    // 2. Fetch buyer & seller profiles + emails (auth.admin)
    const [{ data: buyerProfile }, { data: sellerProfile }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", neg.buyer_id).single(),
      supabaseAdmin.from("profiles").select("*").eq("user_id", neg.seller_id).single(),
    ]);

    const { data: buyerAuth } = await supabaseAdmin.auth.admin.getUserById(neg.buyer_id);
    const { data: sellerAuth } = await supabaseAdmin.auth.admin.getUserById(neg.seller_id);
    const buyerEmail = buyerAuth?.user?.email || "";
    const sellerEmail = sellerAuth?.user?.email || "";

    // 3. Fetch ticketeira config (or fallback)
    let config: any = null;
    if (ticket.detected_ticketeira) {
      const { data } = await supabaseAdmin
        .from("ticketeira_config")
        .select("*")
        .eq("slug", ticket.detected_ticketeira)
        .single();
      config = data;
    }

    const effectiveConfig = config || {
      slug: "unknown",
      display_name: "Plataforma não identificada",
      release_rule: "post_event_24h",
      transfer_level: "amarelo",
      max_transfer_hours_before_event: null,
      buyer_message_before:
        "Você receberá o ingresso em breve. O vendedor entrará em contato pelo chat desta venda.",
      seller_instructions: {
        steps: ["Entre em contato com o comprador pelo chat para combinar a transferência."],
      },
    };

    // 4. Format placeholders
    const eventDateFormatted = new Date(event.date + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const filled = {
      buyer_email: buyerEmail,
      buyer_name: buyerProfile?.display_name || "Comprador",
      seller_name: sellerProfile?.display_name || "Vendedor",
      event_name: event.name,
      event_date: eventDateFormatted,
      event_date_formatted: eventDateFormatted,
    };

    const sellerSteps = (effectiveConfig.seller_instructions?.steps || []).map((s: string) =>
      fillPlaceholders(s, filled)
    );
    const sellerWarning = effectiveConfig.seller_instructions?.warning
      ? fillPlaceholders(effectiveConfig.seller_instructions.warning, filled)
      : null;
    const deadlineWarning = effectiveConfig.seller_instructions?.deadline_warning
      ? fillPlaceholders(effectiveConfig.seller_instructions.deadline_warning, filled)
      : null;
    const sellerSupport = effectiveConfig.seller_instructions?.support || null;
    const sellerInfo = effectiveConfig.seller_instructions?.info || null;
    const buyerMsgBefore = fillPlaceholders(effectiveConfig.buyer_message_before, filled);

    // 5. Calculate transfer deadline
    let transferDeadline: string | null = null;
    if (effectiveConfig.max_transfer_hours_before_event) {
      const dl = new Date(event.date + "T23:59:59");
      dl.setHours(dl.getHours() - effectiveConfig.max_transfer_hours_before_event);
      transferDeadline = dl.toISOString();
    }

    // 6. Create order (idempotent)
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("negotiation_id", negotiation_id)
      .maybeSingle();

    let orderId = existingOrder?.id;
    if (!orderId) {
      const { data: newOrder, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
          negotiation_id,
          ticket_id: ticket.id,
          buyer_id: neg.buyer_id,
          seller_id: neg.seller_id,
          amount: neg.offer_price,
          status: "paid",
        })
        .select("id")
        .single();
      if (orderErr) throw orderErr;
      orderId = newOrder.id;
    }

    // 7. Update ticket with buyer email + transfer status
    await supabaseAdmin
      .from("tickets")
      .update({
        buyer_email_for_transfer: buyerEmail,
        transfer_status: "seller_notified",
      })
      .eq("id", ticket.id);

    // 8. Insert seller notification
    await supabaseAdmin.from("transfer_notifications").insert({
      ticket_id: ticket.id,
      order_id: orderId,
      recipient_id: neg.seller_id,
      recipient_type: "seller",
      channel: "in_app",
      status: "sent",
      sent_at: new Date().toISOString(),
      message_text: JSON.stringify({
        title: "Ingresso vendido! Faça a transferência agora.",
        ticketeira: effectiveConfig.display_name,
        steps: sellerSteps,
        buyer_email: buyerEmail,
        buyer_name: filled.buyer_name,
        deadline: transferDeadline,
        warning: sellerWarning,
        deadline_warning: deadlineWarning,
        support: sellerSupport,
        info: sellerInfo,
        release_rule: effectiveConfig.release_rule,
        transfer_type: effectiveConfig.transfer_type,
      }),
    });

    // 9. Insert buyer notification
    await supabaseAdmin.from("transfer_notifications").insert({
      ticket_id: ticket.id,
      order_id: orderId,
      recipient_id: neg.buyer_id,
      recipient_type: "buyer",
      channel: "in_app",
      status: "sent",
      sent_at: new Date().toISOString(),
      message_text: JSON.stringify({
        title: "Compra confirmada!",
        body: buyerMsgBefore,
        ticketeira: effectiveConfig.display_name,
        ticketeira_slug: effectiveConfig.slug,
        release_rule: effectiveConfig.release_rule,
        transfer_type: effectiveConfig.transfer_type,
      }),
    });

    // 10. Status log
    await supabaseAdmin.from("transfer_status_log").insert({
      ticket_id: ticket.id,
      order_id: orderId,
      old_status: "pending",
      new_status: "seller_notified",
      changed_by: "system",
      notes: `Venda confirmada. Plataforma: ${effectiveConfig.display_name}`,
    });

    return new Response(
      JSON.stringify({ success: true, order_id: orderId, ticketeira: effectiveConfig.display_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("on-sale-confirmed error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
