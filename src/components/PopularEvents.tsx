import { Flame, Calendar, MapPin, ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const popularEvents = [
  {
    name: "Retronejo Salvador",
    venue: "Casa Pia",
    city: "Salvador",
    date: "Próxima edição em breve",
    category: "Shows",
    hot: true,
  },
  {
    name: "João Gomes",
    venue: "Mali",
    city: "Salvador",
    date: "2025",
    category: "Shows",
    hot: true,
  },
  {
    name: "Réveillon Destino",
    venue: "Praia do Forte",
    city: "Praia do Forte",
    date: "Dez 2025",
    category: "Festivais",
    hot: false,
  },
  {
    name: "Ba-Vi — Campeonato Baiano",
    venue: "Arena Fonte Nova",
    city: "Salvador",
    date: "Temporada 2025",
    category: "Esportes",
    hot: false,
  },
  {
    name: "Festival de Verão",
    venue: "Parque de Exposições",
    city: "Salvador",
    date: "Jan 2026",
    category: "Festivais",
    hot: true,
  },
  {
    name: "Wesley Safadão",
    venue: "A confirmar",
    city: "Salvador",
    date: "2025",
    category: "Shows",
    hot: false,
  },
];

export default function PopularEvents() {
  const reveal = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div
        ref={reveal.ref}
        className={`container ${reveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
      >
        <div className="flex items-end justify-between mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Eventos mais procurados
              </h2>
            </div>
            <p className="text-muted-foreground">
              Os eventos que estão bombando em Salvador e região
            </p>
          </div>
          <Link to="/sell" className="hidden sm:block">
            <Button variant="ghost" className="gap-2 text-sm text-muted-foreground hover:text-foreground">
              Não encontrou? Anuncie
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularEvents.map((event, i) => (
            <button
              key={event.name}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("search", event.name);
                window.location.href = `/?search=${encodeURIComponent(event.name)}`;
              }}
              className="group relative text-left bg-card border border-border rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {event.hot && (
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Flame className="w-3 h-3" />
                  Em alta
                </div>
              )}
              <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors mb-3 pr-16">
                {event.name}
              </h3>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{event.venue} · {event.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{event.date}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs font-medium text-primary group-hover:underline">
                  Ver ingressos disponíveis →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="sm:hidden mt-6 text-center">
          <Link to="/sell">
            <Button variant="outline" className="gap-2 rounded-xl">
              Não encontrou? Anuncie
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
