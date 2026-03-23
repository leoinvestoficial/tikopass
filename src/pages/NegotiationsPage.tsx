import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Clock, CheckCircle2, XCircle, MessageSquare, Loader2, CreditCard, ShieldCheck, ArrowLeftRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { fetchUserNegotiations, fetchMessages, sendMessage, updateNegotiationStatus } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  counter: { label: "Contraproposta", icon: ArrowLeftRight, className: "bg-accent/10 text-accent border-accent/20" },
  accepted: { label: "Aceita", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Recusada", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  completed: { label: "Concluída", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
};

const PLATFORM_FEE = 0.10;

export default function NegotiationsPage() {
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [selectedNeg, setSelectedNeg] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [counterDialog, setCounterDialog] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");

  const { user } = useAuth();
  const navigate = useNavigate();
  const requestedNegotiationId = searchParams.get("negotiation");

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadNegotiations();
  }, [user]);

  useEffect(() => {
    if (selectedNeg) loadMessages(selectedNeg);
  }, [selectedNeg]);

  useEffect(() => {
    if (negotiations.length === 0) {
      setSelectedNeg(null);
      return;
    }
    if (requestedNegotiationId && negotiations.some((neg: any) => neg.id === requestedNegotiationId)) {
      setSelectedNeg(requestedNegotiationId);
      return;
    }
    if (!selectedNeg || !negotiations.some((neg: any) => neg.id === selectedNeg)) {
      const fallbackId = negotiations[0].id;
      setSelectedNeg(fallbackId);
      if (!requestedNegotiationId) {
        setSearchParams({ negotiation: fallbackId }, { replace: true });
      }
    }
  }, [negotiations, requestedNegotiationId, selectedNeg, setSearchParams]);

  const loadNegotiations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserNegotiations(user.id);
      setNegotiations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNegotiation = (negotiationId: string) => {
    setSelectedNeg(negotiationId);
    setSearchParams({ negotiation: negotiationId }, { replace: true });
  };

  const loadMessages = async (negId: string) => {
    try {
      const data = await fetchMessages(negId);
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedNeg || !user) return;
    setSending(true);
    try {
      await sendMessage({ negotiation_id: selectedNeg, sender_id: user.id, content: message.trim() });
      setMessage("");
      loadMessages(selectedNeg);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleStatusUpdate = async (negId: string, status: string) => {
    try {
      await updateNegotiationStatus(negId, status);
      toast.success(status === "accepted" ? "Oferta aceita!" : "Oferta recusada");
      loadNegotiations();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status");
    }
  };

  const handleCounterOffer = async () => {
    if (!activeNeg || !user || !counterPrice) return;
    const price = parseFloat(counterPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Digite um valor válido");
      return;
    }
    try {
      await updateNegotiationStatus(activeNeg.id, "counter", price);
      await sendMessage({
        negotiation_id: activeNeg.id,
        sender_id: user.id,
        content: `Contraproposta: R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });
      toast.success("Contraproposta enviada!");
      setCounterDialog(false);
      setCounterPrice("");
      loadNegotiations();
      loadMessages(activeNeg.id);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar contraproposta");
    }
  };

  const handleAcceptCounter = async (negId: string) => {
    try {
      await updateNegotiationStatus(negId, "accepted");
      toast.success("Contraproposta aceita!");
      loadNegotiations();
    } catch (err: any) {
      toast.error(err.message || "Erro ao aceitar");
    }
  };

  const activeNeg = negotiations.find((n: any) => n.id === selectedNeg);
  const isSeller = activeNeg?.seller_id === user?.id;
  const isBuyer = activeNeg?.buyer_id === user?.id;

  // Current active price (counter_offer_price if counter, otherwise offer_price)
  const activePrice = activeNeg?.status === "counter" && activeNeg?.counter_offer_price
    ? activeNeg.counter_offer_price
    : activeNeg?.offer_price;
  const sellerNetAmount = activePrice ? activePrice * (1 - PLATFORM_FEE) : 0;
  const buyerTotalAmount = activePrice ? activePrice * (1 + PLATFORM_FEE) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <div className="container py-8">
          <h1 className="text-3xl font-display font-bold">Negociações</h1>
          <p className="text-muted-foreground mt-1">Acompanhe todas as suas transações em andamento.</p>
        </div>

        <div className="container pb-12" style={{ animationDelay: "100ms" }}>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : negotiations.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto"><MessageSquare className="w-8 h-8 text-muted-foreground" /></div>
              <h3 className="font-display font-semibold text-lg">Nenhuma negociação</h3>
              <p className="text-sm text-muted-foreground">Quando você negociar um ingresso, as conversas aparecerão aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3 lg:col-span-1">
                {negotiations.map((neg: any) => {
                  const status = statusConfig[neg.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  const eventName = neg.tickets?.events?.name || "Evento";
                  const otherName = neg.buyer_id === user?.id ? neg.seller_profile?.display_name : neg.buyer_profile?.display_name;
                  const displayPrice = neg.status === "counter" && neg.counter_offer_price ? neg.counter_offer_price : neg.offer_price;
                  return (
                    <button
                      key={neg.id}
                      onClick={() => handleSelectNegotiation(neg.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 active:scale-[0.98] ${selectedNeg === neg.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:shadow-sm"}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-display font-semibold text-sm text-foreground line-clamp-1">{eventName}</span>
                        <Badge className={`shrink-0 text-[10px] gap-1 ${status.className}`}><StatusIcon className="w-3 h-3" />{status.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>{neg.tickets?.sector || ""} · R$ {displayPrice?.toLocaleString("pt-BR")}</div>
                        {otherName && <div>com {otherName}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col min-h-[400px]">
                {activeNeg ? (
                  <>
                    <div className="p-4 border-b border-border bg-muted/30">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="font-display font-semibold text-sm">{activeNeg.tickets?.events?.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {activeNeg.tickets?.sector}
                            {activeNeg.status === "counter" && activeNeg.counter_offer_price ? (
                              <> · Contraproposta: R$ {activeNeg.counter_offer_price?.toLocaleString("pt-BR")}</>
                            ) : (
                              <> · Oferta: R$ {activeNeg.offer_price?.toLocaleString("pt-BR")}</>
                            )}
                          </p>
                          {/* Show net amount to seller or total to buyer */}
                          {isSeller && (
                            <p className="text-xs text-success font-medium mt-0.5">
                              Você recebe: R$ {sellerNetAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              <span className="text-muted-foreground font-normal"> (taxa de 10%)</span>
                            </p>
                          )}
                          {isBuyer && activeNeg.status !== "rejected" && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Total com taxa: R$ {buyerTotalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Seller actions for pending offer */}
                          {activeNeg.status === "pending" && isSeller && (
                            <>
                              <Button size="sm" variant="success" onClick={() => handleStatusUpdate(activeNeg.id, "accepted")} className="rounded-lg text-xs">Aceitar</Button>
                              <Button size="sm" variant="outline" onClick={() => { setCounterPrice(String(activeNeg.offer_price)); setCounterDialog(true); }} className="rounded-lg text-xs gap-1">
                                <ArrowLeftRight className="w-3 h-3" /> Contraproposta
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(activeNeg.id, "rejected")} className="rounded-lg text-xs">Recusar</Button>
                            </>
                          )}
                          {/* Buyer actions for counter-offer */}
                          {activeNeg.status === "counter" && isBuyer && (
                            <>
                              <Button size="sm" variant="success" onClick={() => handleAcceptCounter(activeNeg.id)} className="rounded-lg text-xs">
                                Aceitar R$ {activeNeg.counter_offer_price?.toLocaleString("pt-BR")}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(activeNeg.id, "rejected")} className="rounded-lg text-xs">Recusar</Button>
                            </>
                          )}
                          {/* Payment button */}
                          {activeNeg.status === "accepted" && isBuyer && activeNeg.payment_status !== "paid" && (
                            <Button
                              size="sm"
                              className="rounded-lg text-xs gap-1"
                              onClick={async () => {
                                try {
                                  const { data, error } = await supabase.functions.invoke("create-checkout", {
                                    body: { negotiation_id: activeNeg.id },
                                  });
                                  if (error) throw error;
                                  if (data?.url) window.open(data.url, "_blank");
                                } catch (err: any) {
                                  toast.error(err.message || "Erro ao criar checkout");
                                }
                              }}
                            >
                              <CreditCard className="w-3 h-3" />
                              Pagar R$ {buyerTotalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </Button>
                          )}
                          {activeNeg.payment_status === "paid" && (
                            <Badge className="bg-success/10 text-success border-success/20 text-xs gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Pago
                            </Badge>
                          )}
                          <Badge className={`${(statusConfig[activeNeg.status] || statusConfig.pending).className} text-xs gap-1`}>
                            {(() => { const S = (statusConfig[activeNeg.status] || statusConfig.pending).icon; return <S className="w-3 h-3" />; })()}
                            {(statusConfig[activeNeg.status] || statusConfig.pending).label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                      {messages.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem ainda. Inicie a conversa!</p>
                      )}
                      {messages.map((msg: any) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                              <div className="font-medium text-xs opacity-70 mb-1">{msg.sender_profile?.display_name || "Usuário"}</div>
                              {msg.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite sua mensagem..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSend()}
                          className="rounded-xl"
                        />
                        <Button size="icon" className="rounded-xl shrink-0" onClick={handleSend} disabled={sending || !message.trim()}>
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Selecione uma negociação</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Counter-offer dialog */}
      <Dialog open={counterDialog} onOpenChange={setCounterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Fazer contraproposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-xl text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Oferta do comprador:</span>
                <span className="font-medium">R$ {activeNeg?.offer_price?.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Você receberia:</span>
                <span className="font-medium text-success">R$ {((activeNeg?.offer_price || 0) * (1 - PLATFORM_FEE)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Seu valor (R$)</label>
              <Input
                type="number"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                className="rounded-xl"
                placeholder="Digite o valor desejado"
              />
              {counterPrice && parseFloat(counterPrice) > 0 && (
                <p className="text-xs text-success font-medium">
                  Você receberá: R$ {(parseFloat(counterPrice) * (1 - PLATFORM_FEE)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  <span className="text-muted-foreground font-normal"> (taxa de 10%)</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounterDialog(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCounterOffer} disabled={!counterPrice || parseFloat(counterPrice) <= 0} className="rounded-xl gap-2">
              <ArrowLeftRight className="w-4 h-4" /> Enviar contraproposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
