import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOCK_EVENTS } from "@/data/mock-data";
import { Search, CheckCircle2, ArrowRight, Sparkles, MapPin, Calendar, Tag } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

type Step = "search" | "confirm" | "details" | "success";

export default function SellPage() {
  const [step, setStep] = useState<Step>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({
    sector: "",
    row: "",
    seat: "",
    price: "",
  });

  const heroReveal = useScrollReveal<HTMLDivElement>();

  const searchResults = searchQuery.length >= 2
    ? MOCK_EVENTS.filter(
        (e) =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const selectedEvent = MOCK_EVENTS.find((e) => e.id === selectedEventId);

  const handleSubmit = () => {
    setStep("success");
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
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-semibold shrink-0 transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {stepIndex < currentIndex ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && <div className={`h-px flex-1 ${isActive ? "bg-primary" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>

          {/* Step: Search */}
          {step === "search" && (
            <div className="space-y-6 animate-reveal-up">
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold">Vender ingresso</h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Nossa IA ajuda a encontrar e confirmar o evento correto
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome do evento ou cidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{searchResults.length} evento(s) encontrado(s)</p>
                  {searchResults.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setStep("confirm");
                      }}
                      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200 active:scale-[0.98] space-y-2"
                    >
                      <div className="font-display font-semibold text-foreground">{event.name}</div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.date).toLocaleDateString("pt-BR")} · {event.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.venue} · {event.city}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <p className="text-muted-foreground">Nenhum evento encontrado.</p>
                  <p className="text-sm text-muted-foreground">Tente buscar com outros termos.</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && selectedEvent && (
            <div className="space-y-6 animate-reveal-up">
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold">Confirme o evento</h1>
                <p className="text-muted-foreground">Verifique se os dados estão corretos antes de continuar.</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="font-display font-bold text-xl">{selectedEvent.name}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Data</span>
                    <span className="font-medium">{new Date(selectedEvent.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Horário</span>
                    <span className="font-medium">{selectedEvent.time}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Local</span>
                    <span className="font-medium">{selectedEvent.venue}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Cidade</span>
                    <span className="font-medium">{selectedEvent.city}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("search")} className="flex-1 rounded-xl">
                  Buscar outro
                </Button>
                <Button onClick={() => setStep("details")} className="flex-1 gap-2 rounded-xl">
                  Confirmar e continuar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Details */}
          {step === "details" && selectedEvent && (
            <div className="space-y-6 animate-reveal-up">
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold">Dados do ingresso</h1>
                <p className="text-muted-foreground">
                  <Tag className="w-4 h-4 inline mr-1" />
                  {selectedEvent.name}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sector">Setor</Label>
                    <Input
                      id="sector"
                      placeholder="Ex: Pista Premium"
                      value={ticketForm.sector}
                      onChange={(e) => setTicketForm({ ...ticketForm, sector: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="row">Fileira</Label>
                    <Input
                      id="row"
                      placeholder="Ex: A (ou - se área livre)"
                      value={ticketForm.row}
                      onChange={(e) => setTicketForm({ ...ticketForm, row: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seat">Assento</Label>
                    <Input
                      id="seat"
                      placeholder="Ex: 12 (ou Área livre)"
                      value={ticketForm.seat}
                      onChange={(e) => setTicketForm({ ...ticketForm, seat: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="Ex: 500"
                      value={ticketForm.price}
                      onChange={(e) => setTicketForm({ ...ticketForm, price: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("confirm")} className="flex-1 rounded-xl">
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!ticketForm.sector || !ticketForm.price}
                  className="flex-1 gap-2 rounded-xl"
                >
                  Publicar ingresso
                  <ArrowRight className="w-4 h-4" />
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
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Seu ingresso já está disponível na vitrine. Você receberá notificações quando alguém quiser negociar.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setStep("search"); setSearchQuery(""); setSelectedEventId(null); setTicketForm({ sector: "", row: "", seat: "", price: "" }); }} className="rounded-xl">
                  Vender outro
                </Button>
                <Button asChild className="rounded-xl">
                  <a href="/">Ver vitrine</a>
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
