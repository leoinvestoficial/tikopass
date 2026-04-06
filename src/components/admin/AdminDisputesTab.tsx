import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  Loader2, Shield, User, Ticket, DollarSign, MessageSquare,
} from "lucide-react";

type Dispute = {
  id: string;
  negotiation_id: string;
  ticket_id: string;
  buyer_id: string;
  seller_id: string;
  reason: string;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  buyer_profile?: { display_name: string | null };
  seller_profile?: { display_name: string | null };
  ticket?: { sector: string; price: number; events?: { name: string; date: string; venue: string } };
  negotiation?: { offer_price: number; payment_intent_id: string | null; payment_status: string | null };
};

const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
  open: { label: "Aberta", className: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
  resolved_buyer: { label: "Reembolsado", className: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: CheckCircle2 },
  resolved_seller: { label: "Liberado ao vendedor", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  closed: { label: "Fechada", className: "bg-muted text-muted-foreground", icon: XCircle },
};

export default function AdminDisputesTab() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolveAction, setResolveAction] = useState<"buyer" | "seller">("buyer");
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.flatMap(d => [d.buyer_id, d.seller_id]))];
        const ticketIds = [...new Set(data.map(d => d.ticket_id))];
        const negIds = [...new Set(data.map(d => d.negotiation_id))];

        const [profilesRes, ticketsRes, negsRes] = await Promise.all([
          supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
          supabase.from("tickets").select("id, sector, price, event_id, events(name, date, venue)").in("id", ticketIds),
          supabase.from("negotiations").select("id, offer_price, payment_intent_id, payment_status").in("id", negIds),
        ]);

        const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
        const ticketMap = new Map((ticketsRes.data || []).map((t: any) => [t.id, t]));
        const negMap = new Map((negsRes.data || []).map(n => [n.id, n]));

        setDisputes(data.map(d => ({
          ...d,
          buyer_profile: profileMap.get(d.buyer_id) || undefined,
          seller_profile: profileMap.get(d.seller_id) || undefined,
          ticket: ticketMap.get(d.ticket_id) || undefined,
          negotiation: negMap.get(d.negotiation_id) || undefined,
        })));
      } else {
        setDisputes([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar contestações");
    } finally {
      setLoading(false);
    }
  };

  const openResolve = (dispute: Dispute, action: "buyer" | "seller") => {
    setSelectedDispute(dispute);
    setResolveAction(action);
    setResolveNotes("");
    setResolveDialog(true);
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolveNotes.trim()) return;
    setResolving(true);
    try {
      const newStatus = resolveAction === "buyer" ? "resolved_buyer" : "resolved_seller";

      // Update dispute
      const { error } = await supabase
        .from("disputes")
        .update({
          status: newStatus,
          resolution_notes: resolveNotes.trim(),
          resolved_at: new Date().toISOString(),
        } as any)
        .eq("id", selectedDispute.id);
      if (error) throw error;

      // If resolved in favor of seller, update transfer back to confirmed
      if (resolveAction === "seller") {
        await supabase
          .from("ticket_transfers" as any)
          .update({ status: "confirmed" } as any)
          .eq("negotiation_id", selectedDispute.negotiation_id);
      }

      // If resolved in favor of buyer, mark negotiation for refund
      if (resolveAction === "buyer") {
        await supabase
          .from("ticket_transfers" as any)
          .update({ status: "disputed" } as any)
          .eq("negotiation_id", selectedDispute.negotiation_id);
      }

      toast.success(
        resolveAction === "buyer"
          ? "Contestação resolvida a favor do comprador. Reembolso será processado."
          : "Contestação resolvida a favor do vendedor. Pagamento será liberado."
      );
      setResolveDialog(false);
      fetchDisputes();
    } catch (err: any) {
      toast.error(err.message || "Erro ao resolver contestação");
    } finally {
      setResolving(false);
    }
  };

  const openCount = disputes.filter(d => d.status === "open").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{openCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Abertas</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{disputes.filter(d => d.status === "resolved_buyer").length}</p>
          <p className="text-xs text-muted-foreground mt-1">Reembolsadas</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{disputes.filter(d => d.status === "resolved_seller").length}</p>
          <p className="text-xs text-muted-foreground mt-1">Liberadas</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{disputes.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total</p>
        </div>
      </div>

      {disputes.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhuma contestação registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(dispute => {
            const config = statusConfig[dispute.status] || statusConfig.open;
            const isExpanded = expandedId === dispute.id;
            const StatusIcon = config.icon;

            return (
              <div key={dispute.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <button
                  className="w-full p-4 text-left flex items-center gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                >
                  <StatusIcon className={`w-5 h-5 shrink-0 ${dispute.status === "open" ? "text-destructive" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {dispute.ticket?.events?.name || "Evento"}
                      </span>
                      <Badge className={`text-[10px] ${config.className}`}>{config.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(dispute.created_at).toLocaleDateString("pt-BR")} · Comprador: {dispute.buyer_profile?.display_name || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">R$ {dispute.negotiation?.offer_price?.toLocaleString("pt-BR") || "—"}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    {/* Participants */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                          <User className="w-3 h-3" /> Comprador
                        </p>
                        <p className="text-sm font-medium">{dispute.buyer_profile?.display_name || "—"}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                          <User className="w-3 h-3" /> Vendedor
                        </p>
                        <p className="text-sm font-medium">{dispute.seller_profile?.display_name || "—"}</p>
                      </div>
                    </div>

                    {/* Event & ticket info */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                        <Ticket className="w-3 h-3" /> Ingresso
                      </p>
                      <p className="text-sm">
                        {dispute.ticket?.events?.name} · {dispute.ticket?.sector} · R$ {dispute.ticket?.price?.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dispute.ticket?.events?.date && new Date(dispute.ticket.events.date).toLocaleDateString("pt-BR")} · {dispute.ticket?.events?.venue}
                      </p>
                    </div>

                    {/* Reason */}
                    <div className="bg-destructive/5 rounded-lg p-3 space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-destructive font-semibold flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Motivo da contestação
                      </p>
                      <p className="text-sm">{dispute.reason}</p>
                    </div>

                    {/* Resolution notes (if resolved) */}
                    {dispute.resolution_notes && (
                      <div className="bg-primary/5 rounded-lg p-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Resolução
                        </p>
                        <p className="text-sm">{dispute.resolution_notes}</p>
                        {dispute.resolved_at && (
                          <p className="text-[10px] text-muted-foreground">
                            Resolvida em {new Date(dispute.resolved_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions (only for open disputes) */}
                    {dispute.status === "open" && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          className="rounded-xl gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => openResolve(dispute, "buyer")}
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Reembolsar comprador
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => openResolve(dispute, "seller")}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Liberar ao vendedor
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {resolveAction === "buyer" ? "Reembolsar comprador" : "Liberar ao vendedor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {resolveAction === "buyer"
                ? "O comprador receberá o reembolso e o pagamento não será liberado ao vendedor."
                : "O pagamento será liberado ao vendedor e a contestação será encerrada."
              }
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas da resolução (obrigatório)</label>
              <Textarea
                value={resolveNotes}
                onChange={e => setResolveNotes(e.target.value)}
                placeholder="Descreva a decisão e o motivo..."
                className="rounded-xl min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResolveDialog(false)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={handleResolve}
              disabled={!resolveNotes.trim() || resolving}
              className={`rounded-xl gap-2 ${resolveAction === "buyer" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
            >
              {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
