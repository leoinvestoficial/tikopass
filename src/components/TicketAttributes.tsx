import { useState } from "react";

export type AccessType =
  | "passaporte"
  | "dia_unico"
  | "vip"
  | "camarote"
  | "open_bar"
  | "pista"
  | "meia_entrada"
  | "outro";

export const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  passaporte: "Passaporte",
  dia_unico: "Dia único",
  vip: "VIP",
  camarote: "Camarote",
  open_bar: "Open Bar",
  pista: "Pista",
  meia_entrada: "Meia-entrada",
  outro: "Outro",
};

export interface TicketAttributesProps {
  accessType?: string | null;
  eventDays?: string[] | null;
  includesOpenBar?: boolean | null;
  isHalfPrice?: boolean | null;
  extraTags?: string[] | null;
  sellerDescription?: string | null;
  size?: "sm" | "md";
  showDescription?: boolean;
  maxTags?: number; // limit pills shown (used in cards)
}

const pill = "inline-flex items-center rounded-full font-semibold whitespace-nowrap";

export default function TicketAttributes({
  accessType,
  eventDays,
  includesOpenBar,
  isHalfPrice,
  extraTags,
  sellerDescription,
  size = "md",
  showDescription = false,
  maxTags,
}: TicketAttributesProps) {
  const [expanded, setExpanded] = useState(false);

  const pillSize = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  const pills: { key: string; label: string; cls: string }[] = [];

  if (accessType && accessType in ACCESS_TYPE_LABELS) {
    let label = ACCESS_TYPE_LABELS[accessType as AccessType];
    if (accessType === "dia_unico" && eventDays && eventDays.length === 1) {
      label = `Dia único · ${eventDays[0]}`;
    }
    pills.push({
      key: "access",
      label,
      cls: "bg-primary text-primary-foreground",
    });
  }

  if (includesOpenBar) {
    pills.push({
      key: "openbar",
      label: "Open bar incluso",
      cls: "bg-success text-success-foreground",
    });
  }

  if (isHalfPrice) {
    pills.push({
      key: "half",
      label: "Meia-entrada",
      cls: "bg-blue-600 text-white",
    });
  }

  if (accessType === "passaporte" && eventDays && eventDays.length > 0) {
    eventDays.forEach((d, i) => {
      pills.push({
        key: `day-${i}`,
        label: d,
        cls: "bg-muted text-foreground",
      });
    });
  }

  if (extraTags && extraTags.length > 0) {
    extraTags.forEach((t, i) => {
      pills.push({
        key: `tag-${i}`,
        label: t,
        cls: "bg-muted text-muted-foreground",
      });
    });
  }

  const visiblePills = typeof maxTags === "number" ? pills.slice(0, maxTags) : pills;
  const hasContent =
    visiblePills.length > 0 || (showDescription && sellerDescription && sellerDescription.trim().length > 0);

  if (!hasContent) return null;

  const desc = (sellerDescription || "").trim();
  const isLong = desc.length > 200;
  const shownDesc = expanded || !isLong ? desc : desc.slice(0, 200) + "…";

  return (
    <div className={size === "sm" ? "space-y-1.5" : "space-y-4"}>
      {visiblePills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visiblePills.map((p) => (
            <span key={p.key} className={`${pill} ${pillSize} ${p.cls}`}>
              {p.label}
            </span>
          ))}
        </div>
      )}

      {showDescription && desc && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            Descrição do vendedor
          </p>
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{shownDesc}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
