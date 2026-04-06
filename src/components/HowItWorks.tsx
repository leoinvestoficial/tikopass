import { Search, MessageSquare, ShieldCheck, ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const steps = [
  {
    icon: Search,
    title: "Encontre o evento",
    description: "Busque por shows, festivais e eventos musicais na sua cidade. Filtre por categoria, data e preço.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: MessageSquare,
    title: "Negocie com segurança",
    description: "Converse diretamente com o vendedor pelo chat. Faça sua proposta e chegue ao melhor preço.",
    accent: "bg-accent/10 text-accent",
  },
  {
    icon: ShieldCheck,
    title: "Pague com proteção",
    description: "Pagamento seguro via plataforma. O vendedor só recebe após a confirmação da entrega.",
    accent: "bg-success/10 text-success",
  },
];

export default function HowItWorks() {
  const reveal = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-16 md:py-20">
      <div
        ref={reveal.ref}
        className={`container ${reveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
      >
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Como funciona?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Em 3 passos simples você compra ou vende ingressos com total segurança.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative group"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${step.accent} flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-5xl font-display font-bold text-muted/60 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-lg text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-muted items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
