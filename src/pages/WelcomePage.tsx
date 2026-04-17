import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ticket, Search, MessageSquare, Shield, Wallet, ArrowRight, Sparkles } from "lucide-react";
import TikoLogo from "@/components/TikoLogo";

const STEPS = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao Tiko Pass!",
    description:
      "Sua conta foi criada com sucesso! Verifique seu e-mail para confirmar o cadastro. Enquanto isso, veja como funciona a plataforma.",
  },
  {
    icon: Search,
    title: "Encontre ingressos",
    description:
      "Na página inicial você pode buscar eventos por cidade, categoria ou data. Encontre shows, festivais, teatro e muito mais!",
  },
  {
    icon: Ticket,
    title: "Venda com segurança",
    description:
      'Tem um ingresso sobrando? Clique em "Vender ingresso", faça upload do PDF e nossa IA valida automaticamente. Simples assim!',
  },
  {
    icon: MessageSquare,
    title: "Negocie com outros fãs",
    description:
      "Faça ofertas, contra-propostas e converse diretamente com compradores e vendedores pela plataforma.",
  },
  {
    icon: Shield,
    title: "Pagamento protegido",
    description:
      "O pagamento fica retido até o comprador confirmar o recebimento do ingresso. Segurança para os dois lados!",
  },
  {
    icon: Wallet,
    title: "Sua carteira digital",
    description:
      "Todo o dinheiro das suas vendas vai para a carteira Tiko. De lá você pode sacar quando quiser.",
  },
];

export default function WelcomePage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, hsl(16 85% 45% / 0.7) 0%, hsl(var(--background)) 40%, hsl(var(--background)) 70%, hsl(16 85% 40% / 0.3) 100%)",
      }}
    >
      {/* Ambient glow */}
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-primary/15 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-lg space-y-8 relative z-10">
        {/* Logo */}
        <div className="flex justify-center">
          <TikoLogo className="h-16" />
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "bg-primary w-8"
                  : i < step
                  ? "bg-primary/40"
                  : "bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 text-center space-y-5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300" key={step}>
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">
            {current.title}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground"
          >
            Pular tutorial
          </Button>
          <Button
            onClick={() => {
              if (isLast) {
                navigate("/");
              } else {
                setStep(step + 1);
              }
            }}
            className="gap-2 rounded-xl px-6"
          >
            {isLast ? "Começar a usar" : "Próximo"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}