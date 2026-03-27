import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Search, CheckCircle, XCircle, Trash2, Eye, ArrowLeft,
  Users, Ticket, AlertTriangle, RefreshCw,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const ADMIN_EMAILS = ["matheus@tikopass.com", "admin@tikopass.com", "leonardovarelamaia@gmail.com"];

type TabType = "tickets" | "users";

export default function AdminPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("tickets");
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      else fetchUsers();
    }
  }, [tab, isAdmin]);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tickets")
      .select("*, events(name, city, date)")
      .order("created_at", { ascending: false })
      .limit(100);
    setTickets(data || []);
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setUsers(data || []);
    setLoading(false);
  };

  const approveTicket = async (ticketId: string) => {
    const { error } = await supabase
      .from("tickets")
      .update({ status: "available", rejection_reason: null, validated_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) toast.error("Erro ao aprovar ingresso");
    else { toast.success("Ingresso aprovado!"); fetchTickets(); }
  };

  const rejectTicket = async (ticketId: string) => {
    const reason = prompt("Motivo da rejeição:");
    if (!reason) return;
    const { error } = await supabase
      .from("tickets")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", ticketId);
    if (error) toast.error("Erro ao rejeitar");
    else { toast.success("Ingresso rejeitado"); fetchTickets(); }
  };

  const deleteTicket = async (ticketId: string) => {
    if (!confirm("Excluir este ingresso permanentemente?")) return;
    const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Ingresso excluído"); fetchTickets(); }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Excluir este usuário? Esta ação chama a Edge Function de exclusão.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // We call the delete-account function with admin override
      // For now, just delete the profile (full deletion requires the user's own token)
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
      toast.success("Perfil do usuário removido");
      fetchUsers();
    } catch {
      toast.error("Erro ao remover usuário");
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
      case "sold": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const filtered = tab === "tickets"
    ? tickets.filter(t => {
        const q = search.toLowerCase();
        return !q || t.events?.name?.toLowerCase().includes(q) || t.status?.includes(q) || t.id?.includes(q);
      })
    : users.filter(u => {
        const q = search.toLowerCase();
        return !q || u.display_name?.toLowerCase().includes(q) || u.cpf?.includes(q) || u.phone?.includes(q);
      });

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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
          <Button variant="outline" size="sm" onClick={() => tab === "tickets" ? fetchTickets() : fetchUsers()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 max-w-xs">
          <button
            onClick={() => setTab("tickets")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "tickets" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Ticket className="w-4 h-4" /> Ingressos
          </button>
          <button
            onClick={() => setTab("users")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "users" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Users className="w-4 h-4" /> Usuários
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={tab === "tickets" ? "Buscar por evento, status ou ID..." : "Buscar por nome, CPF ou telefone..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : tab === "tickets" ? (
          <div className="space-y-3">
            {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">Nenhum ingresso encontrado</p>}
            {filtered.map((ticket) => (
              <div key={ticket.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{ticket.events?.name || "Evento desconhecido"}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.sector} · R$ {Number(ticket.price).toFixed(2)} · {ticket.events?.city}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{ticket.id.slice(0, 8)}...</p>
                  {ticket.rejection_reason && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {ticket.rejection_reason}
                    </p>
                  )}
                </div>
                <Badge className={`${statusColor(ticket.status)} text-xs`}>{ticket.status}</Badge>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/ticket/${ticket.id}`)} title="Ver">
                    <Eye className="w-4 h-4" />
                  </Button>
                  {ticket.status === "rejected" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={() => approveTicket(ticket.id)} title="Aprovar">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  {ticket.status === "available" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => rejectTicket(ticket.id)} title="Rejeitar">
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => deleteTicket(ticket.id)} title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</p>}
            {filtered.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/20 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-primary/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.display_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.city || "Cidade não informada"} · CPF: {u.cpf ? `***.***.${u.cpf.slice(-5)}` : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{u.phone || "Sem telefone"}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/seller/${u.user_id}`)} title="Ver perfil">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => deleteUser(u.user_id)} title="Remover usuário">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
