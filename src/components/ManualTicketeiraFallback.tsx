import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props { ticketId: string }

export default function ManualTicketeiraFallback({ ticketId }: Props) {
  const [loading, setLoading] = useState(true);
  const [needsManual, setNeedsManual] = useState(false);
  const [options, setOptions] = useState<{ slug: string; display_name: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: ticket }, { data: configs }] = await Promise.all([
        supabase.from("tickets").select("detected_ticketeira").eq("id", ticketId).single(),
        supabase.from("ticketeira_config").select("slug, display_name").order("display_name"),
      ]);
      if (!active) return;
      setOptions(configs || []);
      setNeedsManual(!ticket?.detected_ticketeira);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [ticketId]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const cfg = options.find(o => o.slug === selected);
      const transferLevel = ["livepass", "t4f"].includes(selected) ? "amarelo"
        : selected === "ticket_maker" ? "laranja" : "verde";
      const { error } = await supabase
        .from("tickets")
        .update({
          detected_ticketeira: selected,
          source_platform: cfg?.display_name,
          transfer_level: transferLevel,
        })
        .eq("id", ticketId);
      if (error) throw error;
      setDone(true);
      toast.success("Plataforma confirmada!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !needsManual || done) return null;

  return (
    <div className="max-w-md mx-auto bg-warning/10 border border-warning/20 rounded-2xl p-5 text-left space-y-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground text-sm">Não identificamos a plataforma de origem</p>
          <p className="text-xs text-muted-foreground mt-1">Selecione manualmente para que possamos guiar você na transferência ao comprador.</p>
        </div>
      </div>
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="rounded-xl bg-background"><SelectValue placeholder="Selecione a plataforma..." /></SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.slug} value={o.slug}>{o.display_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleSave} disabled={!selected || saving} className="w-full rounded-xl gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Confirmar plataforma
      </Button>
    </div>
  );
}
