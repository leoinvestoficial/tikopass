import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Clock, CheckCircle2, XCircle, MessageSquare, Loader2, CreditCard, ShieldCheck, ArrowLeftRight, Trophy, Zap, TrendingUp, User, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { fetchUserNegotiations, fetchMessages, sendMessage, updateNegotiationStatus } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const statusConfig: Record<string, { label: string; icon: any; className: string; color: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20", color: "warning" },
  counter: { label: "Contraproposta", icon: ArrowLeftRight, className: "bg-accent/10 text-accent border-accent/20", color: "accent" },
  accepted: { label: "Aceita", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20", color: "success" },
  rejected: { label: "Recusada", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20", color: "destructive" },
  completed: { label: "Concluída", icon: Trophy, className: "bg-success/10 text-success border-success/20", color: "success" },
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
  const [showChat, setShowChat] = useState(false); // mobile chat view

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

  // Realtime subscription for new messages
  useEffect(() => {
    if (!selectedNeg) return;
    const channel = supabase
      .channel(`messages-${selectedNeg}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "negotiation_messages",
          filter: `negotiation_id=eq.${selectedNeg}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as any]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedNeg]);

  useEffect(() => {
    if (negotiations.length === 0) { setSelectedNeg(null); return; }
    if (requestedNegotiationId && negotiations.some((neg: any) => neg.id === requestedNegotiationId)) {
      setSelectedNeg(requestedNegotiationId);
      setShowChat(true);
      return;
    }
    if (!selectedNeg || !negotiations.some((neg: any) => neg.id === selectedNeg)) {
      const fallbackId = negotiations[0].id;
      setSelectedNeg(fallbackId);
      if (!requestedNegotiationId) setSearchParams({ negotiation: fallbackId }, { replace: true });
    }
  }, [negotiations, requestedNegotiationId, selectedNeg, setSearchParams]);

  const loadNegotiations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserNegotiations(user.id);
      setNegotiations(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectNegotiation = (negotiationId: string) => {
    setSelectedNeg(negotiationId);
    setSearchParams({ negotiation: negotiationId }, { replace: true });
    setShowChat(true);
  };

  const loadMessages = async (negId: string) => {
    try { const data = await fetchMessages(negId); setMessages(data || []); }
    catch (err) { console.error(err); }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedNeg || !user) return;
    setSending(true);
    try {
      await sendMessage({ negotiation_id: selectedNeg, sender_id: user.id, content: message.trim() });
      setMessage("");
      loadMessages(selectedNeg);
    } catch (err: any) { toast.error(err.message || "Erro ao enviar mensagem"); }
    finally { setSending(false); }
  };

  const handleStatusUpdate = async (negId: string, status: string) => {
    try {
      await updateNegotiationStatus(negId, status);
      toast.success(status === "accepted" ? "Oferta aceita! 🎉" : "Oferta recusada");
      loadNegotiations();
    } catch (err: any) { toast.error(err.message || "Erro ao atualizar status"); }
  };

  const handleCounterOffer = async () => {
    if (!activeNeg || !user || !counterPrice) return;
    const price = parseFloat(counterPrice);
    if (isNaN(price) || price <= 0) { toast.error("Digite um valor válido"); return; }
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
    } catch (err: any) { toast.error(err.message || "Erro ao enviar contraproposta"); }
  };

  const handleAcceptCounter = async (negId: string) => {
    try {
      await updateNegotiationStatus(negId, "accepted");
      toast.success("Contraproposta aceita! 🎉");
      loadNegotiations();
    } catch (err: any) { toast.error(err.message || "Erro ao aceitar"); }
  };

  const activeNeg = negotiations.find((n: any) => n.id === selectedNeg);
  const isSeller = activeNeg?.seller_id === user?.id;
  const isBuyer = activeNeg?.buyer_id === user?.id;

  const activePrice = activeNeg?.status === "counter" && activeNeg?.counter_offer_price
    ? activeNeg.counter_offer_price
    : activeNeg?.offer_price;
  const sellerNetAmount = activePrice || 0;
  const buyerTotalAmount = activePrice ? activePrice * (1 + PLATFORM_FEE) : 0;

  const totalNeg = negotiations.length;
  const activeCount = negotiations.filter((n: any) => ["pending", "counter"].includes(n.status)).length;
  const completedCount = negotiations.filter((n: any) => ["accepted", "completed"].includes(n.status)).length;

  // Negotiation list item renderer
  const renderNegItem = (neg: any) => {
    const status = statusConfig[neg.status] || statusConfig.pending;
    const StatusIcon = status.icon;
    const eventName = neg.tickets?.events?.name || "Evento";
    const otherProfile = neg.buyer_id === user?.id ? neg.seller_profile : neg.buyer_profile;
    const otherName = otherProfile?.display_name || "Usuário";
    const otherAvatar = otherProfile?.avatar_url;
    const displayPrice = neg.status === "counter" && neg.counter_offer_price ? neg.counter_offer_price : neg.offer_price;
    const isSelected = selectedNeg === neg.id;
    return (
      <button
        key={neg.id}
        onClick={() => handleSelectNegotiation(neg.id)}
        className={`w-full text-left p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] ${
          isSelected
            ? "border-primary bg-primary/5 shadow-md"
            : "border-transparent bg-card hover:border-border hover:shadow-sm"
        }`}
      >
        <div className="flex items-start gap-2.5 md:gap-3 mb-1.5">
          <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0 mt-0.5">
            {otherAvatar && <AvatarImage src={otherAvatar} alt={otherName} />}
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] md:text-xs font-bold">
              {otherName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display font-bold text-xs md:text-sm text-foreground line-clamp-1">{eventName}</span>
              <Badge className={`shrink-0 text-[9px] md:text-[10px] gap-0.5 md:gap-1 ${status.className}`}>
                <StatusIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />{status.label}
              </Badge>
            </div>
            <span className="text-[10px] md:text-xs text-muted-foreground">com {otherName}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pl-12">
          <span className="text-[10px] md:text-xs text-muted-foreground">{neg.tickets?.sector}</span>
          <span className="font-bold text-xs md:text-sm text-foreground">
            R$ {displayPrice?.toLocaleString("pt-BR")}
          </span>
        </div>
      </button>
    );
  };

  // Chat panel renderer
  const renderChatPanel = () => {
    if (!activeNeg) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">Selecione uma negociação</p>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Chat header */}
        <div className="p-3 md:p-5 border-b border-border bg-gradient-to-r from-card to-muted/30">
          <div className="flex items-start justify-between flex-wrap gap-2 md:gap-3">
            <div className="space-y-2 md:space-y-3 flex-1 min-w-0">
              {/* Mobile back button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChat(false)}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="font-display font-bold text-sm md:text-base text-foreground truncate">{activeNeg.tickets?.events?.name}</h3>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {activeNeg.tickets?.sector}
              </p>

              {/* Participants */}
              <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                <Link to={`/seller/${activeNeg.seller_id}`} className="flex items-center gap-1.5 md:gap-2 hover:opacity-80 transition-opacity">
                  <Avatar className="h-7 w-7 md:h-8 md:w-8">
                    {activeNeg.seller_profile?.avatar_url && <AvatarImage src={activeNeg.seller_profile.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-[9px] md:text-[10px] font-bold">
                      {(activeNeg.seller_profile?.display_name || "V").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Vendedor</span>
                    <span className="text-[11px] md:text-xs font-medium text-foreground">{activeNeg.seller_profile?.display_name || "Vendedor"}</span>
                  </div>
                </Link>
                <span className="text-muted-foreground text-xs">×</span>
                <Link to={`/seller/${activeNeg.buyer_id}`} className="flex items-center gap-1.5 md:gap-2 hover:opacity-80 transition-opacity">
                  <Avatar className="h-7 w-7 md:h-8 md:w-8">
                    {activeNeg.buyer_profile?.avatar_url && <AvatarImage src={activeNeg.buyer_profile.avatar_url} />}
                    <AvatarFallback className="bg-accent/30 text-accent-foreground text-[9px] md:text-[10px] font-bold">
                      {(activeNeg.buyer_profile?.display_name || "C").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Comprador</span>
                    <span className="text-[11px] md:text-xs font-medium text-foreground">{activeNeg.buyer_profile?.display_name || "Comprador"}</span>
                  </div>
                </Link>
              </div>

              {/* Price breakdown */}
              <div className="bg-background rounded-xl px-3 py-2 md:px-4 md:py-3 border border-border text-xs md:text-sm space-y-1.5 md:space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-[10px] md:text-xs">
                    Ingresso ({activeNeg.status === "counter" ? "contraproposta" : "oferta"})
                  </span>
                  <span className="font-semibold text-foreground">
                    R$ {activePrice?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {isBuyer && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-[10px] md:text-xs">Taxa Tiko Pass (10%)</span>
                    <span className="text-muted-foreground">
                      + R$ {((activePrice || 0) * PLATFORM_FEE).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-1.5 flex justify-between items-center">
                  {isSeller ? (
                    <>
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-success">Você recebe</span>
                      <span className="font-bold text-success text-sm md:text-lg">
                        R$ {sellerNetAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-foreground">Total a pagar</span>
                      <span className="font-bold text-foreground text-sm md:text-lg">
                        R$ {buyerTotalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              {activeNeg.status === "pending" && isSeller && (
                <>
                  <Button size="sm" onClick={() => handleStatusUpdate(activeNeg.id, "accepted")} className="rounded-xl text-[10px] md:text-xs gap-1 bg-success hover:bg-success/90 text-white h-8 md:h-9">
                    <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> Aceitar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setCounterPrice(String(activeNeg.offer_price)); setCounterDialog(true); }} className="rounded-xl text-[10px] md:text-xs gap-1 h-8 md:h-9">
                    <ArrowLeftRight className="w-3 h-3 md:w-3.5 md:h-3.5" /> Contra
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleStatusUpdate(activeNeg.id, "rejected")} className="rounded-xl text-[10px] md:text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8 md:h-9">
                    Recusar
                  </Button>
                </>
              )}
              {activeNeg.status === "counter" && isBuyer && (
                <>
                  <Button size="sm" onClick={() => handleAcceptCounter(activeNeg.id)} className="rounded-xl text-[10px] md:text-xs gap-1 bg-success hover:bg-success/90 text-white h-8 md:h-9">
                    <CheckCircle2 className="w-3 h-3" /> Aceitar R$ {activeNeg.counter_offer_price?.toLocaleString("pt-BR")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleStatusUpdate(activeNeg.id, "rejected")} className="rounded-xl text-[10px] md:text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8 md:h-9">
                    Recusar
                  </Button>
                </>
              )}
              {activeNeg.status === "accepted" && isBuyer && activeNeg.payment_status !== "paid" && (
                <Button
                  size="sm"
                  className="rounded-xl text-[10px] md:text-xs gap-1 animate-pulse h-8 md:h-9"
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
                  <CreditCard className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  Pagar agora
                </Button>
              )}
              {activeNeg.payment_status === "paid" && (
                <Badge className="bg-success/10 text-success border-success/20 text-[10px] md:text-xs gap-1 px-2 md:px-3 py-1 md:py-1.5">
                  <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5" /> Pago
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-3 md:p-5 space-y-3 md:space-y-4 overflow-y-auto bg-gradient-to-b from-background/50 to-background">
          {messages.length === 0 && (
            <div className="text-center py-8 md:py-12 space-y-2">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Nenhuma mensagem. Inicie a conversa!</p>
            </div>
          )}
          {messages.map((msg: any) => {
            const isMe = msg.sender_id === user?.id;
            const senderName = msg.sender_profile?.display_name || "Usuário";
            const senderAvatar = msg.sender_profile?.avatar_url;
            const initials = senderName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={msg.id} className={`flex items-end gap-1.5 md:gap-2 ${isMe ? "justify-end flex-row-reverse" : "justify-start"}`}>
                <Avatar className="h-6 w-6 md:h-7 md:w-7 shrink-0">
                  {senderAvatar && <AvatarImage src={senderAvatar} />}
                  <AvatarFallback className="text-[8px] md:text-[9px] font-bold bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[80%] md:max-w-[70%] px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm shadow-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-2xl rounded-bl-sm"
                }`}>
                  <div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-0.5 md:mb-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {senderName}
                  </div>
                  {msg.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-3 md:p-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <Input
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="rounded-xl h-10 md:h-11 text-sm"
            />
            <Button size="icon" className="rounded-xl shrink-0 h-10 w-10 md:h-11 md:w-11" onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-bottom-nav">
      <Navbar />
      <div className="flex-1">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-4 md:py-8">
            <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">Negociações</h1>
            <p className="text-muted-foreground mt-0.5 text-xs md:text-sm">Acompanhe todas as suas transações</p>
            
            {totalNeg > 0 && (
              <div className="grid grid-cols-3 gap-2 md:gap-4 mt-4 md:mt-6 max-w-lg">
                <div className="bg-background rounded-xl p-2.5 md:p-4 border border-border text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5 md:mb-1">
                    <MessageSquare className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Total</span>
                  </div>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{totalNeg}</p>
                </div>
                <div className="bg-background rounded-xl p-2.5 md:p-4 border border-border text-center">
                  <div className="flex items-center justify-center gap-1 text-primary mb-0.5 md:mb-1">
                    <Zap className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Ativas</span>
                  </div>
                  <p className="text-lg md:text-2xl font-bold text-primary">{activeCount}</p>
                </div>
                <div className="bg-background rounded-xl p-2.5 md:p-4 border border-border text-center">
                  <div className="flex items-center justify-center gap-1 text-success mb-0.5 md:mb-1">
                    <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Fechadas</span>
                  </div>
                  <p className="text-lg md:text-2xl font-bold text-success">{completedCount}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="container py-4 md:py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : negotiations.length === 0 ? (
            <div className="text-center py-16 md:py-20 space-y-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg md:text-xl">Nenhuma negociação ainda</h3>
              <p className="text-xs md:text-sm text-muted-foreground max-w-xs mx-auto">
                Quando você fizer uma oferta ou receber uma, as negociações aparecerão aqui.
              </p>
              <Button onClick={() => navigate("/")} className="rounded-xl gap-2 mt-4 text-sm">
                Explorar ingressos <Zap className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              {/* DESKTOP: side-by-side */}
              <div className="hidden lg:grid grid-cols-12 gap-6">
                <div className="col-span-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                    {negotiations.length} negociação{negotiations.length !== 1 ? "ões" : ""}
                  </p>
                  {negotiations.map(renderNegItem)}
                </div>
                <div className="col-span-8 bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[500px] shadow-sm">
                  {renderChatPanel()}
                </div>
              </div>

              {/* MOBILE: list or chat */}
              <div className="lg:hidden">
                {!showChat ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                      {negotiations.length} negociação{negotiations.length !== 1 ? "ões" : ""}
                    </p>
                    {negotiations.map(renderNegItem)}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col min-h-[70vh] shadow-sm -mx-4 md:mx-0">
                    {renderChatPanel()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Counter-offer dialog */}
      <Dialog open={counterDialog} onOpenChange={setCounterDialog}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Fazer contraproposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 md:p-4 bg-muted/50 rounded-xl text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Oferta do comprador</span>
                <span className="font-bold">R$ {activeNeg?.offer_price?.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Você recebe</span>
                <span className="font-bold text-success">R$ {(activeNeg?.offer_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Seu valor (R$)</label>
              <Input
                type="number"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                className="rounded-xl h-12 text-lg font-bold text-center"
                placeholder="0,00"
              />
              {counterPrice && parseFloat(counterPrice) > 0 && (
                <div className="bg-success/10 rounded-xl px-4 py-2.5 text-center">
                  <span className="text-xs text-muted-foreground">Você recebe </span>
                  <span className="font-bold text-success">
                    R$ {parseFloat(counterPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">— comprador paga +10%</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
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
