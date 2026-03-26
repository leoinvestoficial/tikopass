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
import {
  Ticket, Loader2, Calendar, MapPin, Tag, ArrowRight, Clock, Eye, ShoppingBag, Store,
  CheckCircle2, XCircle, AlertCircle, Shield, Trash2, Ban,
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
  };
  const st = statusLabels[ticket.status] || statusLabels.available;
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

      {/* Pending validation indicator */}
      {ticket.status === "pending_validation" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-warning bg-warning/5 rounded-lg px-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Validação em andamento... Isso pode levar alguns segundos.
        </div>
      )}

      {/* Rejection reason */}
      {isRejected && ticket.rejection_reason && (
        <div className="mt-3 flex items-start gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{ticket.rejection_reason}</span>
        </div>
      )}

      {/* Validation checklist */}
      {(isRejected || ticket.status === "validated") && checks.length > 0 && (
        <ValidationChecklist checks={checks} />
      )}

      {/* Delete button for rejected tickets */}
      {isRejected && onDelete && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            className="rounded-xl gap-1.5 text-xs"
            onClick={(e) => {
              e.preventDefault();
              onDelete(ticket.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Remover ingresso
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MyTicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sellingTickets, setSellingTickets] = useState<any[]>([]);
  const [purchasedTickets, setPurchasedTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"selling" | "rejected" | "purchased">("selling");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadData();
  }, [user]);

  // Auto-refresh while there are pending tickets
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
      const { data: accessData } = await supabase
        .from("buyer_access")
        .select("*, tickets:ticket_id(*, events:event_id(*))")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      setPurchasedTickets((accessData as any[]) || []);
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
      // Delete the ticket (hashes are cleaned up by DB trigger)
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

  const today = new Date().toISOString().split("T")[0];

  const activeTickets = sellingTickets.filter(t => t.status !== "rejected");
  const rejectedTickets = sellingTickets.filter(t => t.status === "rejected");

  const tabs = [
    { key: "selling" as const, label: "Vendendo", count: activeTickets.length, icon: Store },
    { key: "rejected" as const, label: "Recusados", count: rejectedTickets.length, icon: Ban },
    { key: "purchased" as const, label: "Comprados", count: purchasedTickets.length, icon: ShoppingBag },
  ];

  const handleViewTicket = async (access: any) => {
    if (access.invalidated_at) return;
    window.open(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-ticket?token=${access.token}`,
      "_blank"
    );
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
          {/* Tabs */}
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
                <h3 className="font-display font-semibold text-lg">Nenhum ingresso recusado</h3>
                <p className="text-sm text-muted-foreground">Ingressos rejeitados pela validação aparecerão aqui.</p>
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
                {purchasedTickets.map((access: any) => {
                  const ticket = access.tickets;
                  const event = ticket?.events;
                  if (!event) return null;
                  const isExpired = access.invalidated_at || new Date(access.expires_at) < new Date();

                  return (
                    <div key={access.id} className={`bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${isExpired ? "opacity-60" : ""}`}>
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-semibold text-foreground">{event.name}</h3>
                          {isExpired ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground border-muted">Expirado</Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success border-success/20 text-xs">Ativo</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {event.time}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.venue}</span>
                          <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{ticket.sector}</span>
                        </div>
                        {!isExpired && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Acesso expira em {new Date(access.expires_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {!isExpired ? (
                          <Button className="rounded-xl gap-2" onClick={() => handleViewTicket(access)}>
                            <Eye className="w-4 h-4" /> Ver ingresso
                          </Button>
                        ) : (
                          <Button variant="outline" className="rounded-xl" disabled>
                            Acesso encerrado
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
