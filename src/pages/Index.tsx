import { useState, useEffect } from "react";
import { Search, Ticket, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TicketCard from "@/components/TicketCard";
import CityFilter from "@/components/CityFilter";
import CategoryGrid from "@/components/CategoryGrid";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

  useEffect(() => {
    loadTickets();
  }, [selectedCity, selectedCategory]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchTickets({
        city: selectedCity || undefined,
        category: selectedCategory || undefined,
        search: search || undefined,
      });
      setTickets(data as any);
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadTickets();
  };

  const stats = [
    { value: "12.4k+", label: "Ingressos vendidos" },
    { value: "850+", label: "Eventos ativos" },
    { value: "98%", label: "Avaliações positivas" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div
          ref={heroReveal.ref}
          className={`container relative py-16 md:py-24 ${heroReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
        >
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Marketplace de ingressos com IA
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-[1.1]">
              Compre e venda ingressos com segurança
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              Encontre ingressos para os melhores eventos do Brasil. Negocie diretamente com outros fãs, sem intermediários.
            </p>

            <div className="flex gap-2 max-w-md">
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
              <Button variant="hero" size="lg" className="rounded-xl shrink-0" onClick={handleSearch}>
                Buscar
              </Button>
            </div>

            <div className="flex gap-8 pt-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="font-display font-bold text-2xl text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories - GetNinjas style */}
      <section className="border-y border-border bg-card/50">
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

      {/* Tickets grid */}
      <section className="flex-1">
        <div
          ref={ticketsReveal.ref}
          className={`container py-12 ${ticketsReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">
                Ingressos disponíveis
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? "Carregando..." : `${tickets.length} ingresso${tickets.length !== 1 ? "s" : ""} encontrado${tickets.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-success" />
              Atualizados em tempo real
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
              <h3 className="font-display font-semibold text-lg">Nenhum ingresso disponível</h3>
              <p className="text-sm text-muted-foreground">Seja o primeiro a vender ingressos na plataforma!</p>
              <Link to="/sell">
                <Button className="rounded-xl gap-2 mt-2">
                  Vender ingresso
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA sell */}
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

      <Footer />
    </div>
  );
}
