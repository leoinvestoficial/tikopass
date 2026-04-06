import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SellerLevelBadge, { getSellerLevel } from "@/components/SellerLevelBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { createNegotiation, deleteTicket, sendMessage, updateTicket } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  ShieldCheck,
  Star,
  Tag,
  Trash2,
  User,
} from "lucide-react";

type TicketRecord = Tables<"tickets"> & {
  events: Tables<"events"> | null;
  seller_profile: Tables<"profiles"> | null;
  seller_avg_rating: number | null;
  seller_rating_count: number;
  seller_sales_count: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<TicketRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({ sector: "", row: "", seat: "", price: "" });

  // Removed scroll reveal - content should always be visible on detail pages

  useEffect(() => {
    if (ticketId) {
      void loadTicket();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    if (!ticketId) return;

    setLoading(true);
    try {
      const { data: ticketData, error } = await supabase
        .from("tickets")
        .select("*, events(*)")
        .eq("id", ticketId)
        .single();

      if (error) throw error;

      const sellerId = ticketData.seller_id;
      const [profileRes, ratingsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", sellerId).maybeSingle(),
        supabase.from("seller_ratings" as never).select("rating").eq("seller_id", sellerId),
      ]);

      const ratings = (ratingsRes.data || []) as Array<{ rating: number }>;
      const sellerAvgRating = ratings.length > 0
        ? ratings.reduce((sum, entry) => sum + entry.rating, 0) / ratings.length
        : null;

      setTicket({
        ...(ticketData as Tables<"tickets"> & { events: Tables<"events"> | null }),
        seller_profile: profileRes.data ?? null,
        seller_avg_rating: sellerAvgRating,
        seller_rating_count: ratings.length,
      });
    } catch (error) {
      console.error(error);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const isPastEvent = useMemo(() => {
    if (!ticket?.events?.date) return false;
    return ticket.events.date < new Date().toISOString().split("T")[0];
  }, [ticket]);

  const isOwner = user?.id === ticket?.seller_id;
  const isAvailable = ticket?.status === "available" && !isPastEvent;

  const ensureSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Sua sessão expirou. Faça login novamente.");
      navigate("/auth");
      return false;
    }
    return true;
  };

  const openNegotiationDialog = () => {
    if (!ticket) return;
    setOfferPrice(String(ticket.price));
    setInitialMessage(`Olá! Tenho interesse no ingresso ${ticket.sector}.`);
    setNegotiationOpen(true);
  };

  const startNegotiation = async (price: number, messageText?: string) => {
    if (!ticket || !user) return;

    if (isOwner) {
      toast.error("Você não pode negociar seu próprio ingresso.");
      return;
    }

    if (!isAvailable) {
      toast.error("Este anúncio não está disponível no momento.");
      return;
    }

    if (!(await ensureSession())) return;

    setSubmitting(true);
    try {
      const negotiation = await createNegotiation({
        ticket_id: ticket.id,
        buyer_id: user.id,
        seller_id: ticket.seller_id,
        offer_price: price,
      });

      if (messageText?.trim()) {
        await sendMessage({
          negotiation_id: negotiation.id,
          sender_id: user.id,
          content: messageText.trim(),
        });
      }

      setNegotiationOpen(false);
      toast.success("Anúncio aberto no chat da negociação.");
      navigate(`/negotiations?negotiation=${negotiation.id}`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao iniciar a negociação.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = () => {
    if (!ticket) return;
    setEditForm({
      sector: ticket.sector,
      row: ticket.row || "",
      seat: ticket.seat || "",
      price: String(ticket.price),
    });
    setEditing(true);
  };

  const handleEditSave = async () => {
    if (!ticket) return;
    if (!(await ensureSession())) return;

    setSubmitting(true);
    try {
      await updateTicket(ticket.id, {
        sector: editForm.sector,
        row: editForm.row || undefined,
        seat: editForm.seat || undefined,
        price: Number(editForm.price),
      });
      toast.success("Anúncio atualizado com sucesso.");
      setEditing(false);
      await loadTicket();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar o anúncio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket) return;
    if (!(await ensureSession())) return;

    setSubmitting(true);
    try {
      await deleteTicket(ticket.id);
      toast.success("Anúncio removido.");
      navigate("/my-tickets");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover o anúncio.");
    } finally {
      setSubmitting(false);
      setDeleting(false);
    }
  };

  const renderSellerRating = () => {
    if (!ticket?.seller_avg_rating || ticket.seller_rating_count === 0) {
      return <span className="text-sm text-muted-foreground">Novo vendedor</span>;
    }

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              className={`h-4 w-4 ${value <= Math.round(ticket.seller_avg_rating || 0) ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
            />
          ))}
        </div>
        <span>
          {ticket.seller_avg_rating.toFixed(1)} ({ticket.seller_rating_count})
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!ticket || !ticket.events) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-display font-bold text-foreground">Anúncio não encontrado</h1>
            <p className="text-muted-foreground">Esse ingresso pode ter sido removido ou não está mais disponível.</p>
            <Link to="/">
              <Button variant="outline" className="rounded-xl">Voltar para a vitrine</Button>
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

      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div
          className="container py-10"
        >
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
            <Badge variant="secondary">Anúncio de ingresso</Badge>
            {!isAvailable && (
              <Badge variant="outline" className="border-muted text-muted-foreground">
                {ticket.status === "sold" ? "Vendido" : isPastEvent ? "Evento encerrado" : "Indisponível"}
              </Badge>
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-start">
            <div className="space-y-5">
              <div className="space-y-3">
                <h1 className="text-3xl font-display font-bold leading-tight text-foreground md:text-4xl">
                  {ticket.events.name}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(ticket.events.date).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {ticket.events.time}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {ticket.events.venue} · {ticket.events.city}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> Setor
                  </span>
                  <p className="text-lg font-display font-semibold text-foreground">{ticket.sector}</p>
                </article>
                <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">Fileira</span>
                  <p className="text-lg font-display font-semibold text-foreground">{ticket.row || "Não informado"}</p>
                </article>
                <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <span className="mb-2 block text-xs uppercase tracking-[0.14em] text-muted-foreground">Assento</span>
                  <p className="text-lg font-display font-semibold text-foreground">{ticket.seat || "Não informado"}</p>
                </article>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Vendedor</p>
                    <Link
                      to={`/seller/${ticket.seller_id}`}
                      className="mt-2 inline-flex items-center gap-3 rounded-xl transition-opacity hover:opacity-80"
                    >
                      <Avatar className="h-12 w-12">
                        {ticket.seller_profile?.avatar_url && <AvatarImage src={ticket.seller_profile.avatar_url} alt={ticket.seller_profile?.display_name || "Vendedor"} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {(ticket.seller_profile?.display_name || "V").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        <span className="block font-medium text-foreground">
                          {ticket.seller_profile?.display_name || "Vendedor"}
                        </span>
                        {renderSellerRating()}
                      </span>
                    </Link>
                  </div>
                  <Badge variant="outline" className="gap-1 border-success/30 text-success">
                    <ShieldCheck className="h-3.5 w-3.5" /> Pagamento protegido
                  </Badge>
                </div>

                <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="font-medium text-foreground">Fluxo seguro</p>
                    <p className="mt-1">A conversa começa no chat e o pagamento só aparece quando a oferta for aceita.</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="font-medium text-foreground">Detalhes do anúncio</p>
                    <p className="mt-1">Você está vendo este ingresso específico, não apenas a página geral do evento.</p>
                  </div>
                </div>
              </div>
            </div>

            <aside
              className="rounded-[28px] border border-border bg-card p-6 shadow-lg shadow-primary/5"
              style={{ animationDelay: "120ms" }}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Preço do anúncio</p>
              <div className="mt-3 space-y-1">
                {ticket.original_price && (
                  <p className="text-sm text-muted-foreground line-through">
                    {currencyFormatter.format(Number(ticket.original_price))}
                  </p>
                )}
                <p className="text-4xl font-display font-bold leading-none text-foreground">
                  {currencyFormatter.format(Number(ticket.price))}
                </p>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {isOwner
                  ? "Este anúncio é seu. Você pode editar os dados ou remover o ingresso daqui."
                  : "Comprar pelo valor anunciado abre a conversa no chat com a oferta pronta para o vendedor responder."}
              </p>

              <div className="mt-6 space-y-3">
                {isOwner ? (
                  <>
                    <Button className="w-full rounded-xl gap-2" onClick={handleEditOpen} disabled={ticket.status !== "available" || submitting}>
                      <Pencil className="h-4 w-4" /> Editar anúncio
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl gap-2 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(true)}
                      disabled={submitting}
                    >
                      <Trash2 className="h-4 w-4" /> Remover anúncio
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="w-full rounded-xl gap-2"
                      onClick={() => startNegotiation(Number(ticket.price), `Olá! Quero comprar este ingresso pelo valor anunciado de ${currencyFormatter.format(Number(ticket.price))}.`)}
                      disabled={!isAvailable || submitting}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Comprar pelo valor anunciado
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl gap-2"
                      onClick={openNegotiationDialog}
                      disabled={!isAvailable || submitting}
                    >
                      <MessageSquare className="h-4 w-4" /> Negociar no chat
                    </Button>
                  </>
                )}

                <Link to={`/event/${ticket.events.id}`} className="block">
                  <Button variant="ghost" className="w-full rounded-xl">Ver todos os ingressos do evento</Button>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Dialog open={negotiationOpen} onOpenChange={(open) => !submitting && setNegotiationOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Negociar ingresso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-muted/40 p-4">
              <p className="font-medium text-foreground">{ticket.events.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{ticket.sector} · valor anunciado {currencyFormatter.format(Number(ticket.price))}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-price">Sua oferta</Label>
              <Input
                id="offer-price"
                type="number"
                value={offerPrice}
                onChange={(event) => setOfferPrice(event.target.value)}
                className="rounded-xl"
                placeholder="Digite sua oferta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial-message">Mensagem inicial</Label>
              <Input
                id="initial-message"
                value={initialMessage}
                onChange={(event) => setInitialMessage(event.target.value)}
                className="rounded-xl"
                placeholder="Ex.: Tenho interesse e posso pagar hoje"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setNegotiationOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl gap-2"
              onClick={() => startNegotiation(Number(offerPrice), initialMessage)}
              disabled={submitting || !offerPrice || Number(offerPrice) <= 0}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Abrir chat da oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editing} onOpenChange={(open) => !submitting && setEditing(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Editar anúncio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-sector">Setor</Label>
                <Input id="edit-sector" value={editForm.sector} onChange={(event) => setEditForm({ ...editForm, sector: event.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Preço</Label>
                <Input id="edit-price" type="number" value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-row">Fileira</Label>
                <Input id="edit-row" value={editForm.row} onChange={(event) => setEditForm({ ...editForm, row: event.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-seat">Assento</Label>
                <Input id="edit-seat" value={editForm.seat} onChange={(event) => setEditForm({ ...editForm, seat: event.target.value })} className="rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button className="rounded-xl gap-2" onClick={handleEditSave} disabled={submitting || !editForm.sector || !editForm.price}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={(open) => !submitting && setDeleting(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Remover anúncio</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            Tem certeza que deseja remover este ingresso? Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleting(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" className="rounded-xl gap-2" onClick={handleDelete} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}