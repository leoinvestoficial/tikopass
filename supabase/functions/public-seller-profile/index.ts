import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId)) {
      return new Response(JSON.stringify({ error: "userId inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [profileRes, ratingsRes, ticketsRes, salesCountRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "user_id, display_name, avatar_url, bio, city, cover_url, manual_badges, " +
            "created_at, kyc_status, asaas_kyc_status, avatar_status, preferences",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("seller_ratings")
        .select("rating, comment, created_at, buyer_id")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("tickets")
        .select("id, price, status, created_at, event_id, events(id, name, date, city)")
        .eq("seller_id", userId)
        .in("status", ["available", "validated", "sold", "completed"])
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("negotiations")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("payment_status", "paid"),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (ratingsRes.error) throw ratingsRes.error;
    if (ticketsRes.error) throw ticketsRes.error;
    if (salesCountRes.error) throw salesCountRes.error;

    if (!profileRes.data) {
      return new Response(
        JSON.stringify({
          profile: null,
          ratings: [],
          avgRating: null,
          ratingCount: 0,
          tickets: [],
          totalSales: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const ratings = ratingsRes.data || [];
    const avgRating =
      ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length : null;

    let reviewsWithNames = ratings.map((rating) => ({ ...rating, buyer_name: "Comprador" }));

    if (ratings.length > 0) {
      const buyerIds = [...new Set(ratings.map((rating) => rating.buyer_id).filter(Boolean))];
      const { data: buyerProfiles, error: buyerProfilesError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", buyerIds);

      if (buyerProfilesError) throw buyerProfilesError;

      const nameMap = new Map((buyerProfiles || []).map((profile) => [profile.user_id, profile.display_name]));
      reviewsWithNames = ratings.map((rating) => ({
        ...rating,
        buyer_name: nameMap.get(rating.buyer_id) || "Comprador",
      }));
    }

    const rawProfile = profileRes.data as Record<string, unknown>;
    const prefs = (rawProfile.preferences as Record<string, any> | null) ?? {};
    const privacy = (prefs.privacy as Record<string, any> | undefined) ?? {};
    const showLocation = privacy.show_location !== false;
    const showStats = privacy.show_stats !== false;

    const { preferences: _omit, ...publicProfile } = rawProfile;
    if (!showLocation) (publicProfile as any).city = null;

    return new Response(
      JSON.stringify({
        profile: publicProfile,
        ratings: reviewsWithNames,
        avgRating,
        ratingCount: ratings.length,
        tickets: ticketsRes.data || [],
        totalSales: showStats ? salesCountRes.count || 0 : 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar perfil";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
