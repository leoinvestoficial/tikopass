import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowRight, CreditCard, MapPin, ChevronDown, ChevronUp, Shield, Sparkles, Ticket } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import tikoLogo from "@/assets/tiko-logo.png";

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
}

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [showAddress, setShowAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate("/");
    return null;
  }

  const lookupCep = async (cepValue: string) => {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
      }
    } catch {} finally { setLoadingCep(false); }
  };

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
        const cpfDigits = cpf.replace(/\D/g, "");
        if (!validateCpf(cpfDigits)) { toast.error("CPF inválido"); setLoading(false); return; }
        const { error } = await signUp(email, password, name, cpfDigits, {
          phone,
          address_cep: cep.replace(/\D/g, ""),
          address_street: street,
          address_number: addressNumber,
          address_neighborhood: neighborhood,
          address_city: city,
          address_state: state,
        });
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
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel: dark with logo + text ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-foreground">
        <div className="flex flex-col justify-end p-12 w-full">
          <div className="space-y-6">
            <Link to="/">
              <img src={tikoLogo} alt="Tiko Pass" <img src={tikoLogo} alt="Tiko Pass" className="h-24 object-contain brightness-0 invert" /> />
            </Link>
            <h2 className="text-2xl font-display font-bold text-background leading-tight">
              O marketplace de ingressos<br />feito para fãs de verdade
            </h2>
            <p className="text-background/50 text-sm leading-relaxed max-w-sm">
              Compre e venda ingressos para os melhores shows e festivais do Brasil com segurança e praticidade.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-2">
            <Link to="/">
              <img src={tikoLogo} alt="Tiko Pass" className="h-11 object-contain" />
            </Link>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-bold text-foreground">
              {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Entre para acessar suas negociações" : "Preencha os dados para comprar e vender com segurança"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">Nome completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="name" placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 rounded-xl h-11" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cpf" className="text-sm font-medium">CPF *</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      className="pl-10 rounded-xl h-11"
                      maxLength={14}
                    />
                  </div>
                  <p className="text-[11px] text-primary/80 bg-primary/5 px-3 py-1.5 rounded-lg">
                    ⚠️ Seu CPF deve ser o mesmo presente nos ingressos que vender
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+55</span>
                    <Input
                      id="phone"
                      placeholder="(71) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-12 rounded-xl h-11"
                      maxLength={15}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddress(!showAddress)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-sm"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    Endereço {!showAddress && <span className="text-xs">(recomendado)</span>}
                  </span>
                  {showAddress ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {showAddress && (
                  <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                      <Label htmlFor="cep" className="text-xs font-medium">CEP</Label>
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => {
                          const v = formatCep(e.target.value);
                          setCep(v);
                          if (v.replace(/\D/g, "").length === 8) lookupCep(v);
                        }}
                        className="rounded-xl h-10 text-sm"
                        maxLength={9}
                      />
                      {loadingCep && <p className="text-xs text-primary">Buscando endereço...</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium">Rua</Label>
                        <Input value={street} onChange={(e) => setStreet(e.target.value)} className="rounded-xl h-10 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Nº</Label>
                        <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className="rounded-xl h-10 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Bairro</Label>
                      <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="rounded-xl h-10 text-sm" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-medium">Cidade</Label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl h-10 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">UF</Label>
                        <select
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          <option value="">--</option>
                          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 rounded-xl h-11" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 rounded-xl h-11" required minLength={6} />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl gap-2 text-base font-semibold" size="lg" disabled={loading}>
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
