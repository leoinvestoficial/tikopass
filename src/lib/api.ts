import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Event = Tables<"events">;
export type Ticket = Tables<"tickets"> & { events?: Event; seller_profile?: Tables<"profiles"> };
export type Negotiation = Tables<"negotiations"> & {
  tickets?: Ticket & { events?: Event };
  buyer_profile?: Tables<"profiles">;
  seller_profile?: Tables<"profiles">;
};
export type NegotiationMessage = Tables<"negotiation_messages"> & {
  sender_profile?: Tables<"profiles">;
};

// Events
export async function fetchEvents(city?: string, category?: string, search?: string) {
  if (search) {
    let events = await searchEventsLocal(search, city);
    if (category) events = events.filter((event) => event.category === category);
    return events.sort((a, b) => a.date.localeCompare(b.date));
  }

  let query = supabase.from("events").select("*").order("date", { ascending: false });
  if (city) query = query.eq("city", city);
  if (category) query = query.eq("category", category);
  if (search) query = query.ilike("name", `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Accent-insensitive local search for events
export async function searchEventsLocal(searchTerm: string, city?: string) {
  const { data, error } = await supabase.rpc("search_events_unaccent", {
    search_term: searchTerm,
    city_filter: city || null,
  });
  if (error) throw error;
  return (data || []) as Event[];
}

// Find similar event to avoid duplicates
export async function findSimilarEvent(name: string, date: string, city: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("find_similar_event", {
    event_name: name,
    event_date: date,
    event_city: city,
  });
  if (error) throw error;
  return data as string | null;
}

export async function fetchEventById(id: string) {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createEvent(event: {
  name: string; date: string; time: string; venue: string; city: string; category: string; source?: string;
}) {
  // Check for existing similar event first
  const existingId = await findSimilarEvent(event.name, event.date, event.city);
  if (existingId) {
    // Return existing event instead of creating duplicate
    const { data, error } = await supabase.from("events").select("*").eq("id", existingId).single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("events").insert(event).select().single();
  if (error) throw error;
  return data;
}

// Tickets
export async function fetchTickets(filters?: { city?: string; category?: string; search?: string; dateFrom?: string; dateTo?: string }) {
  const today = new Date().toISOString().split("T")[0];
  const matchingEventIds = filters?.search
    ? (await searchEventsLocal(filters.search, filters.city)).map((event) => event.id)
    : [];

  let query = supabase
    .from("tickets")
    .select("*, events(*)")
    .in("status", ["available", "validated"])
    .gte("events.date", filters?.dateFrom || today)
    .order("created_at", { ascending: false });

  if (filters?.dateTo) query = query.lte("events.date", filters.dateTo);
  if (filters?.city) query = query.eq("events.city", filters.city);
  if (filters?.category) query = query.eq("events.category", filters.category);
  if (matchingEventIds.length > 0) query = query.in("event_id", matchingEventIds);
  else if (filters?.search) query = query.ilike("events.name", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).filter((t: any) => t.events !== null);
}

// Fetch seller's own tickets (including past events)
export async function fetchMyTickets(sellerId: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(*)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTicketsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(*)")
    .eq("event_id", eventId)
    .in("status", ["available", "validated"])
    .order("price", { ascending: true });
  if (error) throw error;

  // Fetch seller profiles, ratings, and sales counts
  if (data && data.length > 0) {
    const sellerIds = [...new Set(data.map(t => t.seller_id))];
    const [profilesRes, ratingsRes, salesRes] = await Promise.all([
      supabase.from("profiles").select("*").in("user_id", sellerIds),
      supabase.from("seller_ratings" as any).select("seller_id, rating").in("seller_id", sellerIds),
      supabase.from("tickets").select("seller_id").in("seller_id", sellerIds).in("status", ["sold", "completed"]),
    ]);
    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    
    // Calculate average ratings per seller
    const ratingMap = new Map<string, { total: number; count: number }>();
    for (const r of (ratingsRes.data || []) as any[]) {
      const existing = ratingMap.get(r.seller_id) || { total: 0, count: 0 };
      existing.total += r.rating;
      existing.count += 1;
      ratingMap.set(r.seller_id, existing);
    }

    // Calculate sales count per seller
    const salesMap = new Map<string, number>();
    for (const s of (salesRes.data || []) as any[]) {
      salesMap.set(s.seller_id, (salesMap.get(s.seller_id) || 0) + 1);
    }

    return data.map(t => ({
      ...t,
      seller_profile: profileMap.get(t.seller_id) || null,
      seller_avg_rating: ratingMap.has(t.seller_id)
        ? ratingMap.get(t.seller_id)!.total / ratingMap.get(t.seller_id)!.count
        : null,
      seller_rating_count: ratingMap.get(t.seller_id)?.count || 0,
      seller_sales_count: salesMap.get(t.seller_id) || 0,
    }));
  }
  return data;
}

// Public seller profile
export async function fetchSellerProfile(userId: string) {
  const [profileRes, ratingsRes, ticketsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).single(),
    supabase.from("seller_ratings" as any).select("rating, comment, created_at, buyer_id").eq("seller_id", userId).order("created_at", { ascending: false }),
    supabase.from("tickets").select("id, price, status, created_at, event_id, events(id, name, date, city)").eq("seller_id", userId).order("created_at", { ascending: false }),
  ]);
  if (profileRes.error) throw profileRes.error;

  const ratings = (ratingsRes.data || []) as any[];
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
    : null;

  let reviewsWithNames = ratings;
  if (ratings.length > 0) {
    const buyerIds = [...new Set(ratings.map((r: any) => r.buyer_id))];
    const { data: buyerProfiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", buyerIds);
    const nameMap = new Map((buyerProfiles || []).map((p) => [p.user_id, p.display_name]));
    reviewsWithNames = ratings.map((r: any) => ({ ...r, buyer_name: nameMap.get(r.buyer_id) || "Comprador" }));
  }

  return {
    profile: profileRes.data,
    ratings: reviewsWithNames,
    avgRating,
    ratingCount: ratings.length,
    tickets: ticketsRes.data || [],
    totalSales: (ticketsRes.data || []).filter((t: any) => t.status === "sold").length,
  };
}

export async function createTicket(ticket: {
  event_id: string; seller_id: string; sector: string; row?: string; seat?: string; price: number; original_price?: number;
}) {
  const { data, error } = await supabase
    .from("tickets")
    .insert({ ...ticket, status: "pending_validation" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTicket(id: string, updates: { sector?: string; row?: string; seat?: string; price?: number; original_price?: number; status?: string }) {
  const { error } = await supabase.from("tickets").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTicket(id: string) {
  const { error } = await supabase.from("tickets").delete().eq("id", id);
  if (error) throw error;
}

// Negotiations
export async function fetchUserNegotiations(userId: string) {
  const { data, error } = await supabase
    .from("negotiations")
    .select(`*, tickets(*, events(*))`)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  
  // Fetch profiles for buyer/seller
  if (data && data.length > 0) {
    const userIds = [...new Set(data.flatMap(n => [n.buyer_id, n.seller_id]))];
    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    return data.map(n => ({
      ...n,
      buyer_profile: profileMap.get(n.buyer_id) || null,
      seller_profile: profileMap.get(n.seller_id) || null,
    }));
  }
  return data;
}

export async function createNegotiation(neg: {
  ticket_id: string; buyer_id: string; seller_id: string; offer_price: number;
}) {
  const { data, error } = await supabase.from("negotiations").insert(neg).select().single();
  if (error) throw error;
  return data;
}

export async function updateNegotiationStatus(id: string, status: string, counterOfferPrice?: number) {
  const updates: any = { status };
  if (counterOfferPrice !== undefined) updates.counter_offer_price = counterOfferPrice;
  const { error } = await supabase.from("negotiations").update(updates).eq("id", id);
  if (error) throw error;
}

// Messages
export async function fetchMessages(negotiationId: string) {
  const { data, error } = await supabase
    .from("negotiation_messages")
    .select("*")
    .eq("negotiation_id", negotiationId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  if (data && data.length > 0) {
    const senderIds = [...new Set(data.map(m => m.sender_id))];
    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", senderIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    return data.map(m => ({ ...m, sender_profile: profileMap.get(m.sender_id) || null }));
  }
  return data;
}

export async function sendMessage(msg: { negotiation_id: string; sender_id: string; content: string }) {
  const { data, error } = await supabase.from("negotiation_messages").insert(msg).select().single();
  if (error) throw error;
  return data;
}

// AI Event Search
export async function searchEventsWithAI(query: string, city?: string) {
  const { data, error } = await supabase.functions.invoke("search-events", {
    body: { query, city },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.events as Array<{
    name: string; date: string; time: string; venue: string; city: string; category: string;
  }>;
}
