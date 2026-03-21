import { useState, useEffect, useMemo } from "react";
import { Search, Ticket, ArrowRight, Sparkles, TrendingUp, Shield, Zap, X } from "lucide-react";
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
import { fetchTickets, type Ticket as TicketType } from "@/lib/api";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { Link } from "react-router-dom";

export default function Index() {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("Salvador");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  const heroReveal = useScrollReveal<HTMLDivElement>();
  const filtersReveal = useScrollReveal<HTMLDivElement>();
  const ticketsReveal = useScrollReveal<HTMLDivElement>();
  const ctaReveal = useScrollReveal<HTMLDivElement>();

  const normalizedSearch = search.trim();
  const hasActiveSearch = normalizedSearch.length > 0;

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchTickets({
        city: selectedCity || undefined,
        category: selectedCategory || undefined,
        search: normalizedSearch || undefined,
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
    const timer = window.setTimeout(() => {
      loadTickets();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [selectedCity, selectedCategory, normalizedSearch]);

  const handleSearch = () => {
    loadTickets();
  };

  const popularEvents = useMemo<PopularEventItem[]>(() => {
    const eventMap = new Map<string, PopularEventItem>();

    tickets.forEach((ticket: any) => {
      const event = ticket.events || ticket.event;
      if (!event?.id) return;

      const existing = eventMap.get(event.id);
      if (existing) {
        existing.ticketCount += 1;
        return;
      }

      eventMap.set(event.id, {
        id: event.id,
        name: event.name,
        venue: event.venue,
        city: event.city,
        date: event.date,
        category: event.category,
        ticketCount: 1,
      });
    });

    return Array.from(eventMap.values())
      .sort((a, b) => {
        if (b.ticketCount !== a.ticketCount) return b.ticketCount - a.ticketCount;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      })
      .slice(0, 6);
  }, [tickets]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div
          ref={heroReveal.ref}
          className={`container relative ${hasActiveSearch ? "py-10 md:py-12" : "py-16 md:py-24"} ${heroReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
        >
          <div className={`${hasActiveSearch ? "max-w-4xl" : "max-w-2xl"} space-y-6`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              {hasActiveSearch ? "Resultados da busca" : "Marketplace de ingressos com IA"}
            </div>

            <div className={`${hasActiveSearch ? "flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5" : "space-y-6"}`}>
              <div className="space-y-3">
                <h1 className={`${hasActiveSearch ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl lg:text-6xl"} font-display font-bold text-foreground leading-[1.1]`}>
                  {hasActiveSearch ? `Resultados para “${normalizedSearch}”` : "Compre e venda ingressos com segurança"}
                </h1>

                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                  {hasActiveSearch
                    ? "Agora você está em modo de busca: mostramos os ingressos encontrados com foco total nos resultados."
                    : "Encontre ingressos para os melhores eventos de Salvador e Bahia. Negocie diretamente com outros fãs, com pagamento protegido."}
                </p>
              </div>

              {hasActiveSearch && (
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full border border-border bg-card px-3 py-1.5">
                    Cidade: {selectedCity}
                  </span>
                  {selectedCategory && (
                    <span className="rounded-full border border-border bg-card px-3 py-1.5">
                      Categoria: {selectedCategory}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 max-w-3xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar evento ou local..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 h-12 rounded-xl bg-card border-border"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="hero" size="lg" className="rounded-xl" onClick={handleSearch}>
                  Buscar
                </Button>
                {hasActiveSearch && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-xl gap-2"
                    onClick={() => setSearch("")}
                  >
                    <X className="w-4 h-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {!hasActiveSearch && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-success" />
                  Pagamento protegido
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" />
                  Cadastro com IA
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Sem taxas escondidas
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {!hasActiveSearch && (
        <section className="border-b border-border bg-card/50">
          <div
            ref={filtersReveal.ref}
            className={`container py-8 space-y-6 ${filtersReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
            style={{ animationDelay: "100ms" }}
          >
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground mb-4">O que você procura?</h2>
              <CategoryGrid
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
            <CityFilter
              selectedCity={selectedCity}
              onCityChange={setSelectedCity}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>
        </section>
      )}

      {!hasActiveSearch && <PopularEvents events={popularEvents} />}

      <section className={`flex-1 ${hasActiveSearch ? "bg-muted/20" : "border-t border-border"}`}>
        <div
          ref={ticketsReveal.ref}
          className={`container py-12 ${ticketsReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">
                {hasActiveSearch ? "Ingressos encontrados" : "Ingressos disponíveis"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {loading
                  ? "Carregando..."
                  : hasActiveSearch
                    ? `${tickets.length} resultado${tickets.length !== 1 ? "s" : ""} para “${normalizedSearch}”`
                    : `${tickets.length} ingresso${tickets.length !== 1 ? "s" : ""} encontrado${tickets.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-success" />
              {hasActiveSearch ? "Modo resultados" : "Atualizados em tempo real"}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
                  <div className="h-1.5 bg-muted rounded mb-4" />
                  <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3 mb-4" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : tickets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tickets.map((ticket: any, i) => (
                <TicketCard
                  key={ticket.id}
                  ticket={{
                    ...ticket,
                    event: ticket.events,
                    sellerName: ticket.profiles?.display_name || "Vendedor",
                  }}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Ticket className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg">
                {hasActiveSearch ? "Nenhum resultado encontrado" : "Nenhum ingresso disponível"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveSearch
                  ? "Tente outro nome de evento ou limpe a busca para voltar à navegação principal."
                  : "Seja o primeiro a vender ingressos na plataforma!"}
              </p>
              {hasActiveSearch ? (
                <Button variant="outline" className="rounded-xl gap-2 mt-2" onClick={() => setSearch("")}>
                  <X className="w-4 h-4" />
                  Limpar busca
                </Button>
              ) : (
                <Link to="/sell">
                  <Button className="rounded-xl gap-2 mt-2">
                    Vender ingresso
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {!hasActiveSearch && <HowItWorks />}
      {!hasActiveSearch && <TrustBanner />}

      {!hasActiveSearch && (
        <section className="border-t border-border">
          <div
            ref={ctaReveal.ref}
            className={`container py-16 ${ctaReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
            style={{ animationDelay: "100ms" }}
          >
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  Tem ingressos sobrando?
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Venda seus ingressos de forma rápida e segura. Nossa IA ajuda a cadastrar o evento corretamente.
                </p>
              </div>
              <Link to="/sell">
                <Button variant="hero" size="xl" className="gap-2 rounded-xl animate-pulse-glow">
                  Vender ingresso
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
