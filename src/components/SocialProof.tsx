import { ShieldCheck, Users, Ticket, Star } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const stats = [
  { icon: ShieldCheck, value: "100%", label: "Pagamento protegido", color: "text-success" },
  { icon: Users, value: "Verificados", label: "Vendedores com avaliação", color: "text-primary" },
  { icon: Ticket, value: "10%", label: "Taxa única e transparente", color: "text-accent" },
  { icon: Star, value: "4.8", label: "Nota dos compradores", color: "text-warning" },
];

export default function SocialProof() {
  const reveal = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-12 border-t border-border bg-card/30">
      <div
        ref={reveal.ref}
        className={`container ${reveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="text-center space-y-2"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Icon className={`w-6 h-6 mx-auto ${stat.color}`} />
                <div className="font-display font-bold text-2xl text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
