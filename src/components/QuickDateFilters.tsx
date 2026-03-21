import { Calendar, Clock, CalendarDays, CalendarRange } from "lucide-react";

type DateFilter = "" | "today" | "tomorrow" | "weekend";

interface QuickDateFiltersProps {
  selected: DateFilter;
  onChange: (filter: DateFilter) => void;
}

const filters = [
  { key: "today" as DateFilter, label: "Hoje", icon: Clock },
  { key: "tomorrow" as DateFilter, label: "Amanhã", icon: Calendar },
  { key: "weekend" as DateFilter, label: "Este fim de semana", icon: CalendarDays },
  { key: "" as DateFilter, label: "Conferir tudo", icon: CalendarRange },
];

export function getDateRange(filter: DateFilter): { from?: string; to?: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (filter) {
    case "today":
      return { from: today, to: today };
    case "tomorrow": {
      const tmrw = new Date(now);
      tmrw.setDate(tmrw.getDate() + 1);
      const tmrwStr = tmrw.toISOString().split("T")[0];
      return { from: tmrwStr, to: tmrwStr };
    }
    case "weekend": {
      const day = now.getDay();
      const daysToFri = day <= 5 ? 5 - day : 6;
      const fri = new Date(now);
      fri.setDate(fri.getDate() + daysToFri);
      const sun = new Date(fri);
      sun.setDate(sun.getDate() + 2);
      return {
        from: fri.toISOString().split("T")[0],
        to: sun.toISOString().split("T")[0],
      };
    }
    default:
      return {};
  }
}

export default function QuickDateFilters({ selected, onChange }: QuickDateFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {filters.map((f) => {
        const Icon = f.icon;
        const isActive = selected === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95 shrink-0 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
            }`}
          >
            <Icon className="w-4 h-4" />
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
