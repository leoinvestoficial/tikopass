import { Link } from "react-router-dom";
import { Ticket, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-3 max-w-xs">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Ticket className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">
                TICKET<span className="text-primary">4U</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              O marketplace de revenda de ingressos mais seguro e prático do Brasil. Compre e venda com pagamento protegido.
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
              <h4 className="font-display font-semibold text-foreground">Categorias</h4>
              <div className="space-y-2 text-muted-foreground">
                <span className="block">Shows</span>
                <span className="block">Festivais</span>
                <span className="block">Esportes</span>
                <span className="block">Teatro</span>
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
            <span>© 2025 TICKET4U. Todos os direitos reservados.</span>
            <span className="text-center">
              Você está comprando ingressos de terceiros. Os preços são definidos pelos vendedores e podem estar abaixo ou acima do valor nominal.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
