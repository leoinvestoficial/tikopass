import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Search, ArrowLeft, Users, Ticket, RefreshCw, BarChart3, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import AdminTicketsTab from "@/components/admin/AdminTicketsTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminFinancialTab from "@/components/admin/AdminFinancialTab";
import AdminWalletsTab from "@/components/admin/AdminWalletsTab";

const ADMIN_EMAILS = ["leonardovarelamaia@gmail.com", "leonardo@bebaflow.com"];

type TabType = "tickets" | "users" | "financial" | "wallets";

const TABS: { id: TabType; label: string; icon: any }[] = [
  { id: "tickets", label: "Ingressos", icon: Ticket },
  { id: "users", label: "Usuários", icon: Users },
  { id: "financial", label: "Financeiro", icon: BarChart3 },
  { id: "wallets", label: "Carteiras", icon: Wallet },
];

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("tickets");
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (user && !isAdmin) {
      navigate("/");
      toast.error("Acesso restrito");
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      if (tab === "tickets") fetchTickets();
      else if (tab === "users") fetchUsers();
    }
  }, [tab, isAdmin]);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tickets")
      .select("*, events(name, city, date, venue, category, time)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data && data.length > 0) {
      const sellerIds = [...new Set(data.map((t) => t.seller_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, phone")
        .in("user_id", sellerIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      setTickets(data.map((t) => ({ ...t, seller_profile: profileMap.get(t.seller_id) })));
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    setUsers(data || []);
    setLoading(false);
  };

  const handleRefresh = () => {
    if (tab === "tickets") fetchTickets();
    else if (tab === "users") fetchUsers();
  };

  // Stats
  const ticketStats = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === "pending_validation").length,
    available: tickets.filter((t) => t.status === "available" || t.status === "validated").length,
    sold: tickets.filter((t) => t.status === "sold").length,
    rejected: tickets.filter((t) => t.status === "rejected").length,
  };

  // Filtered data
  const filteredTickets = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      t.events?.name?.toLowerCase().includes(q) ||
      t.status?.includes(q) ||
      t.id?.includes(q) ||
      t.seller_profile?.display_name?.toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.display_name?.toLowerCase().includes(q) ||
      u.cpf?.includes(q) ||
      u.phone?.includes(q) ||
      u.address_city?.toLowerCase().includes(q) ||
      u.city?.toLowerCase().includes(q)
    );
  });

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" /> Painel Administrativo
              </h1>
              <p className="text-sm text-muted-foreground">Governança e gestão da plataforma</p>
            </div>
          </div>
          {(tab === "tickets" || tab === "users") && (
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
          )}
        </div>

        {/* Stats Cards (tickets tab only) */}
        {tab === "tickets" && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: ticketStats.total, color: "text-foreground" },
              { label: "Aguardando", value: ticketStats.pending, color: "text-yellow-600" },
              { label: "Disponíveis", value: ticketStats.available, color: "text-emerald-600" },
              { label: "Vendidos", value: ticketStats.sold, color: "text-blue-600" },
              { label: "Rejeitados", value: ticketStats.rejected, color: "text-destructive" },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSearch("");
              }}
              className={`flex-1 min-w-[120px] py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Search (tickets & users tabs) */}
        {(tab === "tickets" || tab === "users") && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={
                tab === "tickets"
                  ? "Buscar por evento, status, vendedor..."
                  : "Buscar por nome, CPF, telefone, cidade..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        )}

        {/* Content */}
        {loading && (tab === "tickets" || tab === "users") ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <>
            {tab === "tickets" && <AdminTicketsTab tickets={filteredTickets} onRefresh={fetchTickets} />}
            {tab === "users" && <AdminUsersTab users={filteredUsers} onRefresh={fetchUsers} />}
            {tab === "financial" && <AdminFinancialTab />}
            {tab === "wallets" && <AdminWalletsTab />}
          </>
        )}
      </div>
    </div>
  );
}
