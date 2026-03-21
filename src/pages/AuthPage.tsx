import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const reveal = useScrollReveal<HTMLDivElement>();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left: branding */}
      <div className="hidden lg:flex lg:flex-1 surface-dark items-center justify-center p-12">
        <div className="max-w-md space-y-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Ticket className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-2xl text-[hsl(var(--surface-dark-foreground))]">
              TICKET<span className="text-primary">4U</span>
            </span>
          </Link>
          <h2 className="text-3xl font-display font-bold text-[hsl(var(--surface-dark-foreground))] leading-tight">
            O marketplace de ingressos feito para fãs de verdade
          </h2>
          <p className="text-[hsl(var(--surface-dark-foreground))]/70 leading-relaxed">
            Compre e venda ingressos para os melhores eventos do Brasil com segurança e praticidade.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          ref={reveal.ref}
          className={`w-full max-w-sm space-y-8 ${reveal.isVisible ? "animate-reveal-scale" : "opacity-0"}`}
        >
          <div className="lg:hidden flex items-center gap-2 justify-center mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">
              TICKET<span className="text-primary">4U</span>
            </span>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-display font-bold">
              {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Entre para acessar suas negociações"
                : "Cadastre-se para comprar e vender ingressos"}
            </p>
          </div>

          <div className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="name" placeholder="Seu nome completo" className="pl-10 rounded-xl h-11" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" className="pl-10 rounded-xl h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10 rounded-xl h-11" />
              </div>
            </div>

            <Button className="w-full h-11 rounded-xl gap-2" size="lg">
              {isLogin ? "Entrar" : "Criar conta"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem conta? " : "Já tem conta? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline underline-offset-4"
            >
              {isLogin ? "Cadastre-se" : "Fazer login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
