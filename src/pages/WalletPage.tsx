import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet, Loader2, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2, RefreshCw,
  TrendingUp, ShieldCheck, AlertCircle, Zap, Smartphone,
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

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave aleatória" },
];

export default function WalletPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadWallet();
  }, [user]);

  useEffect(() => {
    if (profile?.pix_key) setPixKey(profile.pix_key);
    if (profile?.pix_key_type) setPixKeyType(profile.pix_key_type);
  }, [profile]);

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

  const handleWithdraw = async () => {
    if (!pixKey || !pixKeyType) {
      toast.error("Informe sua chave Pix para sacar.");
      return;
    }
    setWithdrawing(true);
    try {
      // Save pix key to profile
      await supabase.from("profiles").update({
        pix_key: pixKey,
        pix_key_type: pixKeyType,
      }).eq("user_id", user!.id);

      // Call withdrawal edge function
      const { data, error } = await supabase.functions.invoke("request-withdrawal", {
        body: { pix_key: pixKey, pix_key_type: pixKeyType, amount: availableBalance },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Saque solicitado! O Pix será enviado em instantes.");
      setWithdrawDialog(false);
      loadWallet();
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar saque.");
    } finally {
      setWithdrawing(false);
    }
  };

  const formatPixKey = (value: string, type: string) => {
    if (type === "cpf") {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    if (type === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 13);
      if (digits.length <= 2) return `+${digits}`;
      if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return value;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <div className="container py-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">Carteira</h1>
              <p className="text-muted-foreground">Gerencie seus ganhos e saques via Pix.</p>
            </div>
          </div>
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
                  <p className="text-xs text-muted-foreground">Liberado automaticamente após o evento</p>
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
                    <Button size="sm" className="rounded-lg text-xs gap-1.5 mt-1" onClick={() => setWithdrawDialog(true)}>
                      <Zap className="w-3.5 h-3.5" /> Sacar via Pix
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
                  <p className="font-medium text-foreground">Como funciona?</p>
                  <p className="text-muted-foreground mt-0.5">
                    Quando um comprador paga, o valor fica <strong>retido pela plataforma</strong> até que o evento aconteça.
                    Após o evento, o pagamento é automaticamente liberado para saque.
                    Você saca instantaneamente via <strong>Pix</strong> — o dinheiro cai na sua conta em segundos.
                  </p>
                </div>
              </div>

              {/* Pix key info */}
              {profile?.pix_key && (
                <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl mb-8">
                  <Smartphone className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Chave Pix cadastrada</p>
                    <p className="text-xs text-muted-foreground">
                      {PIX_KEY_TYPES.find(t => t.value === profile.pix_key_type)?.label || "Chave"}: {profile.pix_key}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => setWithdrawDialog(true)}>
                    Alterar
                  </Button>
                </div>
              )}

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
                              {tx.withdrawn_at && ` · Sacado em ${new Date(tx.withdrawn_at).toLocaleDateString("pt-BR")}`}
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

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Sacar via Pix
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="bg-success/10 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Valor disponível</p>
              <p className="text-2xl font-display font-bold text-success">
                R$ {availableBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de chave Pix</label>
                <Select value={pixKeyType} onValueChange={setPixKeyType}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PIX_KEY_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Chave Pix</label>
                <Input
                  placeholder={
                    pixKeyType === "cpf" ? "000.000.000-00" :
                    pixKeyType === "email" ? "email@exemplo.com" :
                    pixKeyType === "phone" ? "+55 11 99999-9999" :
                    "Cole sua chave aleatória"
                  }
                  value={pixKey}
                  onChange={(e) => setPixKey(
                    pixKeyType === "cpf" || pixKeyType === "phone"
                      ? formatPixKey(e.target.value, pixKeyType)
                      : e.target.value
                  )}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>O valor será transferido instantaneamente para a chave Pix informada. Confira os dados antes de confirmar.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWithdrawDialog(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={!pixKey || !pixKeyType || withdrawing || availableBalance <= 0}
              className="rounded-xl gap-2"
            >
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Confirmar saque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
