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
  let query = supabase.from("events").select("*").order("date", { ascending: false });
  if (city) query = query.eq("city", city);
  if (category) query = query.eq("category", category);
  if (search) query = query.ilike("name", `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchEventById(id: string) {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createEvent(event: {
  name: string; date: string; time: string; venue: string; city: string; category: string; source?: string;
}) {
  const { data, error } = await supabase.from("events").insert(event).select().single();
  if (error) throw error;
  return data;
}

// Tickets
export async function fetchTickets(filters?: { city?: string; category?: string; search?: string }) {
  let query = supabase
    .from("tickets")
    .select("*, events(*)")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (filters?.city) query = query.eq("events.city", filters.city);
  if (filters?.category) query = query.eq("events.category", filters.category);
  if (filters?.search) query = query.ilike("events.name", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  // Filter out tickets where event was filtered out by inner join conditions
  return (data || []).filter((t: any) => t.events !== null);
}

export async function fetchTicketsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(*)")
    .eq("event_id", eventId)
    .eq("status", "available")
    .order("price", { ascending: true });
  if (error) throw error;

  // Fetch seller profiles and ratings
  if (data && data.length > 0) {
    const sellerIds = [...new Set(data.map(t => t.seller_id))];
    const [profilesRes, ratingsRes] = await Promise.all([
      supabase.from("profiles").select("*").in("user_id", sellerIds),
      supabase.from("seller_ratings" as any).select("seller_id, rating").in("seller_id", sellerIds),
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

    return data.map(t => ({
      ...t,
      seller_profile: profileMap.get(t.seller_id) || null,
      seller_avg_rating: ratingMap.has(t.seller_id)
        ? ratingMap.get(t.seller_id)!.total / ratingMap.get(t.seller_id)!.count
        : null,
      seller_rating_count: ratingMap.get(t.seller_id)?.count || 0,
    }));
  }
  return data;
}

export async function createTicket(ticket: {
  event_id: string; seller_id: string; sector: string; row?: string; seat?: string; price: number; original_price?: number;
}) {
  const { data, error } = await supabase.from("tickets").insert(ticket).select().single();
  if (error) throw error;
  return data;
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

export async function updateNegotiationStatus(id: string, status: string) {
  const { error } = await supabase.from("negotiations").update({ status }).eq("id", id);
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
