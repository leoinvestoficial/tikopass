import { Link } from "react-router-dom";
import { TrendingDown, Star } from "lucide-react";
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
  const dateLabel = new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <Link
      to={`/ticket/${ticket.id}`}
      className="group block"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image — 4:3 rounded, no border */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
        <img
          src={bannerSrc}
          alt={event.name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${isPast ? "grayscale" : ""}`}
          loading="lazy"
        />
        {isBelow && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-card/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
            <TrendingDown className="w-3 h-3 text-success" /> -{discount}%
          </span>
        )}
        {isPast && (
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-card/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
            Encerrado
          </span>
        )}
        {ticket.seller_avg_rating != null && (ticket.seller_rating_count || 0) > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-card/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
            <Star className="w-3 h-3 fill-foreground" /> {ticket.seller_avg_rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Info — minimal, tight typography */}
      <div className="pt-3 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-1">
            {event.name}
          </h3>
          <SellerLevelBadge
            level={getSellerLevel(ticket.seller_sales_count || 0, ticket.seller_avg_rating ?? null)}
            compact
          />
        </div>
        <p className="text-[13px] text-muted-foreground line-clamp-1">
          {event.venue} · {event.city}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {dateLabel} · {event.time}
        </p>
        <p className="pt-1 text-[14px] text-foreground">
          <span className="font-semibold">R$ {ticket.price.toLocaleString("pt-BR")}</span>
          {origPrice && (
            <span className="ml-1.5 text-muted-foreground line-through text-[12px]">
              R$ {origPrice.toLocaleString("pt-BR")}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
