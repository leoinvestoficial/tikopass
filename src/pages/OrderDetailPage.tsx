import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, AlertTriangle, Clock, ShieldCheck, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

type NotifPayload = {
  title: string;
  steps?: string[];
  buyer_email?: string;
  buyer_name?: string;
  ticketeira?: string;
  deadline?: string | null;
  warning?: string | null;
  deadline_warning?: string | null;
  support?: string | null;
  info?: string | null;
  release_rule?: string;
  transfer_type?: string;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  seller_notified: { label: "Transfira o ingresso agora", className: "bg-orange-500 text-white" },
  transfer_sent: { label: "Aguardando confirmação do comprador", className: "bg-blue-500 text-white" },
  buyer_confirmed: { label: "Comprador confirmou o recebimento", className: "bg-green-500 text-white" },
  released: { label: "Pagamento liberado", className: "bg-green-700 text-white" },
  disputed: { label: "Em contestação — aguarde nossa equipe", className: "bg-red-500 text-white" },
  pending: { label: "Aguardando pagamento do comprador", className: "bg-muted text-foreground" },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [notif, setNotif] = useState<NotifPayload | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copying, setCopying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    load();
  }, [id, user]);

  // countdown updater
  useEffect(() => {
    if (!notif?.deadline) return;
    const tick = () => {
      const diff = new Date(notif.deadline!).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Prazo encerrado");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setCountdown(`${days > 0 ? `${days}d ` : ""}${hours}h restantes`);
    };
    tick();
    const it = setInterval(tick, 60000);
    return () => clearInterval(it);
  }, [notif?.deadline]);

  async function load() {
    setLoading(true);
    try {
      const { data: ord } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();
      if (!ord) {
        toast.error("Ordem não encontrada");
        navigate("/my-tickets");
        return;
      }
      if (ord.seller_id !== user?.id) {
        toast.error("Você não tem acesso a esta ordem");
        navigate("/my-tickets");
        return;
      }
      setOrder(ord);

      const { data: t } = await supabase
        .from("tickets")
        .select("*, events(*)")
        .eq("id", ord.ticket_id)
        .single();
      setTicket(t);
      setEvent(t?.events);

      const { data: n } = await supabase
        .from("transfer_notifications")
        .select("message_text")
        .eq("order_id", id)
        .eq("recipient_type", "seller")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (n?.message_text) {
        try {
          const parsed = JSON.parse(n.message_text);
          setNotif(parsed);
          setChecked((parsed.steps || []).map(() => false));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }

  const transferStatus = ticket?.transfer_status || "pending";
  const statusBadge = STATUS_BADGE[transferStatus] || STATUS_BADGE.pending;
  const allChecked = checked.length > 0 && checked.every((c) => c);

  async function copyEmail() {
    if (!notif?.buyer_email) return;
    setCopying(true);
    await navigator.clipboard.writeText(notif.buyer_email);
    toast.success("E-mail copiado!");
    setTimeout(() => setCopying(false), 1500);
  }

  async function confirmTransfer() {
    if (!ticket || !order) return;
    setSubmitting(true);
    try {
      const oldStatus = ticket.transfer_status;
      const { error } = await supabase
        .from("tickets")
        .update({
          transfer_status: "transfer_sent",
          transfer_confirmed_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);
      if (error) throw error;

      await supabase.from("transfer_status_log").insert({
        ticket_id: ticket.id,
        order_id: order.id,
        old_status: oldStatus,
        new_status: "transfer_sent",
        changed_by: "seller",
        changed_by_user: user?.id,
        notes: "Vendedor marcou como transferido",
      });

      await supabase.from("transfer_notifications").insert({
        ticket_id: ticket.id,
        order_id: order.id,
        recipient_id: order.buyer_id,
        recipient_type: "buyer",
        channel: "in_app",
        status: "sent",
        sent_at: new Date().toISOString(),
        message_text: JSON.stringify({
          title: "Vendedor realizou a transferência",
          body: "Verifique sua plataforma e confirme o recebimento aqui na Tiko Pass.",
        }),
      });

      toast.success("Transferência registrada! Aguarde a confirmação do comprador.");
      setShowConfirm(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar transferência");
    } finally {
      setSubmitting(false);
    }
  }

  function releaseInfoText() {
    if (!notif) return null;
    const map: Record<string, string> = {
      immediate: "Pagamento liberado assim que o comprador confirmar.",
      "48h_buffer": "Pagamento liberado 48h após confirmação do comprador.",
      post_event_24h: `Pagamento liberado 24h após o evento (${event ? new Date(event.date + "T00:00:00").toLocaleDateString("pt-BR") : ""}).`,
    };
    return map[notif.release_rule || "post_event_24h"];
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!order || !ticket) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
          <h1 className="text-2xl font-bold text-foreground">{event?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {event && new Date(event.date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            {event?.time && ` • ${event.time}`}
            {event?.venue && ` • ${event.venue}`}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="text-xs">
              Plataforma: {notif?.ticketeira || "Não identificada"}
            </Badge>
            {countdown && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> {countdown}
              </Badge>
            )}
          </div>
        </div>

        {/* Buyer email card (visible after sale confirmed) */}
        {transferStatus !== "pending" && notif?.buyer_email && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">
              E-mail do comprador para receber o ingresso
            </p>
            <div className="flex items-center gap-2 bg-muted rounded-xl p-3">
              <span className="flex-1 font-mono text-sm text-foreground break-all">
                {notif.buyer_email}
              </span>
              <Button size="sm" variant="outline" onClick={copyEmail}>
                {copying ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1.5">Copiar</span>
              </Button>
            </div>
            {notif.buyer_name && (
              <p className="text-xs text-muted-foreground mt-2">
                Nome: <span className="font-medium text-foreground">{notif.buyer_name}</span>
              </p>
            )}
          </div>
        )}

        {/* Instruction checklist */}
        {notif?.steps && notif.steps.length > 0 && transferStatus === "seller_notified" && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-foreground">Como transferir o ingresso</h2>

            {(notif.warning || notif.deadline_warning) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-500 shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-900 dark:text-yellow-200 space-y-1">
                  {notif.warning && <p>{notif.warning}</p>}
                  {notif.deadline_warning && <p className="font-semibold">{notif.deadline_warning}</p>}
                </div>
              </div>
            )}

            <ul className="space-y-2.5">
              {notif.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Checkbox
                    checked={checked[i] || false}
                    onCheckedChange={(v) => {
                      const next = [...checked];
                      next[i] = !!v;
                      setChecked(next);
                    }}
                    className="mt-0.5"
                  />
                  <span className={`text-sm ${checked[i] ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {i + 1}. {step}
                  </span>
                </li>
              ))}
            </ul>

            {notif.support && (
              <p className="text-xs text-muted-foreground">{notif.support}</p>
            )}

            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!allChecked}
              className="w-full"
            >
              Marquei como transferido
            </Button>
          </div>
        )}

        {/* PDF custody info (no action needed) */}
        {notif?.transfer_type === "pdf_custody" && transferStatus === "seller_notified" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              {notif.info || "Este ingresso é em PDF e ficou em custódia na Tiko Pass. O comprador recebe o arquivo automaticamente. Nenhuma ação é necessária."}
            </p>
          </div>
        )}

        {/* Status info for transfer_sent / buyer_confirmed / released */}
        {transferStatus === "transfer_sent" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
            <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
              Aguardando o comprador confirmar o recebimento. {releaseInfoText()}
            </p>
          </div>
        )}

        {transferStatus === "buyer_confirmed" && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
            <p className="text-sm text-green-900 dark:text-green-200 font-medium">
              Comprador confirmou! {releaseInfoText()}
            </p>
          </div>
        )}

        {transferStatus === "released" && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-2xl p-5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-green-700 dark:text-green-400 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-green-900 dark:text-green-200">Pagamento liberado!</p>
              <p className="text-xs text-green-800 dark:text-green-300 mt-0.5">
                O valor já está disponível na sua carteira. <Link to="/wallet" className="underline">Ver carteira</Link>
              </p>
            </div>
          </div>
        )}

        {/* Release rule footer */}
        {releaseInfoText() && transferStatus !== "released" && (
          <p className="text-xs text-muted-foreground text-center">{releaseInfoText()}</p>
        )}
      </div>

      {/* Confirm modal */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar transferência</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Você confirma que realizou a transferência do ingresso para{" "}
            <span className="font-mono font-bold text-foreground">{notif?.buyer_email}</span>?
          </p>
          <p className="text-xs text-muted-foreground">
            Esta ação irá notificar o comprador para confirmar o recebimento.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={confirmTransfer} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sim, transferi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
