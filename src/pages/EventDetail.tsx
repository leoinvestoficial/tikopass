import { useParams, Link } from "react-router-dom";
import { MOCK_TICKETS } from "@/data/mock-data";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Tag, TrendingDown, MessageSquare, ArrowLeft, Clock } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export default function EventDetail() {
  const { eventId } = useParams();
  const eventTickets = MOCK_TICKETS.filter((t) => t.eventId === eventId);
  const event = eventTickets[0]?.event;

  const headerReveal = useScrollReveal<HTMLDivElement>();
  const ticketsReveal = useScrollReveal<HTMLDivElement>();

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-display font-bold">Evento não encontrado</h2>
            <Link to="/">
              <Button variant="outline">Voltar para a home</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Event header */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div
          ref={headerReveal.ref}
          className={`container py-10 ${headerReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
        >
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="space-y-4">
            <Badge variant="secondary">{event.category}</Badge>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{event.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(event.date).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {event.time}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {event.venue} · {event.city}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available tickets */}
      <section className="flex-1">
        <div
          ref={ticketsReveal.ref}
          className={`container py-10 ${ticketsReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
          style={{ animationDelay: "150ms" }}
        >
          <h2 className="text-xl font-display font-semibold mb-6">
            {eventTickets.length} ingresso{eventTickets.length !== 1 ? "s" : ""} disponíve{eventTickets.length !== 1 ? "is" : "l"}
          </h2>

          <div className="space-y-4">
            {eventTickets.map((ticket) => {
              const isBelow = ticket.originalPrice && ticket.price < ticket.originalPrice;
              const discount = ticket.originalPrice
                ? Math.round(((ticket.originalPrice - ticket.price) / ticket.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={ticket.id}
                  className="bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-semibold text-foreground">{ticket.sector}</span>
                      {ticket.row !== "-" && (
                        <span className="text-sm text-muted-foreground">
                          Fileira {ticket.row} · Assento {ticket.seat}
                        </span>
                      )}
                      {ticket.row === "-" && (
                        <span className="text-sm text-muted-foreground">{ticket.seat}</span>
                      )}
                      {isBelow && (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs gap-1">
                          <TrendingDown className="w-3 h-3" />
                          -{discount}% abaixo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="w-3.5 h-3.5" />
                      Vendido por {ticket.sellerName}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {ticket.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through block">
                          R$ {ticket.originalPrice.toLocaleString("pt-BR")}
                        </span>
                      )}
                      <span className="font-display font-bold text-2xl text-foreground">
                        R$ {ticket.price.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <Button className="gap-2 rounded-xl">
                      <MessageSquare className="w-4 h-4" />
                      Negociar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
