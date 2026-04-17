import { useState, useEffect, useMemo } from "react";
import { Search, ArrowRight, X, SlidersHorizontal, MapPin, Calendar, Guitar, Disc3, Drum, Headphones, Mic, Piano, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TicketCard from "@/components/TicketCard";
import heroBg from "@/assets/hero-bg.jpg";
import sellCtaBg from "@/assets/sell-cta.jpg";
import CityFilter from "@/components/CityFilter";
import CategoryGrid from "@/components/CategoryGrid";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OnboardingModal from "@/components/OnboardingModal";
import HowItWorks from "@/components/HowItWorks";
import PopularEvents, { type PopularEventItem } from "@/components/PopularEvents";
import TrustBanner from "@/components/TrustBanner";

import SocialProof from "@/components/SocialProof";
import QuickDateFilters, { getDateRange } from "@/components/QuickDateFilters";
import { fetchTickets, searchEventsWithAI, searchEventsLocal, type Ticket as TicketType } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { useUserCity } from "@/hooks/use-user-city";
import { toast } from "sonner";

type DateFilter = "" | "today" | "tomorrow" | "weekend";

const CATEGORIES = [
  { label: "Sertanejo", icon: Guitar },
  { label: "Rock", icon: Disc3 },
  { label: "Pagode", icon: Drum },
  { label: "Eletrônico", icon: Headphones },
  { label: "Funk", icon: Mic },
  { label: "Forró", icon: Piano },
  { label: "Outro", icon: Sparkles },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border animate-pulse">
      <div className="h-36 md:h-44 bg-muted" />
      <div className="p-3 md:p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-5 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

export default function Index() {
  const { city: userCity } = useUserCity();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("");
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [localEvents, setLocalEvents] = useState<any[]>([]);

  const normalizedSearch = search.trim();
  const hasActiveSearch = normalizedSearch.length > 0;
  const hasFilters = selectedCity || selectedCategory || dateFilter;

  const [aiEvents, setAiEvents] = useState<any[]>([]);

  // Local-first search: check DB first (accent-insensitive)
  useEffect(() => {
    if (normalizedSearch.length < 2) { setLocalEvents([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await searchEventsLocal(normalizedSearch, selectedCity || userCity || "");
        setLocalEvents(results);
      } catch (e) { console.error("Local search error:", e); }
    }, 300);
    return () => clearTimeout(timer);
  }, [normalizedSearch, selectedCity, userCity]);

  const handleAISearch = async () => {
    if (normalizedSearch.length < 2) return;
    setAiSearching(true);
    setAiEvents([]);
    try {
      const results = await searchEventsWithAI(normalizedSearch, selectedCity || userCity || "");
      setAiEvents(results);
      if (results.length === 0) toast.info("Nenhum evento encontrado pela busca inteligente.");
    } catch (err: any) {
      toast.error(err.message || "Erro na busca inteligente");
    } finally {
      setAiSearching(false);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    setAiEvents([]);
    try {
      const dateRange = getDateRange(dateFilter);
      const data = await fetchTickets({
        city: selectedCity || undefined,
        category: selectedCategory || undefined,
        search: normalizedSearch || undefined,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      });
      setTickets(data as any);
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = hasActiveSearch ? 400 : 0;
    const timer = window.setTimeout(loadTickets, delay);
    return () => window.clearTimeout(timer);
  }, [selectedCity, selectedCategory, normalizedSearch, dateFilter]);

  const popularEvents = useMemo<PopularEventItem[]>(() => {
    const eventMap = new Map<string, PopularEventItem>();
    tickets.forEach((ticket: any) => {
      const event = ticket.events || ticket.event;
      if (!event?.id) return;
      const existing = eventMap.get(event.id);
      if (existing) { existing.ticketCount += 1; return; }
      eventMap.set(event.id, {
        id: event.id, name: event.name, venue: event.venue,
        city: event.city, date: event.date, category: event.category, ticketCount: 1,
      });
    });
    return Array.from(eventMap.values())
      .sort((a, b) => b.ticketCount !== a.ticketCount
        ? b.ticketCount - a.ticketCount
        : new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);
  }, [tickets]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans pb-bottom-nav">
      
      <Navbar />
      <OnboardingModal />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[280px] md:min-h-[420px]">
        <img
          src={heroBg}
          alt="Show de música ao vivo"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

        <div className="relative container pt-10 pb-8 md:pt-28 md:pb-20">
          <div className="max-w-xl mb-5 md:mb-8 space-y-2 md:space-y-3">
            <h1 className="text-2xl md:text-5xl font-bold text-white leading-tight tracking-tight drop-shadow">
              Seu próximo show<br className="hidden md:block" /> começa aqui.
            </h1>
            <p className="text-white/70 text-sm md:text-lg">
              Ingressos verificados por IA. Pagamento protegido.
            </p>
          </div>

          {/* ── Search bar ── */}
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden max-w-2xl">
            <div className="flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 flex-1">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Evento</span>
                <input
                  className="text-sm bg-transparent outline-none placeholder:text-muted-foreground text-foreground w-full"
                  placeholder="Artista, show, festival..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadTickets()}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 flex-1">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Cidade</span>
                <input
                  className="text-sm bg-transparent outline-none placeholder:text-muted-foreground text-foreground w-full"
                  placeholder="Onde?"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                />
              </div>
            </div>

            <div className="px-3 py-2 md:py-3 flex justify-center sm:justify-start">
              <button
                onClick={loadTickets}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-6 py-2.5 md:py-3 rounded-xl transition-colors w-full sm:w-auto"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY TABS ──────────────────────────────────────────────── */}
      {!hasActiveSearch && (
        <section className="border-b border-border sticky top-14 md:top-16 z-30 bg-background/95 backdrop-blur-sm">
          <div className="container">
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-5 md:gap-8 overflow-x-auto no-scrollbar py-3 md:py-4 flex-1">
                {CATEGORIES.map(({ label, icon: Icon }) => {
                  const isSelected = selectedCategory === label;
                  return (
                    <button
                      key={label}
                      onClick={() => setSelectedCategory(isSelected ? "" : label)}
                      className={`flex flex-col items-center gap-1 min-w-fit pb-1.5 md:pb-2 border-b-2 transition-all duration-200 ${
                        isSelected
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={isSelected ? 2 : 1.5} />
                      <span className="text-[10px] md:text-xs font-medium whitespace-nowrap">{label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                className="flex items-center gap-2 text-xs font-medium border border-border rounded-xl px-3 py-2 md:px-4 md:py-2.5 ml-2 md:ml-4 hover:shadow-md transition-shadow shrink-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                {hasFilters && (
                  <span className="bg-foreground text-background text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">!</span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="pb-4 pt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 md:gap-6">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Quando?
                    </p>
                    <QuickDateFilters selected={dateFilter} onChange={setDateFilter} />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Localização
                    </p>
                    <CityFilter
                      selectedCity={selectedCity}
                      onCityChange={setSelectedCity}
                      selectedCategory={selectedCategory}
                      onCategoryChange={setSelectedCategory}
                    />
                  </div>
                </div>
                {hasFilters && (
                  <button
                    className="text-sm text-muted-foreground underline underline-offset-2"
                    onClick={() => { setSelectedCity(""); setSelectedCategory(""); setDateFilter(""); }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── POPULAR EVENTS ───────────────────────────────────────────── */}
      {!hasActiveSearch && <PopularEvents events={popularEvents} />}

      {/* ── TICKETS GRID ─────────────────────────────────────────────── */}
      <section className="flex-1 container py-4 md:py-6 pb-8 md:pb-16">
        {hasActiveSearch && (
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-foreground">
                Resultados para <span className="text-primary">"{normalizedSearch}"</span>
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {loading ? "Buscando..." : `${tickets.length} ingresso${tickets.length !== 1 ? "s" : ""} encontrado${tickets.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs" onClick={() => setSearch("")}>
              <X className="w-3.5 h-3.5" /> Limpar
            </Button>
          </div>
        )}

        {!hasActiveSearch && (
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              {selectedCategory ? selectedCategory : "Todos os ingressos"}
              {selectedCity && <span className="text-muted-foreground font-normal"> · {selectedCity}</span>}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {loading ? "" : `${tickets.length} disponíveis`}
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : tickets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
            {tickets.map((ticket: any, i) => (
              <TicketCard
                key={ticket.id}
                ticket={{ ...ticket, event: ticket.events, sellerName: ticket.profiles?.display_name || "Vendedor" }}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 md:py-16 space-y-4 text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-muted flex items-center justify-center text-3xl md:text-4xl">
              🎟️
            </div>
            <h3 className="font-bold text-lg md:text-xl text-foreground">
              {hasActiveSearch ? "Nenhum ingresso encontrado" : dateFilter ? "Nenhum evento nesse período" : "Ainda sem ingressos"}
            </h3>
            <p className="text-muted-foreground text-xs md:text-sm max-w-sm">
              {hasActiveSearch
                ? "Não encontramos ingressos à venda, mas podemos buscar se o evento existe."
                : "Seja o primeiro a vender na plataforma!"}
            </p>
            {hasActiveSearch ? (
              <div className="flex flex-col items-center gap-3">
                <Button
                  className="rounded-full gap-2 px-5 text-sm"
                  onClick={handleAISearch}
                  disabled={aiSearching}
                >
                  {aiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {aiSearching ? "Buscando..." : "Buscar evento com IA"}
                </Button>
                <Button variant="outline" className="rounded-full gap-2 text-sm" onClick={() => { setSearch(""); setAiEvents([]); setLocalEvents([]); }}>
                  <X className="w-4 h-4" /> Limpar busca
                </Button>
              </div>
            ) : (
              <Link to="/sell">
                <Button className="rounded-full gap-2 px-5 text-sm">
                  Vender ingresso <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Local DB events found (accent-insensitive) */}
        {localEvents.length > 0 && tickets.length === 0 && (
          <div className="mt-6 md:mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <h3 className="text-base md:text-lg font-bold text-foreground">Eventos cadastrados</h3>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Estes eventos existem na plataforma mas podem não ter ingressos à venda ainda.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {localEvents.map((event) => (
                <div key={event.id} className="bg-card rounded-2xl border border-border p-4 md:p-5 hover:border-primary/30 transition-colors space-y-2 md:space-y-3 cursor-pointer" onClick={() => navigate(`/event/${event.id}`)}>
                  <div>
                    <h4 className="font-bold text-foreground text-sm md:text-base">{event.name}</h4>
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5" /> {event.date} · {event.time}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {event.venue}, {event.city}
                    </p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{event.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI-discovered events */}
        {aiEvents.length > 0 && (
          <div className="mt-6 md:mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-base md:text-lg font-bold text-foreground">Eventos encontrados pela IA</h3>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Estes eventos existem mas ainda não têm ingressos à venda na Tiko Pass.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {aiEvents.map((event, i) => (
                <div key={i} className="bg-card rounded-2xl border border-border p-4 md:p-5 hover:border-primary/30 transition-colors space-y-2 md:space-y-3">
                  <div>
                    <h4 className="font-bold text-foreground text-sm md:text-base">{event.name}</h4>
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5" /> {event.date} · {event.time}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {event.venue}, {event.city}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{event.category}</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground">Sem ingressos à venda</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SELL CTA ──────────────────────────────────────────────────── */}
      {!hasActiveSearch && (
        <section className="container pb-8 md:pb-16">
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl text-white p-6 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            <img
              src={sellCtaBg}
              alt="Ingressos em show"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              width={1920}
              height={800}
            />
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative space-y-2 max-w-md text-center md:text-left">
              <p className="text-[10px] md:text-sm font-semibold uppercase tracking-widest text-white/50">Para vendedores</p>
              <h2 className="text-xl md:text-3xl font-bold leading-tight">
                Tem ingressos sobrando?
              </h2>
              <p className="text-white/60 text-xs md:text-sm leading-relaxed">
                Cadastre em segundos com ajuda de IA. Receba com segurança após o evento.
              </p>
            </div>

            <Link to="/sell" className="relative shrink-0">
              <button className="bg-white text-black font-bold text-sm px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl hover:bg-white/90 transition-colors flex items-center gap-2 shadow-lg">
                Vender ingresso <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </section>
      )}

      {!hasActiveSearch && <SocialProof />}
      {!hasActiveSearch && <HowItWorks />}
      {!hasActiveSearch && <TrustBanner />}

      <Footer />
    </div>
  );
}
