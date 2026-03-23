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
  TrendingUp, ShieldCheck, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

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
};

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "Retido", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  available: { label: "Disponível", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  withdrawn: { label: "Sacado", icon: ArrowUpCircle, className: "bg-muted text-muted-foreground border-muted" },
  refunded: { label: "Estornado", icon: RefreshCw, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function WalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

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
      setTransactions((data as WalletTransaction[]) || []);
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

  const handleWithdraw = () => {
    toast.info("Funcionalidade de saque em breve! Entre em contato com o suporte para solicitar.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <div className="container py-8">
          <h1 className="text-3xl font-display font-bold">Carteira</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus ganhos e saques.</p>
        </div>

        <div className="container pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Balance cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-card border border-border rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-warning" />
                    Saldo retido
                  </div>
                  <p className="text-2xl font-display font-bold text-warning">
                    R$ {pendingBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Liberado após o evento</p>
                </div>

                <div className="bg-card border border-success/20 rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4 text-success" />
                    Disponível para saque
                  </div>
                  <p className="text-2xl font-display font-bold text-success">
                    R$ {availableBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  {availableBalance > 0 && (
                    <Button size="sm" className="rounded-lg text-xs gap-1 mt-1" onClick={handleWithdraw}>
                      <ArrowUpCircle className="w-3 h-3" /> Solicitar saque
                    </Button>
                  )}
                </div>

                <div className="bg-card border border-border rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowUpCircle className="w-4 h-4" />
                    Total sacado
                  </div>
                  <p className="text-2xl font-display font-bold text-foreground">
                    R$ {totalWithdrawn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-xl mb-8">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Como funciona o escrow?</p>
                  <p className="text-muted-foreground mt-0.5">
                    Quando um comprador paga, o valor é <strong>retido pela plataforma</strong> até que o evento aconteça. 
                    Após 2 horas do fim do evento, o pagamento é automaticamente liberado para saque. 
                    Isso protege compradores contra fraudes.
                  </p>
                </div>
              </div>

              {/* Transaction history */}
              <h2 className="text-lg font-display font-semibold mb-4">Histórico de transações</h2>
              {transactions.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                    <Wallet className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg">Nenhuma transação</h3>
                  <p className="text-sm text-muted-foreground">Quando você vender um ingresso, as transações aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const config = statusConfig[tx.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <div key={tx.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === "sale" ? "bg-success/10" : "bg-destructive/10"}`}>
                            {tx.type === "sale" ? (
                              <ArrowDownCircle className="w-5 h-5 text-success" />
                            ) : (
                              <ArrowUpCircle className="w-5 h-5 text-destructive" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{tx.description || "Transação"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                              {tx.released_at && ` · Liberado em ${new Date(tx.released_at).toLocaleDateString("pt-BR")}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`text-xs gap-1 ${config.className}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                          <span className={`font-display font-bold text-lg ${tx.type === "sale" ? "text-success" : "text-destructive"}`}>
                            {tx.type === "sale" ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
