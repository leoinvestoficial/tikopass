import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("Usuário não autenticado");

    const { pix_key, pix_key_type, amount } = await req.json();
    if (!pix_key || !pix_key_type) throw new Error("Chave Pix é obrigatória");
    if (!amount || amount <= 0) throw new Error("Valor inválido");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get available balance
    const { data: availableTxs, error: txError } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id, amount")
      .eq("user_id", user.id)
      .eq("status", "available")
      .eq("type", "sale");

    if (txError) throw txError;

    const totalAvailable = (availableTxs || []).reduce((sum: number, t: any) => sum + t.amount, 0);
    if (amount > totalAvailable) throw new Error("Saldo insuficiente");

    // Save pix key on profile
    await supabaseAdmin
      .from("profiles")
      .update({ pix_key, pix_key_type })
      .eq("user_id", user.id);

    // Mark available transactions as withdrawn
    const txIds = (availableTxs || []).map((t: any) => t.id);
    await supabaseAdmin
      .from("wallet_transactions")
      .update({
        status: "withdrawn",
        withdrawn_at: new Date().toISOString(),
      })
      .in("id", txIds);

    // Create withdrawal record
    await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "withdrawal",
        amount,
        status: "withdrawn",
        withdrawn_at: new Date().toISOString(),
        description: `Saque Pix — ${pix_key_type}: ${pix_key}`,
      });

    // TODO: When Pagar.me is configured, call the transfer/pix endpoint here
    // const pagarme = new PagarmeClient(Deno.env.get("PAGARME_API_KEY"));
    // await pagarme.transfers.create({ amount: amount * 100, recipient_id, ... });

    console.log(`Withdrawal of R$${amount} requested by user ${user.id} to ${pix_key_type}:${pix_key}`);

    return new Response(
      JSON.stringify({ success: true, amount, pix_key, pix_key_type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("request-withdrawal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
