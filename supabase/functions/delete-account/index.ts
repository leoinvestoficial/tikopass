import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for active negotiations
    const { data: activeNegotiations } = await supabaseAdmin
      .from("negotiations")
      .select("id")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .in("status", ["pending", "accepted"])
      .limit(1);

    if (activeNegotiations && activeNegotiations.length > 0) {
      return new Response(
        JSON.stringify({ error: "Você possui negociações em andamento. Finalize-as antes de excluir sua conta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete user's tickets
    await supabaseAdmin.from("tickets").delete().eq("seller_id", user.id);

    // Delete user's profile
    await supabaseAdmin.from("profiles").delete().eq("user_id", user.id);

    // Delete user's avatar from storage
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from("avatars")
      .list(user.id);
    if (avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles.map(f => `${user.id}/${f.name}`);
      await supabaseAdmin.storage.from("avatars").remove(paths);
    }

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir conta. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Conta excluída com sucesso." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("delete-account error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar exclusão." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
