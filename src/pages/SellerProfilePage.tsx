import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchSellerProfile } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User, Star, Calendar, MapPin, Ticket, ArrowLeft, Loader2,
  ShieldCheck, Clock, Award,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export default function SellerProfilePage() {
  const { userId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const headerReveal = useScrollReveal<HTMLDivElement>();
  const contentReveal = useScrollReveal<HTMLDivElement>();

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const result = await fetchSellerProfile(userId!);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAccountAge = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days} dia${days !== 1 ? "s" : ""}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years} ano${years > 1 ? "s" : ""}${remainingMonths > 0 ? ` e ${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}` : ""}`;
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= Math.round(rating)
              ? "text-warning fill-warning"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-display font-bold">Perfil não encontrado</h2>
            <Link to="/"><Button variant="outline">Voltar para a home</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { profile, ratings, avgRating, ratingCount, tickets, totalSales } = data;
  const accountAge = getAccountAge(profile.created_at);
  const today = new Date().toISOString().split("T")[0];
  const activeTickets = tickets.filter((t: any) => t.events?.date >= today && t.status === "available");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div
          ref={headerReveal.ref}
          className={`container py-10 ${headerReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>

          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || "Vendedor"}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>

            <div className="space-y-3 min-w-0">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {profile.display_name || "Vendedor"}
                </h1>
                {profile.city && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.city}
                  </p>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Membro há <span className="font-medium text-foreground">{accountAge}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Ticket className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{totalSales}</span> venda{totalSales !== 1 ? "s" : ""} realizada{totalSales !== 1 ? "s" : ""}
                  </span>
                </div>
                {avgRating !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    {renderStars(avgRating)}
                    <span className="text-muted-foreground">
                      {avgRating.toFixed(1)} ({ratingCount} avaliação{ratingCount !== 1 ? "ões" : ""})
                    </span>
                  </div>
                )}
                {ratingCount === 0 && (
                  <Badge variant="secondary" className="text-xs">Novo vendedor</Badge>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground max-w-lg">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div
        ref={contentReveal.ref}
        className={`container py-10 ${contentReveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
        style={{ animationDelay: "150ms" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active listings */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground mb-4">
                Ingressos à venda ({activeTickets.length})
              </h2>
              {activeTickets.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <Ticket className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum ingresso à venda no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTickets.map((ticket: any) => (
                    <Link
                      key={ticket.id}
                      to={`/ticket/${ticket.id}`}
                      className="block group"
                    >
                      <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors text-sm truncate">
                            {(ticket.events as any)?.name || "Evento"}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date((ticket.events as any)?.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {(ticket.events as any)?.city}
                            </span>
                          </div>
                        </div>
                        <span className="font-display font-bold text-foreground shrink-0">
                          R$ {ticket.price || "—"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reviews sidebar */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground mb-4">
                Avaliações ({ratingCount})
              </h2>
              {ratings.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
                  <Award className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Ainda sem avaliações.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratings.map((review: any, i: number) => (
                    <div
                      key={i}
                      className="bg-card rounded-xl border border-border p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {review.buyer_name}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= review.rating
                                  ? "text-warning fill-warning"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">
                          {review.comment}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trust indicators */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-display font-semibold text-foreground">
                Segurança
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                  Pagamento protegido pela plataforma
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  Conta criada há {accountAge}
                </div>
                {totalSales > 0 && (
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-accent shrink-0" />
                    {totalSales} transação{totalSales > 1 ? "ões" : ""} concluída{totalSales > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
