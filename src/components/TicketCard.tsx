import { Link } from "react-router-dom";
import { MapPin, Calendar, Tag, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TicketCardEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  category: string;
}

interface TicketCardProps {
  ticket: {
    id: string;
    event_id?: string;
    eventId?: string;
    price: number;
    original_price?: number | null;
    originalPrice?: number;
    sector: string;
    row?: string | null;
    seat?: string | null;
    sellerName?: string;
    event?: TicketCardEvent;
    events?: TicketCardEvent;
  };
  index?: number;
}

export default function TicketCard({ ticket, index = 0 }: TicketCardProps) {
  const event = ticket.event || ticket.events;
  const eventId = ticket.event_id || ticket.eventId || event?.id;
  const origPrice = ticket.original_price ?? ticket.originalPrice;
  const isBelow = origPrice && ticket.price < origPrice;
  const discount = origPrice ? Math.round(((origPrice - ticket.price) / origPrice) * 100) : 0;
  const isPast = event ? new Date(event.date) < new Date(new Date().toISOString().split("T")[0]) : false;

  if (!event) return null;

  return (
    <Link
      to={`/event/${eventId}`}
      className="group block"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98]">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {event.name}
              </h3>
              {isBelow && (
                <Badge className="shrink-0 bg-success/10 text-success border-success/20 text-xs font-medium gap-1">
                  <TrendingDown className="w-3 h-3" />
                  -{discount}%
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-xs font-medium">
              {event.category}
            </Badge>
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                {" · "}{event.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{event.venue} · {event.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>{ticket.sector} {ticket.row && ticket.row !== "-" ? `· Fil. ${ticket.row} · Ass. ${ticket.seat}` : ticket.seat ? `· ${ticket.seat}` : ""}</span>
            </div>
          </div>

          <div className="flex items-end justify-between pt-2 border-t border-border">
            <div>
              {origPrice && (
                <span className="text-xs text-muted-foreground line-through block">
                  R$ {origPrice.toLocaleString("pt-BR")}
                </span>
              )}
              <span className="font-display font-bold text-xl text-foreground">
                R$ {ticket.price.toLocaleString("pt-BR")}
              </span>
            </div>
            {ticket.sellerName && (
              <span className="text-xs text-muted-foreground">
                por {ticket.sellerName}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
