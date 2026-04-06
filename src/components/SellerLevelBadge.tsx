import { Badge } from "@/components/ui/badge";
import { Trophy, Star, ShieldCheck, UserCheck, UserPlus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SellerLevel = "new" | "beginner" | "trusted" | "verified" | "top";

export function getSellerLevel(salesCount: number, avgRating: number | null): SellerLevel {
  if (salesCount >= 50 && (avgRating || 0) >= 4.7) return "top";
  if (salesCount >= 20 && (avgRating || 0) >= 4.5) return "verified";
  if (salesCount >= 5 && (avgRating || 0) >= 4.2) return "trusted";
  if (salesCount >= 1 && (avgRating || 0) >= 4.0) return "beginner";
  return "new";
}

const levelConfig: Record<SellerLevel, { label: string; icon: typeof Trophy; className: string; description: string }> = {
  new: {
    label: "Novo",
    icon: UserPlus,
    className: "bg-muted text-muted-foreground border-muted",
    description: "Vendedor novo — ainda sem vendas concluídas",
  },
  beginner: {
    label: "Iniciante",
    icon: UserCheck,
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    description: "1-4 vendas com avaliação ≥ 4.0",
  },
  trusted: {
    label: "Confiável",
    icon: ShieldCheck,
    className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    description: "5-19 vendas com avaliação ≥ 4.2 — destaque na listagem",
  },
  verified: {
    label: "Verificado",
    icon: Star,
    className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    description: "20-49 vendas com avaliação ≥ 4.5 — prioridade no algoritmo",
  },
  top: {
    label: "Top Seller",
    icon: Trophy,
    className: "bg-primary/10 text-primary border-primary/20",
    description: "50+ vendas com avaliação ≥ 4.7 — destaque máximo",
  },
};

export default function SellerLevelBadge({ level, compact = false }: { level: SellerLevel; compact?: boolean }) {
  const c = levelConfig[level];
  const Icon = c.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`gap-1 text-[10px] cursor-help ${c.className}`}>
          <Icon className="w-3 h-3" />
          {!compact && c.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        {c.description}
      </TooltipContent>
    </Tooltip>
  );
}
