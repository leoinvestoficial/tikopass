import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getBannerForCategory } from "@/lib/event-banners";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Favoritos · Tiko Pass";
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("favorites" as any)
        .select("event_id, events(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setEvents(((data || []) as any[]).map((r) => r.events).filter(Boolean));
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-bottom-nav">
      <Navbar />
      <main className="flex-1 container py-8 md:py-12">
        <div className="mb-8 space-y-1">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">Favoritos</h1>
          <p className="text-sm text-muted-foreground">Eventos que você salvou para ver depois.</p>
        </div>

        {!user && !authLoading ? (
          <div className="text-center py-16 space-y-4">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Faça login para ver seus favoritos.</p>
            <Link to="/auth"><Button className="rounded-full">Entrar</Button></Link>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-foreground font-medium">Você ainda não tem favoritos</p>
            <p className="text-sm text-muted-foreground">Toque no coração de qualquer evento para salvar aqui.</p>
            <Link to="/"><Button variant="outline" className="rounded-full mt-2">Explorar eventos</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {events.map((event) => (
              <Link key={event.id} to={`/event/${event.id}`} className="group block">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
                  <img
                    src={event.image_url || getBannerForCategory(event.category)}
                    alt={event.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="pt-3 space-y-0.5">
                  <h3 className="text-[15px] font-semibold text-foreground line-clamp-1">{event.name}</h3>
                  <p className="text-[13px] text-muted-foreground line-clamp-1">{event.venue} · {event.city}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
