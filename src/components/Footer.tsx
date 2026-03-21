import { Link } from "react-router-dom";
import { Ticket } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Ticket className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">
                TICKET<span className="text-primary">4U</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              O marketplace de revenda de ingressos mais seguro e prático do Brasil.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-foreground">Plataforma</h4>
              <div className="space-y-2 text-muted-foreground">
                <Link to="/" className="block hover:text-foreground transition-colors">Comprar</Link>
                <Link to="/sell" className="block hover:text-foreground transition-colors">Vender</Link>
                <Link to="/negotiations" className="block hover:text-foreground transition-colors">Negociações</Link>
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

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2025 TICKET4U. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
