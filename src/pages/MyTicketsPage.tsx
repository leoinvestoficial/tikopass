import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyTickets } from "@/lib/api";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Ticket, Loader2, Calendar, MapPin, Tag, ArrowRight, Clock,
} from "lucide-react";

export default function MyTicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "past">("active");

  const headerReveal = useScrollReveal<HTMLDivElement>();
  const contentReveal = useScrollReveal<HTMLDivElement>();

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchMyTickets(user.id);
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const activeTickets = tickets.filter(
    (t) => t.events && t.events.date >= today && t.status === "available"
  );
  const pastTickets = tickets.filter(
    (t) => t.events && (t.events.date < today || t.status !== "available")
  );
  const displayedTickets = tab === "active" ? activeTickets : pastTickets;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <div
          ref={headerReveal.ref}
          className={`container py-8 ${headerReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
        >
          <h1 className="text-3xl font-display font-bold">Meus Ingressos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os ingressos que você colocou à venda.
          </p>
        </div>

        <div
          ref={contentReveal.ref}
          className={`container pb-12 ${contentReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
          style={{ animationDelay: "100ms" }}
        >
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("active")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                tab === "active"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Ativos ({activeTickets.length})
            </button>
            <button
              onClick={() => setTab("past")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                tab === "past"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Encerrados ({pastTickets.length})
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : displayedTickets.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                {tab === "active" ? (
                  <Ticket className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Clock className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="font-display font-semibold text-lg">
                {tab === "active"
                  ? "Nenhum ingresso ativo"
                  : "Nenhum ingresso encerrado"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {tab === "active"
                  ? "Quando você publicar um ingresso para venda, ele aparecerá aqui."
                  : "Ingressos de eventos passados ou já vendidos aparecerão aqui."}
              </p>
              {tab === "active" && (
                <Link to="/sell">
                  <Button className="rounded-xl gap-2 mt-2">
                    Vender ingresso
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedTickets.map((ticket) => {
                const event = ticket.events;
                if (!event) return null;
                const isPast = event.date < today;
                const isSold = ticket.status === "sold";

                return (
                  <Link
                    key={ticket.id}
                    to={`/event/${event.id}`}
                    className="block group"
                  >
                    <div
                      className={`bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:shadow-md ${
                        isPast || isSold ? "opacity-75" : ""
                      }`}
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                            {event.name}
                          </h3>
                          {isPast && (
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground border-muted"
                            >
                              Encerrado
                            </Badge>
                          )}
                          {isSold && (
                            <Badge className="bg-success/10 text-success border-success/20 text-xs">
                              Vendido
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(event.date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}{" "}
                            · {event.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.venue}
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" />
                            {ticket.sector}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display font-bold text-xl text-foreground">
                          R$ {ticket.price.toLocaleString("pt-BR")}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          {isPast || isSold ? "Preço final" : "Preço anunciado"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
