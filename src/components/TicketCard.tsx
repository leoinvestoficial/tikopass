import { Link } from "react-router-dom";
import { MapPin, Calendar, Tag, TrendingDown, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SellerLevelBadge, { getSellerLevel } from "@/components/SellerLevelBadge";
import { getBannerForCategory } from "@/lib/event-banners";

interface TicketCardEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  category: string;
  image_url?: string | null;
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
    seller_avg_rating?: number | null;
    seller_rating_count?: number;
    seller_sales_count?: number;
  };
  index?: number;
}

export default function TicketCard({ ticket, index = 0 }: TicketCardProps) {
  const event = ticket.event || ticket.events;
  const origPrice = ticket.original_price ?? ticket.originalPrice;
  const isBelow = origPrice && ticket.price < origPrice;
  const discount = origPrice ? Math.round(((origPrice - ticket.price) / origPrice) * 100) : 0;
  const isPast = event ? new Date(event.date) < new Date(new Date().toISOString().split("T")[0]) : false;

  if (!event) return null;

  const bannerSrc = event.image_url || getBannerForCategory(event.category);

  return (
    <Link
      to={`/ticket/${ticket.id}`}
      className="group block"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98]">
        {/* Banner image */}
        <div className="relative h-28 md:h-40 overflow-hidden">
          <img
            src={bannerSrc}
            alt={event.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isPast ? "grayscale" : ""}`}
            loading="lazy"
            width={400}
            height={160}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 md:bottom-3 md:left-3 md:right-3">
            <h3 className="font-display font-semibold text-white leading-tight line-clamp-2 drop-shadow-md text-xs md:text-sm">
              {event.name}
            </h3>
          </div>
          {isBelow && (
            <Badge className="absolute top-2 right-2 md:top-3 md:right-3 bg-success/90 text-white border-0 text-[10px] md:text-xs font-medium gap-0.5 md:gap-1 backdrop-blur-sm px-1.5 md:px-2">
              <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3" />
              -{discount}%
            </Badge>
          )}
          {isPast && (
            <Badge className="absolute top-2 left-2 md:top-3 md:left-3 bg-black/60 text-white border-0 text-[10px] backdrop-blur-sm">
              Encerrado
            </Badge>
          )}
        </div>

        <div className="p-2.5 md:p-4 space-y-2 md:space-y-3">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5">
              {event.category}
            </Badge>
          </div>

          <div className="space-y-0.5 md:space-y-1 text-[11px] md:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
              <span className="truncate">
                {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                {" · "}{event.time}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>{ticket.sector} {ticket.row && ticket.row !== "-" ? `· Fil. ${ticket.row}` : ""}</span>
            </div>
          </div>

          <div className="flex items-end justify-between pt-1.5 md:pt-2 border-t border-border">
            <div className="space-y-0">
              {origPrice && (
                <span className="text-[10px] text-muted-foreground line-through block">
                  R$ {origPrice.toLocaleString("pt-BR")}
                </span>
              )}
              <span className="font-display font-bold text-base md:text-xl text-foreground">
                R$ {ticket.price.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              {ticket.seller_avg_rating != null && (ticket.seller_rating_count || 0) > 0 && (
                <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Star className="w-2.5 h-2.5 fill-warning text-warning" />
                  <span>{ticket.seller_avg_rating.toFixed(1)}</span>
                </div>
              )}
              <SellerLevelBadge
                level={getSellerLevel(ticket.seller_sales_count || 0, ticket.seller_avg_rating ?? null)}
                compact
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
