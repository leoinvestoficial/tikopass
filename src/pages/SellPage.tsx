import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, ArrowRight, Sparkles, MapPin, Calendar, Tag, Loader2, Upload, FileCheck, AlertCircle, Clock, Shield, Zap, DollarSign, XCircle, ArrowLeft } from "lucide-react";
import CategoryGrid from "@/components/CategoryGrid";
import { useAuth } from "@/hooks/use-auth";
import { searchEventsWithAI, createEvent, createTicket } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import sellCtaBg from "@/assets/sell-cta.jpg";

type AIEvent = {
  name: string; date: string; time: string; venue: string; city: string; category: string;
};

type Step = "search" | "confirm" | "details" | "upload" | "validating" | "success";
type ValidationCheck = { id: string; label: string; passed: boolean; detail: string };

export default function SellPage() {
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [aiResults, setAiResults] = useState<AIEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AIEvent | null>(null);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);
  const [savedTicketId, setSavedTicketId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ticketForm, setTicketForm] = useState({ sector: "", row: "", seat: "", price: "" });
  const [editedEvent, setEditedEvent] = useState<AIEvent | null>(null);
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [validationStatus, setValidationStatus] = useState<string>("pending_validation");
  const [validationMessage, setValidationMessage] = useState("");
  const [validationChecks, setValidationChecks] = useState<ValidationCheck[]>([]);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Poll for validation status
  useEffect(() => {
    if (step !== "validating" || !savedTicketId) return;
    let isActive = true;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("tickets").select("status, rejection_reason, validation_checks").eq("id", savedTicketId).single();
      if (!isActive || !data || data.status === "pending_validation") return;
      setValidationStatus(data.status);
      if (data.status === "validated") { setStep("success"); toast.success("Ingresso validado e publicado!"); }
      else if (data.status === "rejected") {
        setValidationMessage((data as any).rejection_reason || "Seu ingresso foi rejeitado pela validação automática.");
        setValidationChecks(((data as any).validation_checks || []) as ValidationCheck[]);
        toast.error("Ingresso rejeitado na validação.");
      }
      clearInterval(interval);
    }, 3000);
    const timeout = setTimeout(async () => {
      clearInterval(interval);
      const { data } = await supabase.from("tickets").select("status, rejection_reason, validation_checks").eq("id", savedTicketId).single();
      if (!isActive) return;
      if (data?.status === "validated") { setStep("success"); return; }
      if (data?.status === "rejected") {
        setValidationStatus("rejected");
        setValidationMessage((data as any).rejection_reason || "Ingresso rejeitado pela validação.");
        setValidationChecks(((data as any).validation_checks || []) as ValidationCheck[]);
        return;
      }
      setValidationStatus("timeout");
      setValidationMessage("A validação não foi concluída automaticamente. Seu ingresso não foi publicado.");
      toast.error("A validação não foi concluída. O ingresso não foi publicado.");
    }, 60000);
    return () => { isActive = false; clearInterval(interval); clearTimeout(timeout); };
  }, [step, savedTicketId]);

  const handleAISearch = async () => {
    if (!user) { toast.error("Faça login para vender ingressos"); navigate("/auth"); return; }
    if (searchQuery.length < 2) { toast.error("Digite pelo menos 2 caracteres"); return; }
    setSearching(true);
    try {
      const events = await searchEventsWithAI(searchQuery, searchCity || undefined);
      setAiResults(events);
      if (events.length === 0) toast.info("Nenhum evento encontrado. Tente outros termos.");
    } catch (err: any) { toast.error(err.message || "Erro na busca com IA"); }
    finally { setSearching(false); }
  };

  const handleSelectEvent = (event: AIEvent) => { setSelectedEvent(event); setEditedEvent({ ...event }); setStep("confirm"); };

  const handleConfirmEvent = async () => {
    if (!editedEvent || !user) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sua sessão expirou. Faça login novamente."); navigate("/auth"); return; }
    try {
      const created = await createEvent({ ...editedEvent, source: "ai_search" });
      setSavedEventId(created.id);
      setSelectedEvent(editedEvent);
      setStep("details");
    } catch (err: any) {
      if (err.message?.includes("row-level security")) { toast.error("Sessão expirada. Faça login novamente."); navigate("/auth"); }
      else { toast.error("Erro ao salvar evento: " + (err.message || "")); }
    }
  };

  const handleSubmitAndUpload = async () => {
    if (!savedEventId || !user || !ticketFile) return;
    setSubmitting(true);
    try {
      const ticket = await createTicket({ event_id: savedEventId, seller_id: user.id, sector: ticketForm.sector, row: ticketForm.row || undefined, seat: ticketForm.seat || undefined, price: parseFloat(ticketForm.price) });
      setSavedTicketId(ticket.id);
      setUploading(true);
      const formData = new FormData();
      formData.append("file", ticketFile);
      formData.append("ticket_id", ticket.id);
      formData.append("event_id", savedEventId);
      const { data, error } = await supabase.functions.invoke("upload-ticket", { body: formData });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro no upload");
      toast.success("Ingresso enviado! A validação será feita em segundo plano. Acompanhe em Meus Ingressos.");
      navigate("/my-tickets");
    } catch (err: any) { toast.error("Erro ao publicar: " + (err.message || "")); }
    finally { setSubmitting(false); setUploading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) { toast.error("Formato não aceito. Use PDF, JPG ou PNG."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo 10MB."); return; }
    setTicketFile(file);
  };

  const resetForm = () => {
    setStep("search"); setSearchQuery(""); setAiResults([]); setSelectedEvent(null);
    setSavedEventId(null); setSavedTicketId(null); setTicketForm({ sector: "", row: "", seat: "", price: "" });
    setTicketFile(null); setValidationStatus("pending_validation"); setValidationMessage("");
    setValidationChecks([]);
  };

  const stepsList = [
    { key: "search", label: "Buscar evento", num: 1 },
    { key: "confirm", label: "Confirmar", num: 2 },
    { key: "details", label: "Cadastrar", num: 3 },
    { key: "upload", label: "Enviar ingresso", num: 4 },
  ];

  const stepOrder = ["search", "confirm", "details", "upload", "validating", "success"];
  const currentIndex = stepOrder.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <Navbar />

      {/* ── CPF Warning Banner ── */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="container py-2.5 text-center text-sm text-primary font-medium">
          ⚠️ Só aceitamos ingressos no CPF do titular da conta. O CPF do ingresso será verificado automaticamente durante a validação.
        </div>
      </div>

      {/* ── Trust strip ── */}
      <div className="border-b border-border bg-muted/30">
        <div className="container py-3 flex items-center justify-center gap-8 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Pagamento protegido</span>
          <span className="flex items-center gap-1.5 hidden sm:flex"><Zap className="w-3.5 h-3.5 text-primary" /> Validação com IA</span>
          <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" /> Receba após o evento</span>
        </div>
      </div>

      <div className="flex-1">
        <div className="container max-w-2xl py-10">

          {/* ── Steps indicator ── */}
          <div className="flex items-center gap-2 mb-10">
            {stepsList.map((s, i) => {
              const sIndex = stepOrder.indexOf(s.key);
              const isActive = sIndex <= currentIndex;
              const isDone = sIndex < currentIndex;
              return (
                <div key={s.key} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300 ${
                      isDone ? "bg-primary text-primary-foreground shadow-md" :
                      isActive ? "bg-primary text-primary-foreground shadow-lg scale-110" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block transition-colors ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < stepsList.length - 1 && (
                    <div className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${isDone ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Step: Search ── */}
          {step === "search" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Buscar evento</h2>
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Nossa IA busca eventos reais e atuais para você
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome do evento (ex: Retronejo, Réveillon Destino...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
                    className="pl-11 h-12 rounded-xl text-base"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cidade (opcional)"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      className="pl-11 h-11 rounded-xl"
                    />
                  </div>
                  <Button onClick={handleAISearch} disabled={searching} size="lg" className="rounded-xl gap-2 shrink-0 px-6">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {searching ? "Buscando..." : "Buscar com IA"}
                  </Button>
                </div>
              </div>

              {aiResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    {aiResults.length} evento(s) encontrado(s) pela IA
                  </p>
                  {aiResults.map((event, i) => {
                    const isPast = new Date(event.date) < new Date(new Date().toISOString().split("T")[0]);
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectEvent(event)}
                        className={`w-full text-left bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:border-primary/40 transition-all duration-200 active:scale-[0.98] space-y-3 group ${isPast ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{event.name}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{event.date} · {event.time}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{event.venue} · {event.city}</span>
                          <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />{event.category}</span>
                        </div>
                        {isPast && <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">Encerrado</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Confirm ── */}
          {step === "confirm" && editedEvent && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Confirme o evento</h2>
                <p className="text-sm text-muted-foreground">Corrija os dados se necessário antes de continuar.</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="ev-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do evento</Label>
                  <Input id="ev-name" value={editedEvent.name} onChange={(e) => setEditedEvent({ ...editedEvent, name: e.target.value })} className="rounded-xl h-11" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ev-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</Label>
                    <Input id="ev-date" type="date" value={editedEvent.date} onChange={(e) => setEditedEvent({ ...editedEvent, date: e.target.value })} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ev-time" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horário</Label>
                    <Input id="ev-time" type="time" value={editedEvent.time !== "N/A" ? editedEvent.time : ""} onChange={(e) => setEditedEvent({ ...editedEvent, time: e.target.value })} className="rounded-xl h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ev-venue" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Local</Label>
                    <Input id="ev-venue" value={editedEvent.venue} onChange={(e) => setEditedEvent({ ...editedEvent, venue: e.target.value })} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ev-city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cidade</Label>
                    <Input id="ev-city" value={editedEvent.city} onChange={(e) => setEditedEvent({ ...editedEvent, city: e.target.value })} className="rounded-xl h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                  <Input id="ev-category" value={editedEvent.category} onChange={(e) => setEditedEvent({ ...editedEvent, category: e.target.value })} className="rounded-xl h-11" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("search")} size="lg" className="flex-1 rounded-xl">Buscar outro</Button>
                <Button onClick={handleConfirmEvent} size="lg" className="flex-1 gap-2 rounded-xl">
                  Confirmar e continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: Details + Upload ── */}
          {step === "details" && selectedEvent && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Dados do ingresso</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />{selectedEvent.name}
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sector" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor *</Label>
                    <Input id="sector" placeholder="Ex: Pista Premium" value={ticketForm.sector} onChange={(e) => setTicketForm({ ...ticketForm, sector: e.target.value })} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="row" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fileira</Label>
                    <Input id="row" placeholder="Ex: A (opcional)" value={ticketForm.row} onChange={(e) => setTicketForm({ ...ticketForm, row: e.target.value })} className="rounded-xl h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seat" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assento</Label>
                    <Input id="seat" placeholder="Ex: 12 (opcional)" value={ticketForm.seat} onChange={(e) => setTicketForm({ ...ticketForm, seat: e.target.value })} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preço (R$) *</Label>
                    <Input id="price" type="number" placeholder="Ex: 500" value={ticketForm.price} onChange={(e) => setTicketForm({ ...ticketForm, price: e.target.value })} className="rounded-xl h-11" />
                    {ticketForm.price && parseFloat(ticketForm.price) > 0 && (
                      <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
                        Você receberá{" "}
                        <span className="font-bold text-foreground">
                          R$ {(parseFloat(ticketForm.price) * 0.9).toFixed(2).replace(".", ",")}
                        </span>{" "}
                        <span className="text-xs text-muted-foreground">(taxa de 10%)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* File upload */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Arquivo do ingresso (PDF, JPG ou PNG) *</Label>
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 ${
                    ticketFile ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => document.getElementById("ticket-file")?.click()}
                >
                  <input id="ticket-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
                  {ticketFile ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileCheck className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-foreground">{ticketFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(ticketFile.size / 1024 / 1024).toFixed(2)} MB — Clique para trocar
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                        <Upload className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">Clique para enviar o arquivo do ingresso</p>
                      <p className="text-xs text-muted-foreground">PDF, JPG ou PNG · Máx. 10MB</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-primary" />
                  O ingresso será custodiado pela plataforma e validado automaticamente
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("confirm")} size="lg" className="flex-1 rounded-xl">Voltar</Button>
                <Button
                  onClick={handleSubmitAndUpload}
                  disabled={!ticketForm.sector || !ticketForm.price || !ticketFile || submitting}
                  size="lg"
                  className="flex-1 gap-2 rounded-xl"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Enviando..." : submitting ? "Publicando..." : "Enviar e publicar"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: Validating ── */}
          {step === "validating" && (
            <div className="text-center space-y-8 py-16 animate-in fade-in zoom-in-95 duration-300">
              {validationStatus === "pending_validation" && (
                <>
                  <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Clock className="w-12 h-12 text-primary animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold">Validando ingresso...</h2>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Estamos verificando a autenticidade do seu ingresso com OCR e checagem anti-fraude.
                    </p>
                  </div>
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                </>
              )}
              {validationStatus === "timeout" && (
                <>
                  <div className="w-24 h-24 rounded-3xl bg-accent flex items-center justify-center mx-auto">
                    <Clock className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold">Validação pendente</h2>
                    <p className="text-muted-foreground max-w-sm mx-auto">{validationMessage}</p>
                  </div>
                  <Button onClick={resetForm} size="lg" className="rounded-xl">Voltar</Button>
                </>
              )}
              {validationStatus === "rejected" && (
                <>
                  <div className="w-24 h-24 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-12 h-12 text-destructive" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold">Ingresso rejeitado</h2>
                    <p className="text-muted-foreground max-w-sm mx-auto">{validationMessage}</p>
                  </div>

                  {/* Diagnostic checklist */}
                  {validationChecks.length > 0 && (
                    <div className="max-w-md mx-auto w-full bg-card border border-border rounded-2xl p-5 text-left space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Diagnóstico da validação</p>
                      {validationChecks.map((check) => (
                        <div key={check.id} className="flex items-start gap-3">
                          {check.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{check.label}</p>
                            <p className="text-xs text-muted-foreground">{check.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button onClick={resetForm} size="lg" className="rounded-xl">Tentar novamente</Button>
                </>
              )}
            </div>
          )}

          {/* ── Step: Success ── */}
          {step === "success" && (
            <div className="text-center space-y-8 py-16 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-24 h-24 rounded-3xl bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12 text-success" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold">Ingresso publicado! 🎉</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Seu ingresso foi validado e está disponível para compradores na vitrine.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={resetForm} size="lg" className="rounded-xl">Vender outro</Button>
                <Button onClick={() => navigate("/")} size="lg" className="rounded-xl gap-2">
                  Ver vitrine <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
