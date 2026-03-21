import { Flame, Calendar, MapPin, ArrowRight, Ticket } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export type PopularEventItem = {
  id: string;
  name: string;
  venue: string;
  city: string;
  date: string;
  category: string;
  ticketCount: number;
};

interface PopularEventsProps {
  events: PopularEventItem[];
}

export default function PopularEvents({ events }: PopularEventsProps) {
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
              Abra a página do evento e veja todos os ingressos disponíveis
            </p>
          </div>
          <Link to="/sell" className="hidden sm:block">
            <Button variant="ghost" className="gap-2 text-sm text-muted-foreground hover:text-foreground">
              Não encontrou? Anuncie
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event, i) => (
              <Link
                key={event.id}
                to={`/event/${event.id}`}
                className="group relative block bg-card border border-border rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Ticket className="w-3 h-3" />
                  {event.ticketCount} anúncio{event.ticketCount > 1 ? "s" : ""}
                </div>

                <div className="mb-3 pr-20">
                  <p className="text-xs font-medium text-primary mb-1">{event.category}</p>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                    {event.name}
                  </h3>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{event.venue} · {event.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {new Date(event.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
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
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Ticket className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-foreground">
              Ainda não há eventos em destaque
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Assim que surgirem anúncios, os eventos vão aparecer aqui com link direto para a página de ingressos.
            </p>
          </div>
        )}

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
