import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyTickets } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import GuaranteeBadge from "@/components/GuaranteeBadge";
import {
  Ticket, Loader2, Calendar, MapPin, Tag, ArrowRight, Clock, Eye, ShoppingBag, Store,
  CheckCircle2, XCircle, AlertCircle, Shield, Trash2, Ban, Star, Send, AlertTriangle,
} from "lucide-react";

type ValidationCheck = { id: string; label: string; passed: boolean; detail: string };

function ValidationChecklist({ checks }: { checks: ValidationCheck[] }) {
  if (!checks || checks.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5 bg-muted/50 rounded-lg p-3">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
        <Shield className="w-3.5 h-3.5" /> Diagnóstico da validação
      </p>
      {checks.map((check) => (
        <div key={check.id} className="flex items-start gap-2 text-xs">
          {check.passed ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-medium">{check.label}</span>
            <span className="text-muted-foreground ml-1">— {check.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SellingTicketCard({ ticket, today, onDelete }: { ticket: any; today: string; onDelete?: (id: string) => void }) {
  const event = ticket.events;
  if (!event) return null;
  const isPast = event.date < today;
  const isRejected = ticket.status === "rejected";
  const statusLabels: Record<string, { label: string; className: string }> = {
    available: { label: "Disponível", className: "bg-success/10 text-success border-success/20" },
    validated: { label: "Validado", className: "bg-success/10 text-success border-success/20" },
    pending_validation: { label: "Validando...", className: "bg-warning/10 text-warning border-warning/20 animate-pulse" },
    sold: { label: "Vendido", className: "bg-primary/10 text-primary border-primary/20" },
    completed: { label: "Concluído", className: "bg-muted text-muted-foreground border-muted" },
    rejected: { label: "Rejeitado", className: "bg-destructive/10 text-destructive border-destructive/20" },
    expired: { label: "Expirado", className: "bg-muted text-muted-foreground border-muted" },
  };
  const displayStatus = isRejected ? "rejected" : isPast ? "expired" : ticket.status;
  const st = statusLabels[displayStatus] || statusLabels.available;
  const checks = (ticket.validation_checks || []) as ValidationCheck[];

  return (
    <div className={`bg-card rounded-xl border border-border p-5 transition-all duration-300 hover:shadow-md ${isRejected ? "opacity-50 grayscale" : isPast ? "opacity-75" : ""}`}>
      <Link to={`/event/${ticket.event_id}`} className="block group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{event.name}</h3>
              <Badge className={`text-xs ${st.className}`}>{st.label}</Badge>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {event.time}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.venue}</span>
              <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{ticket.sector}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="font-display font-bold text-xl text-foreground">R$ {ticket.price.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </Link>

      {ticket.status === "pending_validation" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-warning bg-warning/5 rounded-lg px-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Validação em andamento... Isso pode levar alguns segundos.
        </div>
      )}

      {isRejected && ticket.rejection_reason && (
        <div className="mt-3 flex items-start gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{ticket.rejection_reason}</span>
        </div>
      )}

      {isRejected && checks.length > 0 && (
        <ValidationChecklist checks={checks} />
      )}

      {isRejected && onDelete && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            className="rounded-xl gap-1.5 text-xs"
            onClick={(e) => { e.preventDefault(); onDelete(ticket.id); }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Remover ingresso
          </Button>
        </div>
      )}
    </div>
  );
}

const transferStatusSteps = [
  { key: "pending_transfer", label: "Aguardando transferência", progress: 25 },
  { key: "transferred", label: "Transferido", progress: 60 },
  { key: "confirmed", label: "Confirmado", progress: 100 },
  { key: "disputed", label: "Em contestação", progress: 60 },
];

function PurchasedTicketCard({
  access,
  transfer,
  onConfirmReceipt,
  onOpenDispute,
  onRate,
  existingRating,
}: {
  access: any;
  transfer: any;
  onConfirmReceipt: (transferId: string) => void;
  onOpenDispute: (transfer: any) => void;
  onRate: (negotiation: any) => void;
  existingRating: boolean;
}) {
  const ticket = access.tickets;
  const event = ticket?.events;
  if (!event) return null;

  const isExpired = access.invalidated_at || new Date(access.expires_at) < new Date();
  const eventDate = new Date(event.date + "T23:59:59Z");
  const contestDeadline = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
  const isPastEvent = new Date() > eventDate;
  const canContest = isPastEvent && new Date() < contestDeadline && transfer?.status !== "disputed";
  const isCompleted = transfer?.status === "confirmed" || (isPastEvent && !canContest && transfer?.status !== "disputed");

  const currentStep = transferStatusSteps.find(s => s.key === transfer?.status) || transferStatusSteps[0];
  const progressValue = transfer?.status === "confirmed" ? 100 : currentStep.progress;

  const handleViewTicket = () => {
    if (access.invalidated_at) return;
    window.open(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-ticket?token=${access.token}`,
      "_blank"
    );
  };

  return (
    <div className={`bg-card rounded-xl border border-border p-5 transition-all ${isExpired && !transfer ? "opacity-60" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-foreground">{event.name}</h3>
            {transfer?.guarantee_level && (
              <GuaranteeBadge level={transfer.guarantee_level} compact />
            )}
            {transfer?.status === "disputed" && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1">
                <AlertTriangle className="w-3 h-3" /> Em contestação
              </Badge>
            )}
            {isCompleted && transfer?.status !== "disputed" && (
              <Badge className="bg-success/10 text-success border-success/20 text-xs gap-1">
                <CheckCircle2 className="w-3 h-3" /> Concluído
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {event.time}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.venue}</span>
            <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{ticket.sector}</span>
          </div>
        </div>
      </div>

      {/* Transfer progress */}
      {transfer && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Status da transferência</span>
            <span className={`font-bold ${transfer.status === "disputed" ? "text-destructive" : transfer.status === "confirmed" ? "text-success" : "text-primary"}`}>
              {currentStep.label}
            </span>
          </div>
          <Progress value={progressValue} className="h-2" />

          {/* Step indicators */}
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className={transfer.status !== "pending_transfer" ? "text-success font-medium" : "text-primary font-medium"}>Pago</span>
            <span className={["transferred", "confirmed"].includes(transfer.status) ? "text-success font-medium" : ""}>Transferido</span>
            <span className={transfer.status === "confirmed" ? "text-success font-medium" : ""}>Confirmado</span>
          </div>
        </div>
      )}

      {/* Ticketeira-specific status banners */}
      {transfer?.status === "pending_transfer" && (() => {
        const slug = (ticket?.detected_ticketeira || "").toLowerCase();
        const releaseRule = ticket?.transfer_level === "amarelo" ? "post_event_24h"
          : slug === "ticket_maker" ? "48h_buffer"
          : "immediate";

        if (slug === "ticketmaster") {
          return (
            <div className="mt-3 bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 text-xs">
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-warning" /> Ingresso da Ticketmaster (Quentro)
              </p>
              <p className="text-muted-foreground">Ingressos da Ticketmaster ficam disponíveis para transferência entre 7 e 30 dias antes do evento. Você receberá uma notificação quando o vendedor transferir pelo app Quentro.</p>
            </div>
          );
        }
        if (releaseRule === "post_event_24h") {
          return (
            <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-xs">
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" /> Ingresso em custódia segura
              </p>
              <p className="text-muted-foreground">Seu ingresso ficou em custódia desde o anúncio. Clique em "Ver ingresso" para baixar. O pagamento ao vendedor é liberado 24h após o evento.</p>
            </div>
          );
        }
        if (releaseRule === "48h_buffer") {
          return (
            <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-xs">
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" /> Transferência via Ticket Maker
              </p>
              <p className="text-muted-foreground">O vendedor irá transferir seu ingresso no site da Ticket Maker. Verifique seu e-mail e confirme aqui quando o ingresso estiver na sua conta.</p>
            </div>
          );
        }
        return (
          <div className="mt-3 bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-xs">
            <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-success" /> Aguardando transferência
            </p>
            <p className="text-muted-foreground">O vendedor foi notificado e fará a transferência diretamente na plataforma de origem. Isso geralmente leva menos de 1 hora.</p>
          </div>
        );
      })()}

      {transfer?.status === "transferred" && (
        <div className="mt-3 bg-success/5 rounded-xl px-4 py-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Ingresso transferido!
          </p>
          {transfer.guarantee_level === "yellow" ? (
            <p>O arquivo do ingresso está disponível. Clique em "Ver ingresso" para acessá-lo.</p>
          ) : (
            <p>Verifique na plataforma de origem se recebeu o ingresso e confirme o recebimento abaixo.</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {!isExpired && (
          <Button className="rounded-xl gap-2 text-xs" size="sm" onClick={handleViewTicket}>
            <Eye className="w-3.5 h-3.5" /> Ver ingresso
          </Button>
        )}

        {transfer?.status === "transferred" && (
          <Button
            className="rounded-xl gap-2 text-xs bg-success hover:bg-success/90 text-white"
            size="sm"
            onClick={() => onConfirmReceipt(transfer.id)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar recebimento
          </Button>
        )}

        {canContest && (
          <Button
            variant="outline"
            className="rounded-xl gap-2 text-xs text-destructive hover:text-destructive"
            size="sm"
            onClick={() => onOpenDispute(transfer)}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Abrir contestação
          </Button>
        )}

        {isPastEvent && canContest && (
          <p className="w-full text-[10px] text-muted-foreground mt-1">
            <Clock className="w-3 h-3 inline mr-1" />
            Prazo para contestação: {contestDeadline.toLocaleDateString("pt-BR")} às {contestDeadline.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        {isCompleted && !existingRating && transfer?.status !== "disputed" && (
          <Button
            variant="outline"
            className="rounded-xl gap-2 text-xs"
            size="sm"
            onClick={() => onRate(transfer)}
          >
            <Star className="w-3.5 h-3.5" /> Avaliar vendedor
          </Button>
        )}

        {isExpired && !transfer && (
          <Button variant="outline" className="rounded-xl text-xs" size="sm" disabled>
            Acesso encerrado
          </Button>
        )}
      </div>
    </div>
  );
}

export default function MyTicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sellingTickets, setSellingTickets] = useState<any[]>([]);
  const [purchasedTickets, setPurchasedTickets] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [existingRatings, setExistingRatings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"selling" | "rejected" | "purchased">("selling");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Dispute dialog
  const [disputeDialog, setDisputeDialog] = useState(false);
  const [disputeTransfer, setDisputeTransfer] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Rating dialog
  const [ratingDialog, setRatingDialog] = useState(false);
  const [ratingTransfer, setRatingTransfer] = useState<any>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadData();
  }, [user]);

  useEffect(() => {
    const hasPending = sellingTickets.some(t => t.status === "pending_validation");
    if (!hasPending || !user) return;
    const interval = setInterval(async () => {
      const selling = await fetchMyTickets(user.id);
      setSellingTickets(selling);
      if (!selling.some(t => t.status === "pending_validation")) clearInterval(interval);
    }, 5000);
    return () => clearInterval(interval);
  }, [sellingTickets, user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const selling = await fetchMyTickets(user.id);
      setSellingTickets(selling);

      const [accessRes, transfersRes, ratingsRes] = await Promise.all([
        supabase
          .from("buyer_access")
          .select("*, tickets:ticket_id(*, events:event_id(*))")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("ticket_transfers" as any)
          .select("*")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("seller_ratings" as any)
          .select("negotiation_id")
          .eq("buyer_id", user.id),
      ]);

      setPurchasedTickets((accessRes.data as any[]) || []);
      setTransfers((transfersRes.data as any[]) || []);
      setExistingRatings(new Set((ratingsRes.data as any[] || []).map((r: any) => r.negotiation_id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (deleting) return;
    setDeleting(ticketId);
    try {
      const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
      if (error) throw error;
      setSellingTickets(prev => prev.filter(t => t.id !== ticketId));
      toast.success("Ingresso removido. Você pode postá-lo novamente.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover ingresso");
    } finally {
      setDeleting(null);
    }
  };

  const handleConfirmReceipt = async (transferId: string) => {
    try {
      const { error } = await supabase
        .from("ticket_transfers" as any)
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() } as any)
        .eq("id", transferId);
      if (error) throw error;
      toast.success("Recebimento confirmado! Obrigado.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao confirmar recebimento");
    }
  };

  const handleOpenDispute = (transfer: any) => {
    setDisputeTransfer(transfer);
    setDisputeReason("");
    setDisputeDialog(true);
  };

  const handleSubmitDispute = async () => {
    if (!disputeTransfer || !disputeReason.trim() || !user) return;
    setDisputeSubmitting(true);
    try {
      const { error: disputeError } = await supabase
        .from("disputes" as any)
        .insert({
          negotiation_id: disputeTransfer.negotiation_id,
          ticket_id: disputeTransfer.ticket_id,
          buyer_id: user.id,
          seller_id: disputeTransfer.seller_id,
          reason: disputeReason.trim(),
        } as any);
      if (disputeError) throw disputeError;

      // Update transfer status
      await supabase
        .from("ticket_transfers" as any)
        .update({ status: "disputed" } as any)
        .eq("id", disputeTransfer.id);

      toast.success("Contestação aberta. Nossa equipe vai analisar em até 48h.");
      setDisputeDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir contestação");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleRate = (transfer: any) => {
    setRatingTransfer(transfer);
    setRatingValue(5);
    setRatingComment("");
    setRatingDialog(true);
  };

  const handleSubmitRating = async () => {
    if (!ratingTransfer || !user) return;
    setRatingSubmitting(true);
    try {
      const { error } = await supabase
        .from("seller_ratings" as any)
        .insert({
          negotiation_id: ratingTransfer.negotiation_id,
          buyer_id: user.id,
          seller_id: ratingTransfer.seller_id,
          rating: ratingValue,
          comment: ratingComment.trim() || null,
        } as any);
      if (error) throw error;
      toast.success("Avaliação enviada! Obrigado pelo feedback.");
      setRatingDialog(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar avaliação");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const expiredOrRejected = (t: any) => t.status === "rejected" || (t.events && t.events.date < today);
  const activeTickets = sellingTickets.filter(t => !expiredOrRejected(t));
  const rejectedTickets = sellingTickets.filter(t => expiredOrRejected(t));

  const tabs = [
    { key: "selling" as const, label: "Vendendo", count: activeTickets.length, icon: Store },
    { key: "rejected" as const, label: "Recusados / Expirados", count: rejectedTickets.length, icon: Ban },
    { key: "purchased" as const, label: "Comprados", count: purchasedTickets.length, icon: ShoppingBag },
  ];

  const getTransferForAccess = (access: any) => {
    return transfers.find((t: any) => t.ticket_id === access.ticket_id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <div className="container py-8">
          <h1 className="text-3xl font-display font-bold">Meus Ingressos</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus ingressos à venda e comprados.</p>
        </div>

        <div className="container pb-12">
          <div className="flex gap-2 mb-6">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center gap-2 ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tab === "selling" ? (
            activeTickets.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                  <Ticket className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg">Nenhum ingresso à venda</h3>
                <p className="text-sm text-muted-foreground">Publique ingressos para venda aqui.</p>
                <Link to="/sell">
                  <Button className="rounded-xl gap-2 mt-2"><ArrowRight className="w-4 h-4" /> Vender ingresso</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTickets.map((ticket) => (
                  <SellingTicketCard key={ticket.id} ticket={ticket} today={today} />
                ))}
              </div>
            )
          ) : tab === "rejected" ? (
            rejectedTickets.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                  <Ban className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg">Nenhum ingresso recusado ou expirado</h3>
                <p className="text-sm text-muted-foreground">Ingressos rejeitados ou de eventos passados aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rejectedTickets.map((ticket) => (
                  <SellingTicketCard key={ticket.id} ticket={ticket} today={today} onDelete={handleDeleteTicket} />
                ))}
              </div>
            )
          ) : (
            purchasedTickets.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg">Nenhum ingresso comprado</h3>
                <p className="text-sm text-muted-foreground">Seus ingressos comprados aparecerão aqui.</p>
                <Link to="/">
                  <Button className="rounded-xl gap-2 mt-2">Explorar eventos <ArrowRight className="w-4 h-4" /></Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {purchasedTickets.map((access: any) => (
                  <PurchasedTicketCard
                    key={access.id}
                    access={access}
                    transfer={getTransferForAccess(access)}
                    onConfirmReceipt={handleConfirmReceipt}
                    onOpenDispute={handleOpenDispute}
                    onRate={handleRate}
                    existingRating={existingRatings.has(getTransferForAccess(access)?.negotiation_id)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Dispute dialog */}
      <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Abrir contestação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Use a contestação se você teve problema na entrada do evento ou se o ingresso não funcionou.
              Nossa equipe analisará o caso em até 48 horas.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descreva o problema</label>
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Ex: O QR code não funcionou na entrada do evento..."
                className="rounded-xl min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisputeDialog(false)} className="rounded-xl">Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleSubmitDispute}
              disabled={!disputeReason.trim() || disputeSubmitting}
              className="rounded-xl gap-2"
            >
              {disputeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar contestação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating dialog */}
      <Dialog open={ratingDialog} onOpenChange={setRatingDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" /> Avaliar vendedor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Como foi sua experiência com este vendedor? Sua avaliação ajuda outros compradores.
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRatingValue(value)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`w-10 h-10 ${value <= ratingValue ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-foreground">
              {ratingValue === 1 ? "Péssimo" : ratingValue === 2 ? "Ruim" : ratingValue === 3 ? "Regular" : ratingValue === 4 ? "Bom" : "Excelente"}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comentário (opcional)</label>
              <Textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Conte como foi a experiência..."
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRatingDialog(false)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={handleSubmitRating}
              disabled={ratingSubmitting}
              className="rounded-xl gap-2"
            >
              {ratingSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              Enviar avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
