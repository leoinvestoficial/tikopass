import { ShieldCheck, CreditCard, MessageCircle, Clock } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const features = [
  {
    icon: ShieldCheck,
    title: "Pagamento protegido",
    description: "Seu dinheiro fica seguro até a confirmação da entrega do ingresso.",
  },
  {
    icon: MessageCircle,
    title: "Chat integrado",
    description: "Negocie diretamente com o vendedor sem sair da plataforma.",
  },
  {
    icon: CreditCard,
    title: "Preço justo",
    description: "Taxa de apenas 10% sobre a venda. Sem surpresas ou taxas escondidas.",
  },
  {
    icon: Clock,
    title: "Cadastro com IA",
    description: "Nossa IA identifica eventos automaticamente, tornando a venda instantânea.",
  },
];

export default function TrustBanner() {
  const reveal = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-16 md:py-20 border-t border-border bg-card/50">
      <div
        ref={reveal.ref}
        className={`container ${reveal.isVisible ? "animate-reveal-up" : "opacity-0"}`}
      >
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Por que usar o TICKET4U?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Criado para quem quer comprar e vender ingressos com tranquilidade.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="text-center space-y-3 p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground">
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
