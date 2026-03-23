import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, ArrowRight, Sparkles, MapPin, Calendar, Tag, Loader2, Upload, FileCheck, AlertCircle, Clock } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useAuth } from "@/hooks/use-auth";
import { searchEventsWithAI, createEvent, createTicket } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type AIEvent = {
  name: string; date: string; time: string; venue: string; city: string; category: string;
};

type Step = "search" | "confirm" | "details" | "upload" | "validating" | "success";

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

  const heroReveal = useScrollReveal<HTMLDivElement>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Poll for validation status
  useEffect(() => {
    if (step !== "validating" || !savedTicketId) return;

    let isActive = true;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("tickets")
        .select("status")
        .eq("id", savedTicketId)
        .single();

      if (!isActive || !data || data.status === "pending_validation") return;

      setValidationStatus(data.status);
      if (data.status === "validated") {
        setStep("success");
        toast.success("Ingresso validado e publicado!");
      } else if (data.status === "rejected") {
        setValidationMessage("Seu ingresso foi rejeitado pela validação automática.");
        toast.error("Ingresso rejeitado na validação.");
      }
      clearInterval(interval);
    }, 3000);

    const timeout = setTimeout(async () => {
      clearInterval(interval);
      const { data } = await supabase
        .from("tickets")
        .select("status")
        .eq("id", savedTicketId)
        .single();

      if (!isActive) return;

      if (data?.status === "validated") {
        setStep("success");
        return;
      }

      if (data?.status === "rejected") {
        setValidationStatus("rejected");
        setValidationMessage("Ingresso rejeitado pela validação.");
        return;
      }

      setValidationStatus("timeout");
      setValidationMessage("A validação não foi concluída automaticamente. Seu ingresso não foi publicado.");
      toast.error("A validação não foi concluída. O ingresso não foi publicado.");
    }, 60000);

    return () => {
      isActive = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [step, savedTicketId]);

  const handleAISearch = async () => {
    if (!user) { toast.error("Faça login para vender ingressos"); navigate("/auth"); return; }
    if (searchQuery.length < 2) { toast.error("Digite pelo menos 2 caracteres"); return; }

    setSearching(true);
    try {
      const events = await searchEventsWithAI(searchQuery, searchCity || undefined);
      setAiResults(events);
      if (events.length === 0) toast.info("Nenhum evento encontrado. Tente outros termos.");
    } catch (err: any) {
      toast.error(err.message || "Erro na busca com IA");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectEvent = (event: AIEvent) => {
    setSelectedEvent(event);
    setEditedEvent({ ...event });
    setStep("confirm");
  };

  const handleConfirmEvent = async () => {
    if (!editedEvent || !user) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Sua sessão expirou. Faça login novamente.");
      navigate("/auth");
      return;
    }
    try {
      const created = await createEvent({ ...editedEvent, source: "ai_search" });
      setSavedEventId(created.id);
      setSelectedEvent(editedEvent);
      setStep("details");
    } catch (err: any) {
      if (err.message?.includes("row-level security")) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/auth");
      } else {
        toast.error("Erro ao salvar evento: " + (err.message || ""));
      }
    }
  };

  const handleSubmitAndUpload = async () => {
    if (!savedEventId || !user || !ticketFile) return;
    setSubmitting(true);
    try {
      // 1. Create ticket record first
      const ticket = await createTicket({
        event_id: savedEventId,
        seller_id: user.id,
        sector: ticketForm.sector,
        row: ticketForm.row || undefined,
        seat: ticketForm.seat || undefined,
        price: parseFloat(ticketForm.price),
      });
      setSavedTicketId(ticket.id);

      // 2. Upload file to edge function
      setUploading(true);
      const formData = new FormData();
      formData.append("file", ticketFile);
      formData.append("ticket_id", ticket.id);
      formData.append("event_id", savedEventId);

      const { data, error } = await supabase.functions.invoke("upload-ticket", {
        body: formData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro no upload");

      // 3. Go to validation step
      setStep("validating");
      toast.info("Ingresso enviado! Validação em andamento...");
    } catch (err: any) {
      toast.error("Erro ao publicar: " + (err.message || ""));
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato não aceito. Use PDF, JPG ou PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setTicketFile(file);
  };

  const resetForm = () => {
    setStep("search");
    setSearchQuery("");
    setAiResults([]);
    setSelectedEvent(null);
    setSavedEventId(null);
    setSavedTicketId(null);
    setTicketForm({ sector: "", row: "", seat: "", price: "" });
    setTicketFile(null);
    setValidationStatus("pending_validation");
    setValidationMessage("");
  };

  const stepsList = [
    { key: "search", label: "Buscar evento" },
    { key: "confirm", label: "Confirmar" },
    { key: "details", label: "Cadastrar" },
    { key: "upload", label: "Enviar ingresso" },
  ];

  const stepOrder = ["search", "confirm", "details", "upload", "validating", "success"];
  const currentIndex = stepOrder.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <div
          ref={heroReveal.ref}
          className={`container max-w-2xl py-12 ${heroReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
        >
          {/* Steps indicator */}
          <div className="flex items-center gap-3 mb-10">
            {stepsList.map((s, i) => {
              const sIndex = stepOrder.indexOf(s.key);
              const isActive = sIndex <= currentIndex;
              return (
                <div key={s.key} className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-semibold shrink-0 transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {sIndex < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                  </div>
                  {i < stepsList.length - 1 && <div className={`h-px flex-1 ${isActive ? "bg-primary" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>

          {/* Step: Search with AI */}
          {step === "search" && (
            <div className="space-y-6 animate-reveal-up">
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold">Vender ingresso</h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Nossa IA busca eventos reais e atuais para você
                </p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome do evento (ex: Retronejo, Réveillon Destino...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Cidade (opcional)" value={searchCity} onChange={(e) => setSearchCity(e.target.value)} className="rounded-xl" />
                  <Button onClick={handleAISearch} disabled={searching} className="rounded-xl gap-2 shrink-0">
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
                        className={`w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200 active:scale-[0.98] space-y-2 ${isPast ? "opacity-75" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold text-foreground">{event.name}</span>
                          {isPast && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Encerrado</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{event.date} · {event.time}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.venue} · {event.city}</span>
                          <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{event.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && editedEvent && (
            <div className="space-y-6 animate-reveal-up">
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold">Confirme o evento</h1>
                <p className="text-muted-foreground">Corrija os dados se necessário.</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ev-name">Nome do evento</Label>
                  <Input id="ev-name" value={editedEvent.name} onChange={(e) => setEditedEvent({ ...editedEvent, name: e.target.value })} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ev-date">Data</Label>
                    <Input id="ev-date" type="date" value={editedEvent.date} onChange={(e) => setEditedEvent({ ...editedEvent, date: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ev-time">Horário</Label>
                    <Input id="ev-time" type="time" value={editedEvent.time !== "N/A" ? editedEvent.time : ""} onChange={(e) => setEditedEvent({ ...editedEvent, time: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ev-venue">Local</Label>
                    <Input id="ev-venue" value={editedEvent.venue} onChange={(e) => setEditedEvent({ ...editedEvent, venue: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ev-city">Cidade</Label>
                    <Input id="ev-city" value={editedEvent.city} onChange={(e) => setEditedEvent({ ...editedEvent, city: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ev-category">Categoria</Label>
                  <Input id="ev-category" value={editedEvent.category} onChange={(e) => setEditedEvent({ ...editedEvent, category: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("search")} className="flex-1 rounded-xl">Buscar outro</Button>
                <Button onClick={handleConfirmEvent} className="flex-1 gap-2 rounded-xl">
                  Confirmar e continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Details + Upload */}
          {step === "details" && selectedEvent && (
            <div className="space-y-6 animate-reveal-up">
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold">Dados do ingresso</h1>
                <p className="text-muted-foreground"><Tag className="w-4 h-4 inline mr-1" />{selectedEvent.name}</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sector">Setor *</Label>
                    <Input id="sector" placeholder="Ex: Pista Premium" value={ticketForm.sector} onChange={(e) => setTicketForm({ ...ticketForm, sector: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="row">Fileira</Label>
                    <Input id="row" placeholder="Ex: A (opcional)" value={ticketForm.row} onChange={(e) => setTicketForm({ ...ticketForm, row: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seat">Assento</Label>
                    <Input id="seat" placeholder="Ex: 12 (opcional)" value={ticketForm.seat} onChange={(e) => setTicketForm({ ...ticketForm, seat: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$) *</Label>
                    <Input id="price" type="number" placeholder="Ex: 500" value={ticketForm.price} onChange={(e) => setTicketForm({ ...ticketForm, price: e.target.value })} className="rounded-xl" />
                    {ticketForm.price && parseFloat(ticketForm.price) > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Você receberá{" "}
                        <span className="font-semibold text-foreground">
                          R$ {(parseFloat(ticketForm.price) * 0.9).toFixed(2).replace(".", ",")}
                        </span>{" "}
                        <span className="text-xs">(taxa de 10% da plataforma)</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* File upload */}
                <div className="space-y-2">
                  <Label>Arquivo do ingresso (PDF, JPG ou PNG) *</Label>
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer hover:border-primary/50 ${
                      ticketFile ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => document.getElementById("ticket-file")?.click()}
                  >
                    <input
                      id="ticket-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {ticketFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileCheck className="w-6 h-6 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">{ticketFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(ticketFile.size / 1024 / 1024).toFixed(2)} MB — Clique para trocar
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">Clique para enviar o arquivo do ingresso</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG ou PNG · Máx. 10MB</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    O ingresso será custodiado pela plataforma e validado automaticamente
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("confirm")} className="flex-1 rounded-xl">Voltar</Button>
                <Button
                  onClick={handleSubmitAndUpload}
                  disabled={!ticketForm.sector || !ticketForm.price || !ticketFile || submitting}
                  className="flex-1 gap-2 rounded-xl"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Enviando..." : submitting ? "Publicando..." : "Enviar e publicar"}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Validating */}
          {step === "validating" && (
            <div className="text-center space-y-6 py-12 animate-reveal-scale">
              {validationStatus === "pending_validation" && (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Clock className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-display font-bold">Validando ingresso...</h1>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Estamos verificando a autenticidade do seu ingresso com OCR e checagem anti-fraude. Isso pode levar alguns segundos.
                    </p>
                  </div>
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                </>
              )}
              {validationStatus === "rejected" && (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-display font-bold">Ingresso rejeitado</h1>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      {validationMessage || "A validação automática detectou um problema com o ingresso enviado."}
                    </p>
                  </div>
                  <Button onClick={resetForm} className="rounded-xl">Tentar novamente</Button>
                </>
              )}
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center space-y-6 py-12 animate-reveal-scale">
              <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold">Ingresso validado e publicado!</h1>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Seu ingresso passou na validação e está em custódia na plataforma. Ele ficará visível para compradores.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={resetForm} className="rounded-xl">Vender outro</Button>
                <Button onClick={() => navigate("/")} className="rounded-xl">Ver vitrine</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
