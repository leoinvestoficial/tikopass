import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import tikoLogo from "@/assets/tiko-logo.png";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-3 max-w-xs">
            <Link to="/" className="flex items-center">
              <img src={tikoLogo} alt="Tiko Pass" className="h-9 object-contain" />
            </Link>
            <p className="text-sm text-muted-foreground">
              O marketplace de revenda de ingressos para shows e festivais mais seguro do Brasil.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              Pagamento seguro é só no site
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-foreground">Plataforma</h4>
              <div className="space-y-2 text-muted-foreground">
                <Link to="/" className="block hover:text-foreground transition-colors">Comprar</Link>
                <Link to="/sell" className="block hover:text-foreground transition-colors">Vender</Link>
                <Link to="/negotiations" className="block hover:text-foreground transition-colors">Negociações</Link>
                <Link to="/my-tickets" className="block hover:text-foreground transition-colors">Meus Ingressos</Link>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-foreground">Gêneros</h4>
              <div className="space-y-2 text-muted-foreground">
                <span className="block">Sertanejo</span>
                <span className="block">Rock & Pop</span>
                <span className="block">Pagode & Samba</span>
                <span className="block">Eletrônica</span>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-foreground">Suporte</h4>
              <div className="space-y-2 text-muted-foreground">
                <span className="block">Central de Ajuda</span>
                <span className="block">Termos de Uso</span>
                <span className="block">Privacidade</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© 2025 Tiko. Todos os direitos reservados.</span>
            <span className="text-center">
              Você está comprando ingressos de terceiros. Os preços são definidos pelos vendedores e podem estar abaixo ou acima do valor nominal.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
