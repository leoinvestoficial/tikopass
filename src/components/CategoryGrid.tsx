import { Guitar, Disc3, Drum, Music, Waves, Piano, Sparkles } from "lucide-react";

export const MUSIC_CATEGORIES = [
  { id: "Sertanejo", label: "Sertanejo", icon: Guitar },
  { id: "Funk", label: "Funk", icon: Disc3 },
  { id: "Rock", label: "Rock", icon: Drum },
  { id: "Pagode", label: "Pagode", icon: Music },
  { id: "Eletrônico", label: "Eletrônico", icon: Waves },
  { id: "Forró", label: "Forró", icon: Piano },
  { id: "Outro", label: "Outro", icon: Sparkles },
];

interface CategoryGridProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  variant?: "home" | "sell";
}

export default function CategoryGrid({ selectedCategory, onCategoryChange, variant = "home" }: CategoryGridProps) {
  if (variant === "sell") {
    return (
      <div className="flex flex-wrap gap-3">
        {MUSIC_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-200 active:scale-95 ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-8 overflow-x-auto py-2 px-4">
      {MUSIC_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(isActive ? "" : cat.id)}
            className={`flex flex-col items-center gap-1.5 min-w-[64px] transition-all duration-200 group ${
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className={`w-7 h-7 transition-colors ${isActive ? "text-foreground" : "text-muted-foreground/60 group-hover:text-muted-foreground"}`} strokeWidth={1.5} />
            <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-foreground" : ""}`}>
              {cat.label}
            </span>
            {isActive && <div className="w-full h-0.5 bg-foreground rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}
