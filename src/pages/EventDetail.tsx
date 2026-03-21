import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchTicketsByEvent, fetchEventById, createNegotiation, type Event } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Tag, TrendingDown, MessageSquare, ArrowLeft, Clock, Loader2 } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [negotiating, setNegotiating] = useState<string | null>(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setTickets(tix);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNegotiate = async (ticket: any) => {
    if (!user) { toast.error("Faça login para negociar"); navigate("/auth"); return; }
    if (user.id === ticket.seller_id) { toast.error("Você não pode negociar seu próprio ingresso"); return; }
    setNegotiating(ticket.id);
    setOfferPrice(String(ticket.price));
  };

  const submitOffer = async () => {
    if (!negotiating || !user) return;
    const ticket = tickets.find(t => t.id === negotiating);
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
            <h2 className="text-2xl font-display font-bold">Evento não encontrado</h2>
            <Link to="/"><Button variant="outline">Voltar para a home</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div ref={headerReveal.ref} className={`container py-10 ${headerReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="space-y-4">
            <Badge variant="secondary">{event.category}</Badge>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{event.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{new Date(event.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{event.time}</div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{event.venue} · {event.city}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex-1">
        <div ref={ticketsReveal.ref} className={`container py-10 ${ticketsReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`} style={{ animationDelay: "150ms" }}>
          <h2 className="text-xl font-display font-semibold mb-6">
            {tickets.length} ingresso{tickets.length !== 1 ? "s" : ""} disponíve{tickets.length !== 1 ? "is" : "l"}
          </h2>

          {tickets.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-muted-foreground">Nenhum ingresso à venda para este evento.</p>
              <Link to="/sell"><Button className="rounded-xl">Vender ingresso</Button></Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket: any) => {
                const isBelow = ticket.original_price && ticket.price < ticket.original_price;
                const discount = ticket.original_price ? Math.round(((ticket.original_price - ticket.price) / ticket.original_price) * 100) : 0;
                return (
                  <div key={ticket.id} className="bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow duration-300">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-semibold text-foreground">{ticket.sector}</span>
                        {ticket.row && <span className="text-sm text-muted-foreground">Fileira {ticket.row} · Assento {ticket.seat}</span>}
                        {isBelow && (
                          <Badge className="bg-success/10 text-success border-success/20 text-xs gap-1">
                            <TrendingDown className="w-3 h-3" />-{discount}% abaixo
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {ticket.original_price && <span className="text-xs text-muted-foreground line-through block">R$ {ticket.original_price.toLocaleString("pt-BR")}</span>}
                        <span className="font-display font-bold text-2xl text-foreground">R$ {ticket.price.toLocaleString("pt-BR")}</span>
                      </div>
                      <Button className="gap-2 rounded-xl" onClick={() => handleNegotiate(ticket)}>
                        <MessageSquare className="w-4 h-4" /> Negociar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Negotiate dialog */}
      <Dialog open={!!negotiating} onOpenChange={(open) => !open && setNegotiating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Fazer oferta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor da oferta (R$)</label>
              <Input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiating(null)} className="rounded-xl">Cancelar</Button>
            <Button onClick={submitOffer} disabled={submitting || !offerPrice} className="rounded-xl gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              {submitting ? "Enviando..." : "Enviar oferta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
