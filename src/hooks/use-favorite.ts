import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const cache = new Map<string, boolean>();
const listeners = new Set<() => void>();

async function loadFavorites(userId: string) {
  const { data } = await supabase.from("favorites" as any).select("event_id").eq("user_id", userId);
  cache.clear();
  (data || []).forEach((row: any) => cache.set(row.event_id, true));
  listeners.forEach((l) => l());
}

export function useFavorite(eventId?: string) {
  const { user } = useAuth();
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    listeners.add(rerender);
    if (user && cache.size === 0) loadFavorites(user.id);
    return () => { listeners.delete(rerender); };
  }, [user]);

  const isFavorite = !!eventId && cache.get(eventId) === true;

  const toggle = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user || !eventId) return;
    if (isFavorite) {
      cache.delete(eventId);
      listeners.forEach((l) => l());
      await supabase.from("favorites" as any).delete().eq("user_id", user.id).eq("event_id", eventId);
    } else {
      cache.set(eventId, true);
      listeners.forEach((l) => l());
      await supabase.from("favorites" as any).insert({ user_id: user.id, event_id: eventId });
    }
  };

  return { isFavorite, toggle, canFavorite: !!user };
}
