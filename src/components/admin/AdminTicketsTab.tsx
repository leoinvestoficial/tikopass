import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, XCircle, Trash2, AlertTriangle, ChevronDown, ChevronUp,
  FileText, Download, User, Ticket,
} from "lucide-react";

type Props = {
  tickets: any[];
  onRefresh: () => void;
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

export { statusColor, statusLabel };

export default function AdminTicketsTab({ tickets, onRefresh }: Props) {
  const navigate = useNavigate();
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketFileUrl, setTicketFileUrl] = useState<Record<string, string>>({});

  const getTicketFileUrl = async (ticketId: string, storagePath: string) => {
    if (ticketFileUrl[ticketId]) return;
    const { data } = await supabase.storage.from("tickets-custody").createSignedUrl(storagePath, 300);
    if (data?.signedUrl) setTicketFileUrl(prev => ({ ...prev, [ticketId]: data.signedUrl }));
  };

  const toggleTicket = (ticketId: string, storagePath?: string) => {
    if (expandedTicket === ticketId) { setExpandedTicket(null); return; }
    setExpandedTicket(ticketId);
    if (storagePath) getTicketFileUrl(ticketId, storagePath);
  };

  const approveTicket = async (ticketId: string) => {
    const { error } = await supabase.from("tickets").update({ status: "available", rejection_reason: null, validated_at: new Date().toISOString() }).eq("id", ticketId);
    if (error) toast.error("Erro ao aprovar ingresso");
    else { toast.success("Ingresso aprovado!"); onRefresh(); }
  };

  const rejectTicket = async (ticketId: string) => {
    const reason = prompt("Motivo da rejeição:");
    if (!reason) return;
    const { error } = await supabase.from("tickets").update({ status: "rejected", rejection_reason: reason }).eq("id", ticketId);
    if (error) toast.error("Erro ao rejeitar");
    else { toast.success("Ingresso rejeitado"); onRefresh(); }
  };

  const deleteTicket = async (ticketId: string) => {
    if (!confirm("Excluir este ingresso permanentemente?")) return;
    const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Ingresso excluído"); onRefresh(); }
  };

  if (tickets.length === 0) return <p className="text-center py-8 text-muted-foreground">Nenhum ingresso encontrado</p>;

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="bg-card rounded-xl border border-border hover:border-primary/20 transition-colors overflow-hidden">
          <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => toggleTicket(ticket.id, ticket.storage_path)}>
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
                <div><p className="text-xs text-muted-foreground font-medium">Evento</p><p className="font-medium">{ticket.events?.name}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Local</p><p>{ticket.events?.venue}, {ticket.events?.city}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Data / Hora</p><p>{ticket.events?.date} · {ticket.events?.time}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Categoria</p><p>{ticket.events?.category}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Setor / Fila / Assento</p><p>{ticket.sector} {ticket.row && `· Fila ${ticket.row}`} {ticket.seat && `· ${ticket.seat}`}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Preço anunciado</p><p className="font-bold text-emerald-600">R$ {Number(ticket.price).toFixed(2)}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Preço original</p><p>{ticket.original_price ? `R$ ${Number(ticket.original_price).toFixed(2)}` : "N/A"}</p></div>
                <div><p className="text-xs text-muted-foreground font-medium">Criado em</p><p>{new Date(ticket.created_at).toLocaleString("pt-BR")}</p></div>
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

              {ticket.storage_path && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Arquivo do ingresso</p>
                  {ticketFileUrl[ticket.id] ? (
                    <div className="space-y-2">
                      {ticket.storage_path.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                        <img src={ticketFileUrl[ticket.id]} alt="Ingresso" className="max-w-md rounded-lg border border-border" />
                      ) : (
                        <iframe src={ticketFileUrl[ticket.id]} className="w-full max-w-md h-96 rounded-lg border border-border" />
                      )}
                      <a href={ticketFileUrl[ticket.id]} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> Baixar arquivo</Button>
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Carregando arquivo...</p>
                  )}
                </div>
              )}

              <div className="bg-card rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1"><User className="w-3.5 h-3.5" /> Vendedor</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {ticket.seller_profile?.avatar_url ? <img src={ticket.seller_profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary/50" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ticket.seller_profile?.display_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{ticket.seller_profile?.phone || "Sem telefone"} · ID: {ticket.seller_id.slice(0, 8)}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => navigate(`/seller/${ticket.seller_id}`)}>Ver perfil</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
