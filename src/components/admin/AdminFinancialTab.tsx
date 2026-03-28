import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Clock,
  CheckCircle2, XCircle, ArrowUpCircle, Loader2, PieChart,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from "recharts";

type NegotiationRow = {
  id: string;
  status: string;
  offer_price: number;
  counter_offer_price: number | null;
  platform_fee: number | null;
  payment_status: string | null;
  created_at: string;
};

type WalletRow = {
  id: string;
  amount: number;
  status: string;
  type: string;
  created_at: string;
};

const COLORS = ["hsl(142, 76%, 36%)", "hsl(48, 96%, 53%)", "hsl(221, 83%, 53%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)"];

export default function AdminFinancialTab() {
  const [negotiations, setNegotiations] = useState<NegotiationRow[]>([]);
  const [walletTx, setWalletTx] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [negRes, walRes] = await Promise.all([
      supabase.from("negotiations").select("id, status, offer_price, counter_offer_price, platform_fee, payment_status, created_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("wallet_transactions").select("id, amount, status, type, created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    setNegotiations((negRes.data as NegotiationRow[]) || []);
    setWalletTx((walRes.data as WalletRow[]) || []);
    setLoading(false);
  };

  // Negotiation stats
  const totalNeg = negotiations.length;
  const accepted = negotiations.filter(n => n.status === "accepted" || n.payment_status === "paid").length;
  const rejected = negotiations.filter(n => n.status === "rejected" || n.status === "cancelled").length;
  const pending = negotiations.filter(n => n.status === "pending" || n.status === "counter").length;
  const paid = negotiations.filter(n => n.payment_status === "paid");
  const totalGMV = paid.reduce((s, n) => s + (n.counter_offer_price || n.offer_price), 0);
  const totalFees = paid.reduce((s, n) => s + (n.platform_fee || 0), 0);

  // Wallet stats
  const walletPending = walletTx.filter(w => w.status === "pending").reduce((s, w) => s + w.amount, 0);
  const walletAvailable = walletTx.filter(w => w.status === "available").reduce((s, w) => s + w.amount, 0);
  const walletWithdrawn = walletTx.filter(w => w.status === "withdrawn").reduce((s, w) => s + w.amount, 0);

  // Negotiation status pie
  const pieData = [
    { name: "Aceitas", value: accepted },
    { name: "Pendentes", value: pending },
    { name: "Recusadas", value: rejected },
  ].filter(d => d.value > 0);

  // Monthly bar chart (last 6 months)
  const monthlyData = (() => {
    const months: Record<string, { month: string; gmv: number; fees: number; count: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      months[key] = { month: label, gmv: 0, fees: 0, count: 0 };
    }
    paid.forEach(n => {
      const key = n.created_at.slice(0, 7);
      if (months[key]) {
        months[key].gmv += n.counter_offer_price || n.offer_price;
        months[key].fees += n.platform_fee || 0;
        months[key].count += 1;
      }
    });
    return Object.values(months);
  })();

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={BarChart3} label="Total de negociações" value={totalNeg.toString()} color="text-primary" />
        <KPICard icon={DollarSign} label="GMV (Volume bruto)" value={fmt(totalGMV)} color="text-emerald-600" />
        <KPICard icon={TrendingUp} label="Receita da plataforma" value={fmt(totalFees)} color="text-blue-600" />
        <KPICard icon={CheckCircle2} label="Taxa de conversão" value={totalNeg > 0 ? `${((accepted / totalNeg) * 100).toFixed(1)}%` : "0%"} color="text-emerald-600" />
      </div>

      {/* Negotiation breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniCard icon={Clock} label="Pendentes" value={pending} color="text-yellow-600" bgColor="bg-yellow-500/10" />
        <MiniCard icon={CheckCircle2} label="Aceitas / Pagas" value={accepted} color="text-emerald-600" bgColor="bg-emerald-500/10" />
        <MiniCard icon={XCircle} label="Recusadas / Canceladas" value={rejected} color="text-destructive" bgColor="bg-destructive/10" />
        <MiniCard icon={ArrowUpCircle} label="Total transações carteira" value={walletTx.length} color="text-blue-600" bgColor="bg-blue-500/10" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly bar chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Volume mensal (últimos 6 meses)
          </h3>
          {monthlyData.some(m => m.gmv > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={v => `R$${(v / 100).toFixed(0)}`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="gmv" name="GMV" fill="hsl(142, 76%, 36%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="fees" name="Receita plataforma" fill="hsl(221, 83%, 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Nenhuma transação ainda</div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" /> Status das negociações
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RPieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </RPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Sem dados</div>
          )}
        </div>
      </div>

      {/* Wallet overview */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> Visão geral das carteiras (todos os vendedores)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-yellow-500/10 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">Saldo retido total</p>
            <p className="text-xl font-bold text-yellow-600">{fmt(walletPending)}</p>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">Disponível para saque</p>
            <p className="text-xl font-bold text-emerald-600">{fmt(walletAvailable)}</p>
          </div>
          <div className="bg-blue-500/10 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground">Total sacado</p>
            <p className="text-xl font-bold text-blue-600">{fmt(walletWithdrawn)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`w-4 h-4 ${color}`} />
        {label}
      </div>
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MiniCard({ icon: Icon, label, value, color, bgColor }: { icon: any; label: string; value: number; color: string; bgColor: string }) {
  return (
    <div className={`${bgColor} rounded-xl p-4 text-center`}>
      <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
