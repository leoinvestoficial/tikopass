import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const reveal = useScrollReveal<HTMLDivElement>();
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else {
        if (!name.trim()) { toast.error("Informe seu nome"); setLoading(false); return; }
        const { error } = await signUp(email, password, name);
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
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
              {isLogin ? "Entre para acessar suas negociações" : "Cadastre-se para comprar e vender ingressos"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="name" placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 rounded-xl h-11" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 rounded-xl h-11" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 rounded-xl h-11" required minLength={6} />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl gap-2" size="lg" disabled={loading}>
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem conta? " : "Já tem conta? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline underline-offset-4">
              {isLogin ? "Cadastre-se" : "Fazer login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
