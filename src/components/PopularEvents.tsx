import { Calendar, MapPin, ArrowRight, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getBannerForCategory } from "@/lib/event-banners";
import HorizontalCarousel from "@/components/HorizontalCarousel";

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
  return (
    <section className="py-12 md:py-20">
      <div className="container animate-fade-in">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              Eventos em destaque
            </h2>
            <p className="text-sm text-muted-foreground">
              Os shows com mais ingressos disponíveis agora
            </p>
          </div>
          <Link to="/sell" className="hidden sm:block">
            <Button variant="ghost" className="gap-2 text-sm text-muted-foreground hover:text-foreground rounded-full">
              Anunciar
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {events.length > 0 ? (
          <HorizontalCarousel className="-mx-4 px-4 pb-2">
            {events.map((event, i) => (
              <Link
                key={event.id}
                to={`/event/${event.id}`}
                className="group block snap-start shrink-0 w-[70%] sm:w-[45%] md:w-[31%] lg:w-[23%]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
                  <img
                    src={getBannerForCategory(event.category)}
                    alt={event.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-card/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                    <Ticket className="w-3 h-3" />
                    {event.ticketCount} {event.ticketCount > 1 ? "ofertas" : "oferta"}
                  </span>
                </div>
                <div className="pt-3 space-y-0.5">
                  <h3 className="text-[15px] font-semibold text-foreground line-clamp-1">
                    {event.name}
                  </h3>
                  <p className="text-[13px] text-muted-foreground line-clamp-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" /> {event.venue} · {event.city}
                  </p>
                  <p className="text-[13px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3 shrink-0" />
                    {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </Link>
            ))}
          </HorizontalCarousel>
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
