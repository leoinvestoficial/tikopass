import { Link } from "react-router-dom";
import { Ticket as TicketType } from "@/data/mock-data";
import { MapPin, Calendar, Tag, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TicketCardProps {
  ticket: TicketType;
  index?: number;
}

export default function TicketCard({ ticket, index = 0 }: TicketCardProps) {
  const isBelow = ticket.originalPrice && ticket.price < ticket.originalPrice;
  const discount = ticket.originalPrice
    ? Math.round(((ticket.originalPrice - ticket.price) / ticket.originalPrice) * 100)
    : 0;

  return (
    <Link
      to={`/event/${ticket.eventId}`}
      className="group block"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98]">
        {/* Color bar */}
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />

        <div className="p-5 space-y-4">
          {/* Event name + category */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {ticket.event.name}
              </h3>
              {isBelow && (
                <Badge className="shrink-0 bg-success/10 text-success border-success/20 text-xs font-medium gap-1">
                  <TrendingDown className="w-3 h-3" />
                  -{discount}%
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-xs font-medium">
              {ticket.event.category}
            </Badge>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                {new Date(ticket.event.date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
                {" · "}
                {ticket.event.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ticket.event.venue} · {ticket.event.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>{ticket.sector} {ticket.row !== "-" ? `· Fil. ${ticket.row} · Ass. ${ticket.seat}` : `· ${ticket.seat}`}</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between pt-2 border-t border-border">
            <div>
              {ticket.originalPrice && (
                <span className="text-xs text-muted-foreground line-through block">
                  R$ {ticket.originalPrice.toLocaleString("pt-BR")}
                </span>
              )}
              <span className="font-display font-bold text-xl text-foreground">
                R$ {ticket.price.toLocaleString("pt-BR")}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              por {ticket.sellerName}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
