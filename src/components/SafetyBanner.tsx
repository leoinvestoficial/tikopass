import { ShieldCheck, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function SafetyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-warning/10 border-b border-warning/20">
      <div className="container py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span className="text-foreground/80">
            <strong className="font-semibold">Pagamento seguro é só no site.</strong>
            {" "}Nunca pague por fora (WhatsApp, Pix direto). Toda transação deve ser feita pela plataforma.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 text-sm font-medium"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
