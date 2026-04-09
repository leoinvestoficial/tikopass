import { Link, useLocation } from "react-router-dom";
import { Home, Tag, MessageSquare, Wallet, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: Home },
  { to: "/negotiations", label: "Negociações", icon: MessageSquare, auth: true },
  { to: "/sell", label: "Vender", icon: Plus, primary: true },
  { to: "/wallet", label: "Carteira", icon: Wallet, auth: true },
  { to: "/my-tickets", label: "Ingressos", icon: Tag, auth: true },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  // Hide on auth and welcome pages
  if (["/auth", "/welcome", "/admin"].includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map((item) => {
          if (item.auth && !user) return null;
          const isActive = location.pathname === item.to;
          const Icon = item.icon;

          if (item.primary) {
            return (
              <Link
                key={item.to}
                to={user ? item.to : "/auth"}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-medium text-primary mt-0.5">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
