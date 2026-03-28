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
  Users, Ticket, AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
  MapPin, Phone, FileText, Download, Calendar, DollarSign, User,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const ADMIN_EMAILS = ["matheus@tikopass.com", "admin@tikopass.com", "leonardovarelamaia@gmail.com"];

type TabType = "tickets" | "users";

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("tickets");
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [userTickets, setUserTickets] = useState<Record<string, any[]>>({});
  const [ticketFileUrl, setTicketFileUrl] = useState<Record<string, string>>({});

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
      .select("*, events(name, city, date, venue, category, time)")
      .order("created_at", { ascending: false })
      .limit(200);

    // Fetch seller profiles
    if (data && data.length > 0) {
      const sellerIds = [...new Set(data.map(t => t.seller_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, phone").in("user_id", sellerIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      setTickets(data.map(t => ({ ...t, seller_profile: profileMap.get(t.seller_id) })));
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setUsers(data || []);
    setLoading(false);
  };

  const fetchUserTickets = async (userId: string) => {
    const { data } = await supabase
      .from("tickets")
      .select("*, events(name, city, date)")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });
    setUserTickets(prev => ({ ...prev, [userId]: data || [] }));
  };

  const getTicketFileUrl = async (ticketId: string, storagePath: string) => {
    if (ticketFileUrl[ticketId]) return;
    const { data } = await supabase.storage.from("tickets-custody").createSignedUrl(storagePath, 300);
    if (data?.signedUrl) {
      setTicketFileUrl(prev => ({ ...prev, [ticketId]: data.signedUrl }));
    }
  };

  const toggleUser = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userTickets[userId]) fetchUserTickets(userId);
    }
  };

  const toggleTicket = (ticketId: string, storagePath?: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
    } else {
      setExpandedTicket(ticketId);
      if (storagePath) getTicketFileUrl(ticketId, storagePath);
    }
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
    if (!confirm("Excluir este usuário? O perfil será removido permanentemente.")) return;
    try {
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
      case "available": case "validated": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
      case "sold": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "pending_validation": case "pending": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "available": return "Disponível";
      case "validated": return "Validado";
      case "rejected": return "Rejeitado";
      case "sold": return "Vendido";
      case "pending_validation": return "Aguardando validação";
      case "pending": return "Pendente";
      default: return status;
    }
  };

  const filtered = tab === "tickets"
    ? tickets.filter(t => {
        const q = search.toLowerCase();
        return !q || t.events?.name?.toLowerCase().includes(q) || t.status?.includes(q) || t.id?.includes(q) ||
          t.seller_profile?.display_name?.toLowerCase().includes(q);
      })
    : users.filter(u => {
        const q = search.toLowerCase();
        return !q || u.display_name?.toLowerCase().includes(q) || u.cpf?.includes(q) || u.phone?.includes(q) ||
          u.address_city?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q);
      });

  // Stats
  const ticketStats = {
    total: tickets.length,
    pending: tickets.filter(t => t.status === "pending_validation").length,
    available: tickets.filter(t => t.status === "available" || t.status === "validated").length,
    sold: tickets.filter(t => t.status === "sold").length,
    rejected: tickets.filter(t => t.status === "rejected").length,
  };

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
          <Button variant="outline" size="sm" onClick={() => tab === "tickets" ? fetchTickets() : fetchUsers()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        {tab === "tickets" && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: ticketStats.total, color: "text-foreground" },
              { label: "Aguardando", value: ticketStats.pending, color: "text-yellow-600" },
              { label: "Disponíveis", value: ticketStats.available, color: "text-emerald-600" },
              { label: "Vendidos", value: ticketStats.sold, color: "text-blue-600" },
              { label: "Rejeitados", value: ticketStats.rejected, color: "text-destructive" },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

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
            <Users className="w-4 h-4" /> Usuários ({users.length || "..."})
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={tab === "tickets" ? "Buscar por evento, status, vendedor..." : "Buscar por nome, CPF, telefone, cidade..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : tab === "tickets" ? (
          <div className="space-y-2">
            {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">Nenhum ingresso encontrado</p>}
            {filtered.map((ticket) => (
              <div key={ticket.id} className="bg-card rounded-xl border border-border hover:border-primary/20 transition-colors overflow-hidden">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => toggleTicket(ticket.id, ticket.storage_path)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{ticket.events?.name || "Evento desconhecido"}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.sector} · R$ {Number(ticket.price).toFixed(2)} · {ticket.events?.city} · {ticket.events?.date}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vendedor: {ticket.seller_profile?.display_name || "Desconhecido"} · <span className="font-mono">{ticket.id.slice(0, 8)}</span>
                    </p>
                  </div>
                  <Badge className={`${statusColor(ticket.status)} text-xs shrink-0`}>{statusLabel(ticket.status)}</Badge>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(ticket.status === "pending_validation" || ticket.status === "rejected") && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); approveTicket(ticket.id); }} title="Aprovar">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {(ticket.status === "available" || ticket.status === "validated" || ticket.status === "pending_validation") && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); rejectTicket(ticket.id); }} title="Rejeitar">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteTicket(ticket.id); }} title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {expandedTicket === ticket.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedTicket === ticket.id && (
                  <div className="border-t border-border p-4 bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Evento</p>
                        <p className="font-medium">{ticket.events?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Local</p>
                        <p>{ticket.events?.venue}, {ticket.events?.city}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Data / Hora</p>
                        <p>{ticket.events?.date} · {ticket.events?.time}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Categoria</p>
                        <p>{ticket.events?.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Setor / Fila / Assento</p>
                        <p>{ticket.sector} {ticket.row && `· Fila ${ticket.row}`} {ticket.seat && `· ${ticket.seat}`}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Preço anunciado</p>
                        <p className="font-bold text-emerald-600">R$ {Number(ticket.price).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Preço original</p>
                        <p>{ticket.original_price ? `R$ ${Number(ticket.original_price).toFixed(2)}` : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Criado em</p>
                        <p>{new Date(ticket.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>

                    {ticket.rejection_reason && (
                      <div className="bg-destructive/10 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Motivo da rejeição</p>
                          <p className="text-sm text-destructive/80">{ticket.rejection_reason}</p>
                        </div>
                      </div>
                    )}

                    {/* Ticket file preview */}
                    {ticket.storage_path && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Arquivo do ingresso
                        </p>
                        {ticketFileUrl[ticket.id] ? (
                          <div className="space-y-2">
                            {ticket.storage_path.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                              <img src={ticketFileUrl[ticket.id]} alt="Ingresso" className="max-w-md rounded-lg border border-border" />
                            ) : (
                              <iframe src={ticketFileUrl[ticket.id]} className="w-full max-w-md h-96 rounded-lg border border-border" />
                            )}
                            <a href={ticketFileUrl[ticket.id]} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="gap-2">
                                <Download className="w-4 h-4" /> Baixar arquivo
                              </Button>
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Carregando arquivo...</p>
                        )}
                      </div>
                    )}

                    {/* Seller info */}
                    <div className="bg-card rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Vendedor
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {ticket.seller_profile?.avatar_url ? (
                            <img src={ticket.seller_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-primary/50" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{ticket.seller_profile?.display_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{ticket.seller_profile?.phone || "Sem telefone"} · ID: {ticket.seller_id.slice(0, 8)}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => navigate(`/seller/${ticket.seller_id}`)}>
                          Ver perfil
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</p>}
            {filtered.map((u) => (
              <div key={u.id} className="bg-card rounded-xl border border-border hover:border-primary/20 transition-colors overflow-hidden">
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => toggleUser(u.user_id)}
                >
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
                      {u.address_city || u.city || "Cidade não informada"}{u.address_state ? ` - ${u.address_state}` : ""} · {u.phone || "Sem telefone"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/seller/${u.user_id}`); }} title="Ver perfil público">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteUser(u.user_id); }} title="Remover usuário">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {expandedUser === u.user_id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedUser === u.user_id && (
                  <div className="border-t border-border p-4 bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Nome completo</p>
                        <p className="font-medium">{u.display_name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">CPF</p>
                        <p className="font-mono">{u.cpf || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Telefone</p>
                        <p>{u.phone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Cadastrado em</p>
                        <p>{new Date(u.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Cidade (perfil)</p>
                        <p>{u.city || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Bio</p>
                        <p className="truncate">{u.bio || "N/A"}</p>
                      </div>
                    </div>

                    {/* Full Address */}
                    <div className="bg-card rounded-lg p-3 border border-border">
                      <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Endereço completo
                      </p>
                      {u.address_street ? (
                        <div className="text-sm space-y-1">
                          <p>
                            {u.address_street}, {u.address_number || "S/N"}
                            {u.address_complement && ` — ${u.address_complement}`}
                          </p>
                          <p>{u.address_neighborhood || ""}</p>
                          <p>{u.address_city || ""}{u.address_state ? ` - ${u.address_state}` : ""}</p>
                          <p className="font-mono text-muted-foreground">CEP: {u.address_cep || "N/A"}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Endereço não informado</p>
                      )}
                    </div>

                    {/* Pix key */}
                    {(u.pix_key || u.pix_key_type) && (
                      <div className="bg-card rounded-lg p-3 border border-border">
                        <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" /> Chave Pix
                        </p>
                        <p className="text-sm">{u.pix_key_type}: {u.pix_key}</p>
                      </div>
                    )}

                    {/* User's tickets */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5" /> Ingressos deste usuário
                      </p>
                      {userTickets[u.user_id] ? (
                        userTickets[u.user_id].length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">Nenhum ingresso cadastrado</p>
                        ) : (
                          <div className="space-y-2">
                            {userTickets[u.user_id].map((t: any) => (
                              <div key={t.id} className="flex items-center gap-3 bg-background rounded-lg p-3 border border-border">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{t.events?.name || "Evento"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    R$ {Number(t.price).toFixed(2)} · {t.events?.city} · {t.events?.date}
                                  </p>
                                </div>
                                <Badge className={`${statusColor(t.status)} text-xs`}>{statusLabel(t.status)}</Badge>
                                <div className="flex gap-1">
                                  {(t.status === "pending_validation" || t.status === "rejected") && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => approveTicket(t.id)} title="Aprovar">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60" onClick={() => deleteTicket(t.id)} title="Excluir">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">Carregando...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
