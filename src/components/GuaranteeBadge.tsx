import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type GuaranteeLevel = "green" | "yellow" | "orange";

const config: Record<GuaranteeLevel, { label: string; icon: typeof ShieldCheck; className: string; tooltip: string }> = {
  green: {
    label: "Transferência Verificada",
    icon: ShieldCheck,
    className: "bg-success/10 text-success border-success/20",
    tooltip: "Ingresso de plataforma com transferência digital nativa e rastreável. Se a transferência falhar, a Tiko Pass resolve ou reembolsa.",
  },
  yellow: {
    label: "Custódia de Arquivo",
    icon: ShieldAlert,
    className: "bg-warning/10 text-warning border-warning/20",
    tooltip: "Arquivo em custódia na Tiko Pass, entregue após pagamento. O vendedor perde acesso ao arquivo após a venda.",
  },
  orange: {
    label: "Transferência Única",
    icon: Shield,
    className: "bg-primary/10 text-primary border-primary/20",
    tooltip: "Transferência única que invalida o ingresso original. Em caso de falha técnica, a Tiko Pass intervém junto à plataforma.",
  },
};

export default function GuaranteeBadge({ level, compact = false }: { level: GuaranteeLevel; compact?: boolean }) {
  const c = config[level] || config.yellow;
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
        {c.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
