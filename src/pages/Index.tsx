import { useState, useEffect, useMemo } from "react";
import { Search, Ticket, ArrowRight, X, SlidersHorizontal, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TicketCard from "@/components/TicketCard";
import CityFilter from "@/components/CityFilter";
import CategoryGrid from "@/components/CategoryGrid";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HowItWorks from "@/components/HowItWorks";
import PopularEvents, { type PopularEventItem } from "@/components/PopularEvents";
import TrustBanner from "@/components/TrustBanner";

import SocialProof from "@/components/SocialProof";
import QuickDateFilters, { getDateRange } from "@/components/QuickDateFilters";
import { fetchTickets, type Ticket as TicketType } from "@/lib/api";
import { Link } from "react-router-dom";

type DateFilter = "" | "today" | "tomorrow" | "weekend";

// ─── Category pills with emoji covers ─────────────────────────────────────────
const CATEGORY_COVERS: Record<string, { emoji: string; bg: string }> = {
  Shows:       { emoji: "🎤", bg: "from-rose-500 to-pink-700" },
  Festas:      { emoji: "🎉", bg: "from-violet-500 to-purple-700" },
  Esportes:    { emoji: "⚽", bg: "from-green-500 to-emerald-700" },
  Teatro:      { emoji: "🎭", bg: "from-amber-500 to-orange-700" },
  Festivais:   { emoji: "🎪", bg: "from-sky-500 to-blue-700" },
  Outros:      { emoji: "✨", bg: "from-slate-500 to-gray-700" },
};

// ─── Destination-style category cards (like Airbnb's "Explore nearby") ───────
function CategoryCard({
  label,
  emoji,
  bg,
  selected,
  onClick,
}: {
  label: string;
  emoji: string;
  bg: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex flex-col items-center gap-2 rounded-2xl p-1
        transition-all duration-200 focus:outline-none
        ${selected ? "scale-95" : "hover:scale-105"}
      `}
    >
      <div
        className={`
          relative w-full aspect-square rounded-2xl bg-gradient-to-br ${bg}
          flex items-center justify-center text-4xl shadow-md
          ${selected ? "ring-2 ring-offset-2 ring-foreground" : ""}
          group-hover:shadow-xl transition-shadow duration-200
        `}
      >
        <span className="drop-shadow-sm">{emoji}</span>
      </div>
      <span
        className={`text-xs font-semibold tracking-wide uppercase
          ${selected ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border animate-pulse">
      <div className="h-44 bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-5 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Index() {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("");
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const normalizedSearch = search.trim();
  const hasActiveSearch = normalizedSearch.length > 0;
  const hasFilters = selectedCity || selectedCategory || dateFilter;

  const loadTickets = async () => {
    setLoading(true);
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
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <SafetyBanner />
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Full-bleed gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-background" />
        {/* Background image strip — replace src with a real event photo */}
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1400&q=80')",
          }}
        />

        <div className="relative container pt-20 pb-16 md:pt-28 md:pb-20">
          {/* Headline */}
          <div className="max-w-xl mb-8 space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight drop-shadow">
              Seu próximo evento<br />começa aqui.
            </h1>
            <p className="text-white/70 text-base md:text-lg">
              Ingressos verificados. Pagamento protegido. Salvador e Bahia.
            </p>
          </div>

          {/* ── Airbnb-style search bar ── */}
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden max-w-2xl">
            {/* Event search */}
            <div className="flex items-center gap-3 px-5 py-4 flex-1">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Evento</span>
                <input
                  className="text-sm bg-transparent outline-none placeholder:text-muted-foreground text-foreground w-full"
                  placeholder="Show, festa, jogo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadTickets()}
                />
              </div>
            </div>

            {/* City */}
            <div className="flex items-center gap-3 px-5 py-4 flex-1">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Cidade</span>
                <input
                  className="text-sm bg-transparent outline-none placeholder:text-muted-foreground text-foreground w-full"
                  placeholder="Onde?"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="px-3 py-3 flex justify-center sm:justify-start">
              <button
                onClick={loadTickets}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY PILLS (Airbnb "Explore categories") ─────────────────────── */}
      {!hasActiveSearch && (
        <section className="container py-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-foreground">O que você procura?</h2>
            <button
              className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-full px-3 py-1.5 hover:border-foreground transition-colors"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros {hasFilters && <span className="ml-1 bg-foreground text-background text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">!</span>}
            </button>
          </div>

          {/* Category grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Object.entries(CATEGORY_COVERS).map(([label, { emoji, bg }]) => (
              <CategoryCard
                key={label}
                label={label}
                emoji={emoji}
                bg={bg}
                selected={selectedCategory === label}
                onClick={() => setSelectedCategory(selectedCategory === label ? "" : label)}
              />
            ))}
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="mt-5 p-5 rounded-2xl border border-border bg-card space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Quando?
                </p>
                <QuickDateFilters selected={dateFilter} onChange={setDateFilter} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Localização
                </p>
                <CityFilter
                  selectedCity={selectedCity}
                  onCityChange={setSelectedCity}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />
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
        </section>
      )}

      {/* ── POPULAR EVENTS ────────────────────────────────────────────────────── */}
      {!hasActiveSearch && <PopularEvents events={popularEvents} />}

      {/* ── TICKETS GRID ─────────────────────────────────────────────────────── */}
      <section className="flex-1 container py-6 pb-16">

        {/* Active search state header */}
        {hasActiveSearch && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Resultados para <span className="text-primary">"{normalizedSearch}"</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {loading ? "Buscando..." : `${tickets.length} ingresso${tickets.length !== 1 ? "s" : ""} encontrado${tickets.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => setSearch("")}>
              <X className="w-3.5 h-3.5" /> Limpar
            </Button>
          </div>
        )}

        {/* Default state header */}
        {!hasActiveSearch && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">
              {selectedCategory ? selectedCategory : "Todos os ingressos"}
              {selectedCity && <span className="text-muted-foreground font-normal"> · {selectedCity}</span>}
            </h2>
            <p className="text-sm text-muted-foreground">
              {loading ? "" : `${tickets.length} disponíveis`}
            </p>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : tickets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {tickets.map((ticket: any, i) => (
              <TicketCard
                key={ticket.id}
                ticket={{ ...ticket, event: ticket.events, sellerName: ticket.profiles?.display_name || "Vendedor" }}
                index={i}
              />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center text-4xl">
              🎟️
            </div>
            <h3 className="font-bold text-xl text-foreground">
              {hasActiveSearch ? "Nenhum ingresso encontrado" : dateFilter ? "Nenhum evento nesse período" : "Ainda sem ingressos"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              {hasActiveSearch
                ? "Tente outro nome ou remova os filtros."
                : "Seja o primeiro a vender na plataforma!"}
            </p>
            {hasActiveSearch ? (
              <Button variant="outline" className="rounded-full gap-2" onClick={() => setSearch("")}>
                <X className="w-4 h-4" /> Limpar busca
              </Button>
            ) : (
              <Link to="/sell">
                <Button className="rounded-full gap-2 px-6">
                  Vender ingresso <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ── SELL CTA (Airbnb "Become a host" style) ──────────────────────────── */}
      {!hasActiveSearch && (
        <section className="container pb-16">
          <div className="relative overflow-hidden rounded-3xl bg-foreground text-background p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Decorative circle */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -right-6 -bottom-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

            <div className="relative space-y-2 max-w-md">
              <p className="text-sm font-semibold uppercase tracking-widest text-white/50">Para vendedores</p>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                Tem ingressos sobrando?
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Cadastre em segundos com ajuda de IA. Receba com segurança após o evento.
              </p>
            </div>

            <Link to="/sell" className="relative shrink-0">
              <button className="bg-white text-black font-bold text-sm px-8 py-4 rounded-2xl hover:bg-white/90 transition-colors flex items-center gap-2 shadow-lg">
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
