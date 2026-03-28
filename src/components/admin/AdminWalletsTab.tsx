import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Wallet, Loader2, ChevronDown, ChevronUp, Search, User,
  Clock, CheckCircle2, ArrowUpCircle, RefreshCw, DollarSign,
} from "lucide-react";

type UserWallet = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  pending: number;
  available: number;
  withdrawn: number;
  transactions: WalletTx[];
};

type WalletTx = {
  id: string;
  amount: number;
  status: string;
  type: string;
  description: string | null;
  created_at: string;
  released_at: string | null;
  withdrawn_at: string | null;
};

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "Retido", icon: Clock, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  available: { label: "Disponível", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  withdrawn: { label: "Sacado", icon: ArrowUpCircle, className: "bg-muted text-muted-foreground border-muted" },
  refunded: { label: "Estornado", icon: RefreshCw, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function AdminWalletsTab() {
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { loadWallets(); }, []);

  const loadWallets = async () => {
    setLoading(true);
    const [txRes, profilesRes] = await Promise.all([
      supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("profiles").select("user_id, display_name, avatar_url, pix_key, pix_key_type"),
    ]);

    const txData = (txRes.data || []) as WalletTx[];
    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));

    // Group by user
    const userMap = new Map<string, UserWallet>();
    txData.forEach(tx => {
      const uid = (tx as any).user_id;
      if (!userMap.has(uid)) {
        const profile = profileMap.get(uid);
        userMap.set(uid, {
          user_id: uid,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          pix_key: profile?.pix_key || null,
          pix_key_type: profile?.pix_key_type || null,
          pending: 0,
          available: 0,
          withdrawn: 0,
          transactions: [],
        });
      }
      const w = userMap.get(uid)!;
      w.transactions.push(tx);
      if (tx.status === "pending" && tx.type === "sale") w.pending += tx.amount;
      if (tx.status === "available" && tx.type === "sale") w.available += tx.amount;
      if (tx.status === "withdrawn") w.withdrawn += tx.amount;
    });

    // Also add users with profiles but no transactions (show 0 balance)
    // Skipping for performance — only show users with wallet activity

    setWallets(Array.from(userMap.values()).sort((a, b) => (b.pending + b.available) - (a.pending + a.available)));
    setLoading(false);
  };

  const filtered = wallets.filter(w => {
    if (!search) return true;
    const q = search.toLowerCase();
    return w.display_name?.toLowerCase().includes(q) || w.user_id.includes(q);
  });

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar vendedor por nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-yellow-500/10 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Retido total</p>
          <p className="text-xl font-bold text-yellow-600">{fmt(wallets.reduce((s, w) => s + w.pending, 0))}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Disponível total</p>
          <p className="text-xl font-bold text-emerald-600">{fmt(wallets.reduce((s, w) => s + w.available, 0))}</p>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Sacado total</p>
          <p className="text-xl font-bold text-blue-600">{fmt(wallets.reduce((s, w) => s + w.withdrawn, 0))}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhuma carteira com atividade encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(w => {
            const isOpen = expandedUser === w.user_id;
            return (
              <div key={w.user_id} className="bg-card rounded-xl border border-border hover:border-primary/20 transition-colors overflow-hidden">
                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedUser(isOpen ? null : w.user_id)}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {w.avatar_url ? <img src={w.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-primary/50" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{w.display_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.transactions.length} transações · Pix: {w.pix_key ? `${w.pix_key_type} — ${w.pix_key}` : "Não cadastrada"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-sm">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Retido</p>
                      <p className="font-bold text-yellow-600">{fmt(w.pending)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Disponível</p>
                      <p className="font-bold text-emerald-600">{fmt(w.available)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Sacado</p>
                      <p className="font-bold text-blue-600">{fmt(w.withdrawn)}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border p-4 bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Mobile balances */}
                    <div className="grid grid-cols-3 gap-2 sm:hidden">
                      <div className="bg-yellow-500/10 rounded-lg p-2 text-center"><p className="text-[10px] text-muted-foreground">Retido</p><p className="font-bold text-sm text-yellow-600">{fmt(w.pending)}</p></div>
                      <div className="bg-emerald-500/10 rounded-lg p-2 text-center"><p className="text-[10px] text-muted-foreground">Disponível</p><p className="font-bold text-sm text-emerald-600">{fmt(w.available)}</p></div>
                      <div className="bg-blue-500/10 rounded-lg p-2 text-center"><p className="text-[10px] text-muted-foreground">Sacado</p><p className="font-bold text-sm text-blue-600">{fmt(w.withdrawn)}</p></div>
                    </div>

                    <p className="text-xs text-muted-foreground font-medium">Histórico de transações</p>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {w.transactions.map(tx => {
                        const config = statusConfig[tx.status] || statusConfig.pending;
                        const StatusIcon = config.icon;
                        return (
                          <div key={tx.id} className="flex items-center justify-between gap-3 bg-background rounded-lg p-3 border border-border text-sm">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs truncate">{tx.description || "Transação"}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                                {tx.released_at && ` · Liberado ${new Date(tx.released_at).toLocaleDateString("pt-BR")}`}
                                {tx.withdrawn_at && ` · Sacado ${new Date(tx.withdrawn_at).toLocaleDateString("pt-BR")}`}
                              </p>
                            </div>
                            <Badge className={`text-[10px] gap-1 ${config.className}`}>
                              <StatusIcon className="w-2.5 h-2.5" />{config.label}
                            </Badge>
                            <span className={`font-bold text-sm ${tx.type === "sale" ? "text-emerald-600" : "text-destructive"}`}>
                              {tx.type === "sale" ? "+" : "-"}{fmt(tx.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
