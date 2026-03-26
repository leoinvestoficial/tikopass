import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, User, MessageSquare, LogOut, ShoppingBag, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import tikoLogo from "@/assets/tiko-logo.png";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: "/", label: "Início" },
    { to: "/sell", label: "Vender" },
    { to: "/my-tickets", label: "Meus Ingressos" },
    { to: "/negotiations", label: "Negociações" },
  ];

  const initials = (profile?.display_name || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center group">
          <img src={tikoLogo} alt="Tiko Pass" <img src={tikoLogo} alt="Tiko Pass" className="h-20 object-contain transition-transform duration-200 group-hover:scale-105 group-active:scale-95" /> />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                isActive(link.to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border p-1 pr-3 hover:shadow-md transition-shadow cursor-pointer">
                  <Avatar className="w-8 h-8">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.display_name || "Avatar"} />
                    ) : null}
                    <AvatarFallback className="text-xs font-display font-bold bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <Menu className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{profile?.display_name || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" /> Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-tickets" className="flex items-center gap-2 cursor-pointer">
                    <ShoppingBag className="w-4 h-4" /> Meus Ingressos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/negotiations" className="flex items-center gap-2 cursor-pointer">
                    <MessageSquare className="w-4 h-4" /> Negociações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/wallet" className="flex items-center gap-2 cursor-pointer">
                    <Wallet className="w-4 h-4" /> Carteira
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                Entrar
              </Button>
            </Link>
          )}
        </div>

        <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-2 animate-reveal-up">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive(link.to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/profile" onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted">
                Meu Perfil
              </Link>
              <Button variant="outline" className="w-full mt-2 gap-2" onClick={() => { signOut(); setMobileOpen(false); }}>
                <LogOut className="w-4 h-4" /> Sair
              </Button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full mt-2 gap-2"><User className="w-4 h-4" /> Entrar</Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
