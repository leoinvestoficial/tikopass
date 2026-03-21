import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_NEGOTIATIONS } from "@/data/mock-data";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { Send, Clock, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { useState } from "react";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  accepted: { label: "Aceita", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Recusada", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  completed: { label: "Concluída", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
};

export default function NegotiationsPage() {
  const [selectedNeg, setSelectedNeg] = useState<string | null>(MOCK_NEGOTIATIONS[0]?.id || null);
  const [message, setMessage] = useState("");

  const headerReveal = useScrollReveal<HTMLDivElement>();
  const contentReveal = useScrollReveal<HTMLDivElement>();

  const activeNeg = MOCK_NEGOTIATIONS.find((n) => n.id === selectedNeg);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="flex-1">
        <div
          ref={headerReveal.ref}
          className={`container py-8 ${headerReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
        >
          <h1 className="text-3xl font-display font-bold">Negociações</h1>
          <p className="text-muted-foreground mt-1">Acompanhe todas as suas transações em andamento.</p>
        </div>

        <div
          ref={contentReveal.ref}
          className={`container pb-12 ${contentReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
          style={{ animationDelay: "100ms" }}
        >
          {MOCK_NEGOTIATIONS.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg">Nenhuma negociação</h3>
              <p className="text-sm text-muted-foreground">Quando você negociar um ingresso, as conversas aparecerão aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* List */}
              <div className="space-y-3 lg:col-span-1">
                {MOCK_NEGOTIATIONS.map((neg) => {
                  const status = statusConfig[neg.status];
                  const StatusIcon = status.icon;
                  return (
                    <button
                      key={neg.id}
                      onClick={() => setSelectedNeg(neg.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                        selectedNeg === neg.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-display font-semibold text-sm text-foreground line-clamp-1">
                          {neg.ticket.event.name}
                        </span>
                        <Badge className={`shrink-0 text-[10px] gap-1 ${status.className}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>{neg.ticket.sector} · R$ {neg.offerPrice.toLocaleString("pt-BR")}</div>
                        <div>com {neg.buyerName}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Chat */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col min-h-[400px]">
                {activeNeg ? (
                  <>
                    {/* Chat header */}
                    <div className="p-4 border-b border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-display font-semibold text-sm">{activeNeg.ticket.event.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {activeNeg.ticket.sector} · Oferta: R$ {activeNeg.offerPrice.toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <Badge className={statusConfig[activeNeg.status].className + " text-xs gap-1"}>
                          {(() => { const S = statusConfig[activeNeg.status].icon; return <S className="w-3 h-3" />; })()}
                          {statusConfig[activeNeg.status].label}
                        </Badge>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                      {activeNeg.messages.map((msg) => {
                        const isBuyer = msg.senderId === activeNeg.buyerId;
                        return (
                          <div key={msg.id} className={`flex ${isBuyer ? "justify-start" : "justify-end"}`}>
                            <div
                              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                                isBuyer
                                  ? "bg-muted text-foreground rounded-bl-md"
                                  : "bg-primary text-primary-foreground rounded-br-md"
                              }`}
                            >
                              <div className="font-medium text-xs opacity-70 mb-1">{msg.senderName}</div>
                              {msg.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite sua mensagem..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="rounded-xl"
                          onKeyDown={(e) => e.key === "Enter" && setMessage("")}
                        />
                        <Button size="icon" className="rounded-xl shrink-0" onClick={() => setMessage("")}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    Selecione uma negociação
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
