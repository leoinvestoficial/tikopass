import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, ArrowRight, Sparkles, MapPin, Calendar, Tag, Loader2, Upload, FileCheck, AlertCircle, Clock, Shield, Zap, DollarSign, XCircle, ArrowLeft, ImageIcon, X, Info, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CategoryGrid from "@/components/CategoryGrid";
import { useAuth } from "@/hooks/use-auth";
import { searchEventsWithAI, searchEventsLocal, createEvent, createTicket, findSimilarEvent } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import sellCtaBg from "@/assets/sell-cta.jpg";
import { getBannerForCategory } from "@/lib/event-banners";
import imageCompression from "browser-image-compression";

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
  const [localResults, setLocalResults] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AIEvent | null>(null);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);
  const [savedTicketId, setSavedTicketId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ticketForm, setTicketForm] = useState({ sector: "", row: "", seat: "", price: "", originalPrice: "" });
  const [accessType, setAccessType] = useState<string>("");
  const [eventDays, setEventDays] = useState<string[]>([]);
  const [dayInput, setDayInput] = useState("");
  const [includesOpenBar, setIncludesOpenBar] = useState(false);
  const [isHalfPrice, setIsHalfPrice] = useState(false);
  const [sellerDescription, setSellerDescription] = useState("");
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [editedEvent, setEditedEvent] = useState<AIEvent | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
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

  // Local-first search when typing
  useEffect(() => {
    if (searchQuery.length < 2) { setLocalResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await searchEventsLocal(searchQuery, searchCity || undefined);
        setLocalResults(results);
        setShowAiSearch(results.length === 0);
      } catch (e) { console.error("Local search error:", e); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchCity]);

  const handleAISearch = async () => {
    if (!user) { toast.error("Faça login para vender ingressos"); navigate("/auth"); return; }
    if (searchQuery.length < 2) { toast.error("Digite pelo menos 2 caracteres"); return; }
    setSearching(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const events = (await searchEventsWithAI(searchQuery, searchCity || undefined))
        .filter((e: any) => e.date >= today);
      setAiResults(events);
      if (events.length === 0) toast.info("Nenhum evento encontrado. Tente outros termos.");
    } catch (err: any) { toast.error(err.message || "Erro na busca com IA"); }
    finally { setSearching(false); }
  };

  const handleSelectEvent = (event: AIEvent) => {
    setSelectedEvent(event);
    setEditedEvent({ ...event });
    setSelectedBanner("");
    setBannerFile(null);
    setStep("confirm");
  };

  const handleConfirmEvent = async () => {
    if (!editedEvent || !user) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sua sessão expirou. Faça login novamente."); navigate("/auth"); return; }
    try {
      // Upload banner if provided
      let imageUrl: string | undefined;
      if (bannerFile) {
        setBannerUploading(true);
        const ext = bannerFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const compressed = await imageCompression(bannerFile, { maxSizeMB: 0.5, maxWidthOrHeight: 1200 });
        const { error: upErr } = await supabase.storage.from("event-banners").upload(path, compressed);
        setBannerUploading(false);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("event-banners").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const created = await createEvent({ ...editedEvent, source: "ai_search" });
      setSavedEventId(created.id);
      // Update event with image if uploaded
      if (imageUrl) {
        await supabase.from("events").update({ image_url: imageUrl } as any).eq("id", created.id);
      }
      setSelectedEvent(editedEvent);
      setStep("details");
    } catch (err: any) {
      setBannerUploading(false);
      if (err.message?.includes("row-level security")) { toast.error("Sessão expirada. Faça login novamente."); navigate("/auth"); }
      else { toast.error("Erro ao salvar evento: " + (err.message || "")); }
    }
  };

  const handleSubmitAndUpload = async () => {
    if (!savedEventId || !user || !ticketFile) return;
    if (!accessType) { toast.error("Selecione o tipo de acesso do ingresso."); return; }
    setSubmitting(true);
    try {
      const sanitizedDesc = sellerDescription.replace(/<[^>]*>/g, "").trim().slice(0, 500);
      const ticket = await createTicket({
        event_id: savedEventId,
        seller_id: user.id,
        sector: ticketForm.sector,
        row: ticketForm.row || undefined,
        seat: ticketForm.seat || undefined,
        price: parseFloat(ticketForm.price),
        original_price: ticketForm.originalPrice ? parseFloat(ticketForm.originalPrice) : undefined,
        access_type: accessType,
        event_days: (accessType === "passaporte" || accessType === "dia_unico") && eventDays.length > 0 ? eventDays : undefined,
        includes_open_bar: includesOpenBar,
        is_half_price: isHalfPrice,
        seller_description: sanitizedDesc || undefined,
        extra_tags: extraTags.length > 0 ? extraTags : undefined,
      });
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
    setSavedEventId(null); setSavedTicketId(null); setTicketForm({ sector: "", row: "", seat: "", price: "", originalPrice: "" });
    setTicketFile(null); setValidationStatus("pending_validation"); setValidationMessage("");
    setValidationChecks([]); setSelectedBanner(""); setBannerFile(null);
    setAccessType(""); setEventDays([]); setDayInput(""); setIncludesOpenBar(false);
    setIsHalfPrice(false); setSellerDescription(""); setExtraTags([]); setTagInput("");
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

              {/* Local results (from our DB, accent-insensitive) */}
              {localResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-primary" />
                    {localResults.length} evento(s) já cadastrado(s)
                  </p>
                  {localResults.map((event) => {
                    const isPast = new Date(event.date) < new Date(new Date().toISOString().split("T")[0]);
                    return (
                      <button
                        key={event.id}
                        disabled={isPast}
                        onClick={() => {
                          if (isPast) { toast.error("Não é possível vender ingressos para eventos encerrados."); return; }
                          setSavedEventId(event.id);
                          const mapped = { name: event.name, date: event.date, time: event.time, venue: event.venue, city: event.city, category: event.category };
                          setSelectedEvent(mapped);
                          setEditedEvent(mapped);
                          setStep("details");
                        }}
                        className={`w-full text-left bg-card border border-border rounded-2xl p-5 transition-all duration-200 space-y-3 group ${isPast ? "opacity-40 cursor-not-allowed" : "hover:shadow-lg hover:border-primary/40 active:scale-[0.98]"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium uppercase">{event.category}</span>
                            <span className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{event.name}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{event.venue} · {event.city}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{event.date}</span>
                        </div>
                        {isPast && <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">Encerrado</span>}
                      </button>
                    );
                  })}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Não encontrou? Use o botão "Buscar com IA" acima.
                  </p>
                </div>
              )}

              {/* AI results (only shown after explicit AI search) */}
              {aiResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    {aiResults.length} show(s) encontrado(s) pela IA
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium uppercase">{event.category}</span>
                            <span className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{event.name}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{event.venue} · {event.city}</span>
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{event.date}</span>
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
              <h2 className="text-2xl font-bold text-foreground">Confirmar evento</h2>

              {/* Event card preview with banner */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                {selectedBanner ? (
                  <div className="relative h-40">
                    <img src={selectedBanner} alt={editedEvent.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5">
                      <h3 className="text-xl font-bold text-white drop-shadow-md">{editedEvent.name}</h3>
                      <p className="text-sm text-white/70">{editedEvent.venue} · {editedEvent.city}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedBanner(""); setBannerFile(null); }}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-r from-primary/20 to-primary/5 flex items-end p-5">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{editedEvent.name}</h3>
                      <p className="text-sm text-muted-foreground">{editedEvent.venue} · {editedEvent.city}</p>
                    </div>
                  </div>
                )}
                <div className="p-5 flex items-center gap-3">
                  <span className="text-xs px-2.5 py-1 rounded bg-muted text-muted-foreground font-medium uppercase">
                    {editedEvent.category}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(editedEvent.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Banner upload - drag & drop */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" /> Foto do anúncio
                </h3>
                <p className="text-sm text-muted-foreground">Adicione uma imagem para destacar seu anúncio. Pode ser a arte do evento, foto do local, etc.</p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingBanner(true); }}
                  onDragLeave={() => setIsDraggingBanner(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingBanner(false);
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) { toast.error("Apenas imagens são aceitas"); return; }
                    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }
                    setBannerFile(file);
                    setSelectedBanner(URL.createObjectURL(file));
                  }}
                  onClick={() => document.getElementById("banner-upload")?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    isDraggingBanner
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : selectedBanner
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <input
                    id="banner-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/")) { toast.error("Apenas imagens são aceitas"); return; }
                      if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }
                      setBannerFile(file);
                      setSelectedBanner(URL.createObjectURL(file));
                    }}
                  />
                  {selectedBanner ? (
                    <div className="flex items-center justify-center gap-4">
                      <img src={selectedBanner} alt="Preview" className="w-24 h-16 object-cover rounded-lg" />
                      <div className="text-left">
                        <p className="font-semibold text-foreground text-sm">{bannerFile?.name || "Imagem selecionada"}</p>
                        <p className="text-xs text-muted-foreground">Clique ou arraste para trocar</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                        <ImageIcon className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">Arraste uma imagem ou clique para enviar</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP · Máx. 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Genre selection */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-foreground">Gênero musical</h3>
                <CategoryGrid
                  selectedCategory={editedEvent.category}
                  onCategoryChange={(cat) => setEditedEvent({ ...editedEvent, category: cat })}
                  variant="sell"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("search")} size="lg" className="rounded-xl gap-2">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
                <Button onClick={handleConfirmEvent} disabled={bannerUploading} size="lg" className="flex-1 gap-2 rounded-xl">
                  {bannerUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {bannerUploading ? "Enviando..." : "Confirmar"} <ArrowRight className="w-4 h-4" />
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
                    <Label htmlFor="originalPrice" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preço original (R$)</Label>
                    <Input id="originalPrice" type="number" placeholder="Valor de face do ingresso" value={ticketForm.originalPrice} onChange={(e) => setTicketForm({ ...ticketForm, originalPrice: e.target.value })} className="rounded-xl h-11" />
                    <p className="text-[11px] text-muted-foreground">Informe o valor que você pagou originalmente</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preço de revenda (R$) *</Label>
                  <Input id="price" type="number" placeholder="Quanto você quer receber" value={ticketForm.price} onChange={(e) => setTicketForm({ ...ticketForm, price: e.target.value })} className="rounded-xl h-11" />
                  {ticketForm.price && parseFloat(ticketForm.price) > 0 && (
                    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Você recebe</span>
                        <span className="font-bold text-success">R$ {parseFloat(ticketForm.price).toFixed(2).replace(".", ",")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa Tiko Pass (10%)</span>
                        <span className="text-muted-foreground">+ R$ {(parseFloat(ticketForm.price) * 0.10).toFixed(2).replace(".", ",")}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between text-sm">
                        <span className="font-semibold text-foreground">Comprador paga</span>
                        <span className="font-bold text-foreground">R$ {(parseFloat(ticketForm.price) * 1.10).toFixed(2).replace(".", ",")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Detalhes do ingresso ── */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" /> Detalhes do ingresso
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ajude o comprador a entender exatamente o que está comprando.
                  </p>
                </div>

                {/* Tipo de acesso */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Qual é o tipo deste ingresso? *
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: "passaporte", l: "Passaporte (todos os dias)" },
                      { v: "dia_unico", l: "Dia único" },
                      { v: "vip", l: "VIP / Camarote" },
                      { v: "open_bar", l: "Open Bar" },
                      { v: "pista", l: "Pista" },
                      { v: "meia_entrada", l: "Meia-entrada" },
                      { v: "outro", l: "Outro" },
                    ].map((opt) => {
                      const active = accessType === opt.v;
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => {
                            setAccessType(opt.v);
                            if (opt.v !== "passaporte" && opt.v !== "dia_unico") setEventDays([]);
                          }}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-foreground border-border hover:border-primary/40"
                          }`}
                        >
                          {opt.l}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dias do evento (condicional) */}
                {(accessType === "passaporte" || accessType === "dia_unico") && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {accessType === "passaporte" ? "Quais dias este ingresso dá acesso?" : "Para qual dia é o ingresso?"}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {eventDays.map((d, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">
                          {d}
                          <button
                            type="button"
                            onClick={() => setEventDays(eventDays.filter((_, idx) => idx !== i))}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: Sex 26/12 ou Sábado"
                        value={dayInput}
                        onChange={(e) => setDayInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = dayInput.trim();
                            if (!v) return;
                            if (accessType === "dia_unico") setEventDays([v]);
                            else if (!eventDays.includes(v)) setEventDays([...eventDays, v]);
                            setDayInput("");
                          }
                        }}
                        className="rounded-xl h-10"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl shrink-0"
                        onClick={() => {
                          const v = dayInput.trim();
                          if (!v) return;
                          if (accessType === "dia_unico") setEventDays([v]);
                          else if (!eventDays.includes(v)) setEventDays([...eventDays, v]);
                          setDayInput("");
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Open bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground">Inclui open bar?</Label>
                    <p className="text-xs text-muted-foreground">Bebidas inclusas no ingresso</p>
                  </div>
                  <Switch checked={includesOpenBar} onCheckedChange={setIncludesOpenBar} />
                </div>

                {/* Meia-entrada */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground">Este ingresso é meia-entrada?</Label>
                      <p className="text-xs text-muted-foreground">Estudante, idoso, PCD, etc.</p>
                    </div>
                    <Switch checked={isHalfPrice} onCheckedChange={setIsHalfPrice} />
                  </div>
                  {isHalfPrice && (
                    <p className="text-xs text-warning bg-warning/10 px-3 py-2 rounded-lg">
                      ⚠️ O comprador precisará apresentar comprovante na portaria.
                    </p>
                  )}
                </div>

                {/* Descrição livre */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Descrição adicional (opcional)
                  </Label>
                  <Textarea
                    value={sellerDescription}
                    onChange={(e) => setSellerDescription(e.target.value.slice(0, 500))}
                    placeholder="Ex: Ingresso passaporte válido para os 3 dias. Setor open bar fica na lateral esquerda do palco. Comprei 2, vendo apenas 1."
                    className="rounded-xl min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">
                    {500 - sellerDescription.length} caracteres restantes
                  </p>
                </div>

                {/* Tags extras */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tags extras (opcional)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {extraTags.map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">
                        {t}
                        <button
                          type="button"
                          onClick={() => setExtraTags(extraTags.filter((_, idx) => idx !== i))}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite uma tag e pressione Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value.slice(0, 30))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const v = tagInput.trim();
                          if (!v || extraTags.length >= 5 || extraTags.includes(v)) return;
                          setExtraTags([...extraTags, v]);
                          setTagInput("");
                        }
                      }}
                      disabled={extraTags.length >= 5}
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Inclui estacionamento",
                      "Open food",
                      "Área VIP com lounge",
                      "Frente ao palco",
                      "Camarote coberto",
                      "Assento numerado",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={extraTags.length >= 5 || extraTags.includes(s)}
                        onClick={() => extraTags.length < 5 && !extraTags.includes(s) && setExtraTags([...extraTags, s])}
                        className="text-[11px] px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Máx. 5 tags · 30 caracteres cada</p>
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
                  disabled={!ticketForm.sector || !ticketForm.price || !ticketFile || !accessType || submitting}
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
              {savedTicketId && <ManualTicketeiraFallback ticketId={savedTicketId} />}
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
