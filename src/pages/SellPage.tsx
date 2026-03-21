import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, ArrowRight, Sparkles, MapPin, Calendar, Tag, Loader2 } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useAuth } from "@/hooks/use-auth";
import { searchEventsWithAI, createEvent, createTicket } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type AIEvent = {
  name: string; date: string; time: string; venue: string; city: string; category: string;
};

type Step = "search" | "confirm" | "details" | "success";

export default function SellPage() {
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [aiResults, setAiResults] = useState<AIEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AIEvent | null>(null);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketForm, setTicketForm] = useState({ sector: "", row: "", seat: "", price: "" });
  const [editedEvent, setEditedEvent] = useState<AIEvent | null>(null);

  const heroReveal = useScrollReveal<HTMLDivElement>();
  const { user } = useAuth();
  const navigate = useNavigate();

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
    try {
      const created = await createEvent({
        ...editedEvent,
        source: "ai_search",
      });
      setSavedEventId(created.id);
      setSelectedEvent(editedEvent);
      setStep("details");
    } catch (err: any) {
      toast.error("Erro ao salvar evento: " + (err.message || ""));
    }
  };

  const handleSubmit = async () => {
    if (!savedEventId || !user) return;
    setSubmitting(true);
    try {
      await createTicket({
        event_id: savedEventId,
        seller_id: user.id,
        sector: ticketForm.sector,
        row: ticketForm.row || undefined,
        seat: ticketForm.seat || undefined,
        price: parseFloat(ticketForm.price),
      });
      setStep("success");
      toast.success("Ingresso publicado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao publicar ingresso: " + (err.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

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
            {[
              { key: "search", label: "Buscar evento" },
              { key: "confirm", label: "Confirmar" },
              { key: "details", label: "Cadastrar" },
            ].map((s, i) => {
              const stepOrder = ["search", "confirm", "details", "success"];
              const currentIndex = stepOrder.indexOf(step);
              const stepIndex = stepOrder.indexOf(s.key);
              const isActive = stepIndex <= currentIndex;
              return (
                <div key={s.key} className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-semibold shrink-0 transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {stepIndex < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                  </div>
                  {i < 2 && <div className={`h-px flex-1 ${isActive ? "bg-primary" : "bg-border"}`} />}
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
                  <Input
                    placeholder="Cidade (opcional)"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="rounded-xl"
                  />
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
          {step === "confirm" && selectedEvent && (
            <div className="space-y-6 animate-reveal-up">
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold">Confirme o evento</h1>
                <p className="text-muted-foreground">Verifique se os dados encontrados pela IA estão corretos.</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="font-display font-bold text-xl">{selectedEvent.name}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground block">Data</span><span className="font-medium">{selectedEvent.date}</span></div>
                  <div><span className="text-muted-foreground block">Horário</span><span className="font-medium">{selectedEvent.time}</span></div>
                  <div><span className="text-muted-foreground block">Local</span><span className="font-medium">{selectedEvent.venue}</span></div>
                  <div><span className="text-muted-foreground block">Cidade</span><span className="font-medium">{selectedEvent.city}</span></div>
                  <div><span className="text-muted-foreground block">Categoria</span><span className="font-medium">{selectedEvent.category}</span></div>
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

          {/* Step: Details */}
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
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("confirm")} className="flex-1 rounded-xl">Voltar</Button>
                <Button onClick={handleSubmit} disabled={!ticketForm.sector || !ticketForm.price || submitting} className="flex-1 gap-2 rounded-xl">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? "Publicando..." : "Publicar ingresso"}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center space-y-6 py-12 animate-reveal-scale">
              <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold">Ingresso publicado!</h1>
                <p className="text-muted-foreground max-w-sm mx-auto">Seu ingresso já está disponível na vitrine para compradores.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setStep("search"); setSearchQuery(""); setAiResults([]); setSelectedEvent(null); setTicketForm({ sector: "", row: "", seat: "", price: "" }); }} className="rounded-xl">Vender outro</Button>
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
