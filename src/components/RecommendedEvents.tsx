import { useState, useEffect } from "react";
import { Sparkles, MapPin, Calendar, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

type RecommendedEvent = {
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  category: string;
};

interface RecommendedEventsProps {
  userCity: string;
}

export default function RecommendedEvents({ userCity }: RecommendedEventsProps) {
  const [events, setEvents] = useState<RecommendedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userCity) { setLoading(false); return; }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("recommend-events", {
          body: { city: userCity },
        });
        if (cancelled) return;
        if (fnError || data?.error) { setError(true); return; }
        setEvents(data?.events || []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [userCity]);

  if (error || (!loading && events.length === 0)) return null;

  return (
    <section className="py-12 border-t border-border">
      <div className="container">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Acontecendo em {userCity}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Buscando eventos com IA...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event, i) => (
              <Link
                key={i}
                to={`/sell?event=${encodeURIComponent(event.name)}&city=${encodeURIComponent(event.city)}`}
                className="group block bg-card border border-border rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{event.category}</span>
                <h3 className="font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
                  {event.name}
                </h3>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {event.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{event.venue}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-xs font-medium text-primary group-hover:underline flex items-center gap-1">
                    Vender ingresso <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
