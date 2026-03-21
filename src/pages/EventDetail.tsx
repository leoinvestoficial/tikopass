import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { fetchTicketsByEvent, fetchEventById, createNegotiation, type Event } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, MapPin, Tag, TrendingDown, MessageSquare, ArrowLeft,
  Clock, Loader2, Star, ArrowUpDown, User, ShieldCheck,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type SortOption = "price_asc" | "price_desc" | "rating_desc";

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [negotiating, setNegotiating] = useState<string | null>(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState<SortOption>("price_asc");

  const headerReveal = useScrollReveal<HTMLDivElement>();
  const ticketsReveal = useScrollReveal<HTMLDivElement>();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ev, tix] = await Promise.all([
        fetchEventById(eventId!),
        fetchTicketsByEvent(eventId!),
      ]);
      setEvent(ev);
      setTickets(tix || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sortedTickets = useMemo(() => {
    const sorted = [...tickets];
    switch (sort) {
      case "price_asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "rating_desc":
        sorted.sort((a, b) => (b.seller_avg_rating || 0) - (a.seller_avg_rating || 0));
        break;
    }
    return sorted;
  }, [tickets, sort]);

  const handleNegotiate = async (ticket: any) => {
    if (!user) {
      toast.error("Faça login para negociar");
      navigate("/auth");
      return;
    }
    if (user.id === ticket.seller_id) {
      toast.error("Você não pode negociar seu próprio ingresso");
      return;
    }
    setNegotiating(ticket.id);
    setOfferPrice(String(ticket.price));
  };

  const submitOffer = async () => {
    if (!negotiating || !user) return;
    const ticket = tickets.find((t) => t.id === negotiating);
    if (!ticket) return;

    setSubmitting(true);
    try {
      await createNegotiation({
        ticket_id: ticket.id,
        buyer_id: user.id,
        seller_id: ticket.seller_id,
        offer_price: parseFloat(offerPrice),
      });
      toast.success("Oferta enviada! Acompanhe em Negociações.");
      setNegotiating(null);
      navigate("/negotiations");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar oferta");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number | null, count: number) => {
    if (!rating || count === 0) {
      return (
        <span className="text-xs text-muted-foreground">Novo vendedor</span>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-3.5 h-3.5 ${
                star <= Math.round(rating)
                  ? "text-warning fill-warning"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {rating.toFixed(1)} ({count})
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-display font-bold">
              Evento não encontrado
            </h2>
            <Link to="/">
              <Button variant="outline">Voltar para a home</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isPast = new Date(event.date) < new Date(new Date().toISOString().split("T")[0]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Event header */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div
          ref={headerReveal.ref}
          className={`container py-10 ${headerReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary">{event.category}</Badge>
              {isPast && (
                <Badge variant="outline" className="text-muted-foreground border-muted">
                  Evento encerrado
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
              {event.name}
            </h1>
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

      {/* Tickets section */}
      <section className="flex-1">
        <div
          ref={ticketsReveal.ref}
          className={`container py-10 ${ticketsReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
          style={{ animationDelay: "150ms" }}
        >
          {/* Sort bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                {sortedTickets.length} ingresso{sortedTickets.length !== 1 ? "s" : ""} disponíve
                {sortedTickets.length !== 1 ? "is" : "l"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                Pagamento protegido pela plataforma
              </p>
            </div>
            {sortedTickets.length > 0 && (
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                  <SelectTrigger className="w-[200px] rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_asc">Menor preço</SelectItem>
                    <SelectItem value="price_desc">Maior preço</SelectItem>
                    <SelectItem value="rating_desc">Melhor avaliação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {sortedTickets.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Tag className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg">
                Nenhum ingresso à venda
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Nenhum ingresso disponível para este evento no momento. Que tal ser o primeiro a vender?
              </p>
              <Link to="/sell">
                <Button className="rounded-xl mt-2">Vender ingresso</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTickets.map((ticket: any) => {
                const isBelow =
                  ticket.original_price && ticket.price < ticket.original_price;
                const discount = ticket.original_price
                  ? Math.round(
                      ((ticket.original_price - ticket.price) /
                        ticket.original_price) *
                        100
                    )
                  : 0;
                const sellerName =
                  ticket.seller_profile?.display_name || "Vendedor";

                return (
                  <div
                    key={ticket.id}
                    className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Seller info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-foreground text-sm block truncate">
                            {sellerName}
                          </span>
                          {renderStars(
                            ticket.seller_avg_rating,
                            ticket.seller_rating_count
                          )}
                        </div>
                      </div>

                      {/* Ticket details */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {ticket.sector}
                          </Badge>
                          {ticket.row && ticket.row !== "-" && (
                            <span className="text-xs text-muted-foreground">
                              Fil. {ticket.row}
                              {ticket.seat ? ` · Ass. ${ticket.seat}` : ""}
                            </span>
                          )}
                        </div>
                        {isBelow && (
                          <Badge className="bg-success/10 text-success border-success/20 text-xs gap-1">
                            <TrendingDown className="w-3 h-3" />-{discount}%
                          </Badge>
                        )}
                      </div>

                      {/* Price + action */}
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-right">
                          {ticket.original_price && (
                            <span className="text-xs text-muted-foreground line-through block">
                              R$ {ticket.original_price.toLocaleString("pt-BR")}
                            </span>
                          )}
                          <span className="font-display font-bold text-2xl text-foreground">
                            R${" "}
                            {ticket.price.toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <Button
                          className="gap-2 rounded-xl shrink-0"
                          onClick={() => handleNegotiate(ticket)}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Negociar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Negotiate dialog */}
      <Dialog
        open={!!negotiating}
        onOpenChange={(open) => !open && setNegotiating(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Fazer oferta</DialogTitle>
          </DialogHeader>
          {negotiating && (() => {
            const ticket = tickets.find((t) => t.id === negotiating);
            if (!ticket) return null;
            const sellerName = ticket.seller_profile?.display_name || "Vendedor";
            return (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground block">{sellerName}</span>
                    <span className="text-xs text-muted-foreground">{ticket.sector}{ticket.row ? ` · Fil. ${ticket.row}` : ""}</span>
                  </div>
                  <span className="ml-auto font-display font-bold text-foreground">
                    R$ {ticket.price.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sua oferta (R$)</label>
                  <Input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="rounded-xl"
                    placeholder="Digite o valor da sua oferta"
                  />
                  <p className="text-xs text-muted-foreground">
                    O vendedor poderá aceitar, recusar ou contra-propor.
                  </p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNegotiating(null)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={submitOffer}
              disabled={submitting || !offerPrice}
              className="rounded-xl gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
              {submitting ? "Enviando..." : "Enviar oferta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
