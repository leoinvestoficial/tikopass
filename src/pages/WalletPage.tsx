import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wallet, Loader2, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2, RefreshCw,
  TrendingUp, ShieldCheck, Zap, Smartphone, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import KycWithdrawalFlow from "@/components/KycWithdrawalFlow";

type WalletTransaction = {
  id: string;
  user_id: string;
  negotiation_id: string | null;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
  released_at: string | null;
  withdrawn_at: string | null;
  event_name?: string;
  event_date?: string;
  platform_fee?: number;
  net_amount?: number;
  estimated_release?: string;
};

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "Retido", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  available: { label: "Disponível", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  withdrawn: { label: "Sacado", icon: ArrowUpCircle, className: "bg-muted text-muted-foreground border-muted" },
  refunded: { label: "Estornado", icon: RefreshCw, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave aleatória" },
];

export default function WalletPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawDialog, setWithdrawDialog] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadWallet();
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const txs = (data || []) as WalletTransaction[];
      const negIds = [...new Set(txs.filter(t => t.negotiation_id).map(t => t.negotiation_id!))];
      
      if (negIds.length > 0) {
        const { data: negs } = await supabase
          .from("negotiations")
          .select("id, offer_price, platform_fee, ticket_id, tickets(event_id, events(name, date))")
          .in("id", negIds);
        
        const negMap = new Map((negs || []).map((n: any) => [n.id, n]));
        
        txs.forEach(tx => {
          if (tx.negotiation_id && negMap.has(tx.negotiation_id)) {
            const neg = negMap.get(tx.negotiation_id)!;
            const event = (neg as any).tickets?.events;
            tx.event_name = event?.name || undefined;
            tx.event_date = event?.date || undefined;
            tx.platform_fee = (neg as any).platform_fee || (neg as any).offer_price * 0.10;
            tx.net_amount = tx.amount;
            if (event?.date && tx.status === "pending") {
              const eventDate = new Date(event.date);
              eventDate.setHours(eventDate.getHours() + 24);
              tx.estimated_release = eventDate.toISOString();
            }
          }
        });
      }

      setTransactions(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pendingBalance = transactions
    .filter(t => t.status === "pending" && t.type === "sale")
    .reduce((sum, t) => sum + t.amount, 0);

  const availableBalance = transactions
    .filter(t => t.status === "available" && t.type === "sale")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawn = transactions
    .filter(t => t.status === "withdrawn")
    .reduce((sum, t) => sum + t.amount, 0);

  const kycStatus = ((profile as any)?.kyc_status || "pending") as "pending" | "submitted" | "approved" | "rejected";

  const kycBanner = () => {
    if (kycStatus === "approved") return null;
    const configs = {
      pending: { icon: ShieldCheck, color: "bg-primary/5 border-primary/10", text: "Para sacar, você precisará verificar sua identidade." },
      submitted: { icon: Clock, color: "bg-warning/5 border-warning/10", text: "Sua verificação de identidade está em análise." },
      rejected: { icon: AlertCircle, color: "bg-destructive/5 border-destructive/10", text: "Sua verificação foi recusada. Envie novamente." },
    };
    const c = configs[kycStatus];
    const Icon = c.icon;
    return (
      <div className={`flex items-start gap-3 p-3 md:p-4 border rounded-xl mb-6 md:mb-8 ${c.color}`}>
        <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs md:text-sm">
          <p className="font-medium text-foreground">Verificação KYC</p>
          <p className="text-muted-foreground mt-0.5">{c.text}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-bottom-nav">
      <Navbar />
      <div className="flex-1">
        <div className="container py-4 md:py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-display font-bold">Carteira</h1>
              <p className="text-muted-foreground text-xs md:text-base">Gerencie seus ganhos e saques via Pix.</p>
            </div>
          </div>
        </div>

        <div className="container pb-8 md:pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {kycBanner()}

              {/* Balance cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                <div className="bg-card border border-border rounded-xl p-4 md:p-5 space-y-1.5 md:space-y-2">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-warning" />
                    Saldo retido
                  </div>
                  <p className="text-xl md:text-2xl font-display font-bold text-warning">
                    R$ {pendingBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Liberado após o evento</p>
                </div>

                <div className="bg-card border border-success/20 rounded-xl p-4 md:p-5 space-y-1.5 md:space-y-2">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4 text-success" />
                    Disponível para saque
                  </div>
                  <p className="text-xl md:text-2xl font-display font-bold text-success">
                    R$ {availableBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  {availableBalance > 0 && (
                    <Button size="sm" className="rounded-lg text-xs gap-1.5 mt-1" onClick={() => setWithdrawDialog(true)}>
                      <Zap className="w-3.5 h-3.5" /> Sacar via Pix
                    </Button>
                  )}
                </div>

                <div className="bg-card border border-border rounded-xl p-4 md:p-5 space-y-1.5 md:space-y-2">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                    <ArrowUpCircle className="w-4 h-4" />
                    Total sacado
                  </div>
                  <p className="text-xl md:text-2xl font-display font-bold text-foreground">
                    R$ {totalWithdrawn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-3 p-3 md:p-4 bg-primary/5 border border-primary/10 rounded-xl mb-6 md:mb-8">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs md:text-sm">
                  <p className="font-medium text-foreground">Como funciona?</p>
                  <p className="text-muted-foreground mt-0.5">
                    Quando um comprador paga, o valor fica <strong>retido</strong> até o evento. Após, é liberado para saque instantâneo via <strong>Pix</strong>.
                  </p>
                </div>
              </div>

              {/* Pix key info */}
              {profile?.pix_key && (
                <div className="flex items-center gap-3 p-3 md:p-4 bg-card border border-border rounded-xl mb-6 md:mb-8">
                  <Smartphone className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-medium">Chave Pix cadastrada</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      {PIX_KEY_TYPES.find(t => t.value === profile.pix_key_type)?.label || "Chave"}: {profile.pix_key}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => setWithdrawDialog(true)}>
                    Alterar
                  </Button>
                </div>
              )}

              {/* Transaction history */}
              <h2 className="text-base md:text-lg font-display font-semibold mb-3 md:mb-4">Histórico de transações</h2>
              {transactions.length === 0 ? (
                <div className="text-center py-12 md:py-16 space-y-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                    <Wallet className="w-7 h-7 md:w-8 md:h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-base md:text-lg">Nenhuma transação</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Quando você vender um ingresso, as transações aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {transactions.map((tx) => {
                    const config = statusConfig[tx.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <div key={tx.id} className="bg-card border border-border rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${tx.type === "sale" ? "bg-success/10" : "bg-destructive/10"}`}>
                              {tx.type === "sale" ? (
                                <ArrowDownCircle className="w-4 h-4 md:w-5 md:h-5 text-success" />
                              ) : (
                                <ArrowUpCircle className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs md:text-sm font-medium text-foreground truncate">{tx.event_name || tx.description || "Transação"}</p>
                              <p className="text-[10px] md:text-xs text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 shrink-0">
                            <Badge className={`text-[10px] md:text-xs gap-0.5 md:gap-1 ${config.className}`}>
                              <StatusIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                              {config.label}
                            </Badge>
                            <span className={`font-display font-bold text-sm md:text-lg ${tx.type === "sale" ? "text-success" : "text-destructive"}`}>
                              {tx.type === "sale" ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {tx.type === "sale" && (tx.platform_fee || tx.released_at || tx.estimated_release) && (
                          <div className="bg-muted/30 rounded-lg px-3 py-2 text-[10px] md:text-xs text-muted-foreground space-y-1 ml-10 md:ml-13">
                            {tx.platform_fee != null && (
                              <>
                                <div className="flex justify-between">
                                  <span>Valor bruto</span>
                                  <span>R$ {(tx.amount + tx.platform_fee).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Taxa Tiko Pass</span>
                                  <span>- R$ {tx.platform_fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between font-medium text-foreground border-t border-border pt-1">
                                  <span>Valor líquido</span>
                                  <span>R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                </div>
                              </>
                            )}
                            {tx.released_at && (
                              <div className="flex justify-between pt-1">
                                <span>Liberado em</span>
                                <span>{new Date(tx.released_at).toLocaleDateString("pt-BR")}</span>
                              </div>
                            )}
                            {tx.withdrawn_at && (
                              <div className="flex justify-between">
                                <span>Sacado em</span>
                                <span>{new Date(tx.withdrawn_at).toLocaleDateString("pt-BR")}</span>
                              </div>
                            )}
                            {!tx.released_at && tx.estimated_release && tx.status === "pending" && (
                              <div className="flex justify-between">
                                <span>Liberação prevista</span>
                                <span>{new Date(tx.estimated_release).toLocaleDateString("pt-BR")}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {user && (
        <KycWithdrawalFlow
          open={withdrawDialog}
          onOpenChange={setWithdrawDialog}
          userId={user.id}
          kycStatus={kycStatus}
          availableBalance={availableBalance}
          existingPixKey={profile?.pix_key}
          existingPixKeyType={profile?.pix_key_type}
          existingDob={(profile as any)?.date_of_birth}
          onSuccess={() => { loadWallet(); refreshProfile(); }}
        />
      )}

      <Footer />
    </div>
  );
}
