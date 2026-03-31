import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye, Trash2, ChevronDown, ChevronUp, MapPin, DollarSign,
  Users, Ticket, CheckCircle, ShieldCheck, Camera, XCircle, Clock, ImageIcon,
} from "lucide-react";
import { statusColor, statusLabel } from "./AdminTicketsTab";

type Props = {
  users: any[];
  onRefresh: () => void;
  userEmails?: Record<string, string>;
};

const kycBadge = (status: string) => {
  switch (status) {
    case "approved": return <Badge className="bg-success/10 text-success border-success/20 text-xs gap-1"><CheckCircle className="w-3 h-3" />KYC Aprovado</Badge>;
    case "submitted": return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs gap-1"><Clock className="w-3 h-3" />KYC Pendente</Badge>;
    case "rejected": return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1"><XCircle className="w-3 h-3" />KYC Recusado</Badge>;
    default: return <Badge className="bg-muted text-muted-foreground text-xs">Sem KYC</Badge>;
  }
};

export default function AdminUsersTab({ users, onRefresh, userEmails = {} }: Props) {
  const navigate = useNavigate();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userTickets, setUserTickets] = useState<Record<string, any[]>>({});

  const fetchUserTickets = async (userId: string) => {
    const { data } = await supabase.from("tickets").select("*, events(name, city, date)").eq("seller_id", userId).order("created_at", { ascending: false });
    setUserTickets(prev => ({ ...prev, [userId]: data || [] }));
  };

  const toggleUser = (userId: string) => {
    if (expandedUser === userId) { setExpandedUser(null); return; }
    setExpandedUser(userId);
    if (!userTickets[userId]) fetchUserTickets(userId);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Excluir este usuário? O perfil será removido permanentemente.")) return;
    try {
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
      toast.success("Perfil do usuário removido");
      onRefresh();
    } catch { toast.error("Erro ao remover usuário"); }
  };

  const approveTicket = async (ticketId: string) => {
    const { error } = await supabase.from("tickets").update({ status: "available", rejection_reason: null, validated_at: new Date().toISOString() }).eq("id", ticketId);
    if (error) toast.error("Erro ao aprovar"); else toast.success("Ingresso aprovado!");
  };

  const deleteTicket = async (ticketId: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from("tickets").delete().eq("id", ticketId);
    toast.success("Excluído");
  };

  const handleKycAction = async (userId: string, action: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({ kyc_status: action }).eq("user_id", userId);
    if (error) { toast.error("Erro ao atualizar KYC"); return; }
    toast.success(action === "approved" ? "KYC aprovado!" : "KYC recusado.");
    onRefresh();
  };

  const handleAvatarAction = async (userId: string, action: "approved" | "rejected", pendingUrl?: string) => {
    const updates: any = { avatar_status: action };
    if (action === "approved" && pendingUrl) {
      updates.avatar_url = pendingUrl;
      updates.pending_avatar_url = null;
    }
    if (action === "rejected") {
      updates.pending_avatar_url = null;
    }
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
    if (error) { toast.error("Erro ao moderar foto"); return; }
    toast.success(action === "approved" ? "Foto aprovada!" : "Foto recusada.");
    onRefresh();
  };

  if (users.length === 0) return <p className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</p>;

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="bg-card rounded-xl border border-border hover:border-primary/20 transition-colors overflow-hidden">
          <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => toggleUser(u.user_id)}>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 relative">
              {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-primary/50" />}
              {u.avatar_status === "pending" && (
                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-warning border-2 border-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{u.display_name || "Sem nome"}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmails[u.user_id] || "Email não disponível"}</p>
              <p className="text-xs text-muted-foreground">{u.address_city || u.city || "Cidade não informada"}{u.address_state ? ` - ${u.address_state}` : ""} · {u.phone || "Sem telefone"}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {kycBadge(u.kyc_status)}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/seller/${u.user_id}`); }} title="Ver perfil"><Eye className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteUser(u.user_id); }} title="Remover"><Trash2 className="w-4 h-4" /></Button>
              {expandedUser === u.user_id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>

          {expandedUser === u.user_id && (
            <div className="border-t border-border p-4 bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground font-medium">Nome completo</p><p className="font-medium">{u.display_name || "N/A"}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">CPF</p><p className="font-mono">{u.cpf || "N/A"}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Telefone</p><p>{u.phone || "N/A"}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Cadastrado em</p><p>{new Date(u.created_at).toLocaleString("pt-BR")}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Cidade (perfil)</p><p>{u.city || "N/A"}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Bio</p><p className="truncate">{u.bio || "N/A"}</p></div>
              </div>

              {/* Avatar Moderation */}
              {u.avatar_status === "pending" && u.pending_avatar_url && (
                <div className="bg-card rounded-lg p-3 border border-warning/20 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Foto pendente de aprovação</p>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-3">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">Atual</p>
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                          {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <Users className="w-8 h-8 text-muted-foreground m-auto mt-3" />}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-warning mb-1">Nova</p>
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-warning bg-muted">
                          <img src={u.pending_avatar_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <Button size="sm" className="rounded-lg text-xs gap-1" onClick={() => handleAvatarAction(u.user_id, "approved", u.pending_avatar_url)}>
                        <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1 text-destructive" onClick={() => handleAvatarAction(u.user_id, "rejected")}>
                        <XCircle className="w-3.5 h-3.5" /> Recusar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* KYC Moderation */}
              {u.kyc_status === "submitted" && (
                <div className="bg-card rounded-lg p-3 border border-warning/20 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Verificação KYC pendente</p>
                  {u.date_of_birth && (
                    <p className="text-sm">Data de nascimento: <strong>{new Date(u.date_of_birth).toLocaleDateString("pt-BR")}</strong></p>
                  )}
                  <div className="flex gap-3">
                    {u.kyc_document_path && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Documento</p>
                        <img
                          src={supabase.storage.from("avatars").getPublicUrl(u.kyc_document_path).data.publicUrl}
                          alt="Documento"
                          className="w-32 h-24 object-cover rounded-lg border border-border cursor-pointer"
                          onClick={() => window.open(supabase.storage.from("avatars").getPublicUrl(u.kyc_document_path).data.publicUrl, "_blank")}
                        />
                      </div>
                    )}
                    {u.kyc_selfie_path && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Selfie</p>
                        <img
                          src={supabase.storage.from("avatars").getPublicUrl(u.kyc_selfie_path).data.publicUrl}
                          alt="Selfie"
                          className="w-32 h-24 object-cover rounded-lg border border-border cursor-pointer"
                          onClick={() => window.open(supabase.storage.from("avatars").getPublicUrl(u.kyc_selfie_path).data.publicUrl, "_blank")}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-lg text-xs gap-1" onClick={() => handleKycAction(u.user_id, "approved")}>
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar KYC
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1 text-destructive" onClick={() => handleKycAction(u.user_id, "rejected")}>
                      <XCircle className="w-3.5 h-3.5" /> Recusar KYC
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-card rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Endereço completo</p>
                {u.address_street ? (
                  <div className="text-sm space-y-1">
                    <p>{u.address_street}, {u.address_number || "S/N"}{u.address_complement && ` — ${u.address_complement}`}</p>
                    <p>{u.address_neighborhood || ""}</p>
                    <p>{u.address_city || ""}{u.address_state ? ` - ${u.address_state}` : ""}</p>
                    <p className="font-mono text-muted-foreground">CEP: {u.address_cep || "N/A"}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Endereço não informado</p>
                )}
              </div>

              {(u.pix_key || u.pix_key_type) && (
                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Chave Pix</p>
                  <p className="text-sm">{u.pix_key_type}: {u.pix_key}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1"><Ticket className="w-3.5 h-3.5" /> Ingressos deste usuário</p>
                {userTickets[u.user_id] ? (
                  userTickets[u.user_id].length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhum ingresso cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                      {userTickets[u.user_id].map((t: any) => (
                        <div key={t.id} className="flex items-center gap-3 bg-background rounded-lg p-3 border border-border">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.events?.name || "Evento"}</p>
                            <p className="text-xs text-muted-foreground">R$ {Number(t.price).toFixed(2)} · {t.events?.city} · {t.events?.date}</p>
                          </div>
                          <Badge className={`${statusColor(t.status)} text-xs`}>{statusLabel(t.status)}</Badge>
                          <div className="flex gap-1">
                            {(t.status === "pending_validation" || t.status === "rejected") && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => approveTicket(t.id)} title="Aprovar"><CheckCircle className="w-3.5 h-3.5" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60" onClick={() => deleteTicket(t.id)} title="Excluir"><Trash2 className="w-3.5 h-3.5" /></Button>
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
  );
}
