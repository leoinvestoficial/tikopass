import { Music, Trophy, Theater, Tent, Mic2, Building2 } from "lucide-react";

const categories = [
  { id: "Shows", label: "Shows", icon: Music, color: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-500" },
  { id: "Esportes", label: "Esportes", icon: Trophy, color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500" },
  { id: "Teatro", label: "Teatro", icon: Theater, color: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500" },
  { id: "Festivais", label: "Festivais", icon: Tent, color: "from-sky-500/20 to-sky-500/5", iconColor: "text-sky-500" },
  { id: "Stand-up", label: "Stand-up", icon: Mic2, color: "from-fuchsia-500/20 to-fuchsia-500/5", iconColor: "text-fuchsia-500" },
  { id: "Conferências", label: "Conferências", icon: Building2, color: "from-slate-500/20 to-slate-500/5", iconColor: "text-slate-500" },
];

interface CategoryGridProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryGrid({ selectedCategory, onCategoryChange }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(isActive ? "" : cat.id)}
            className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 active:scale-95 ${
              isActive
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:shadow-sm hover:border-primary/20"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
              <Icon className={`w-6 h-6 ${isActive ? "text-primary" : cat.iconColor}`} />
            </div>
            <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              {cat.label}
            </span>
            {isActive && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[8px] text-primary-foreground font-bold">✓</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
