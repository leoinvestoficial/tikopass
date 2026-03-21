import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const sessionId = params.get("session_id");
    const negotiationId = params.get("negotiation_id");
    if (sessionId && negotiationId) {
      verifyPayment(sessionId, negotiationId);
    } else {
      setStatus("error");
    }
  }, []);

  const verifyPayment = async (sessionId: string, negotiationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { session_id: sessionId, negotiation_id: negotiationId },
      });
      if (error) throw error;
      setStatus(data?.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md animate-reveal-scale">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
              <h1 className="text-2xl font-display font-bold">Verificando pagamento...</h1>
              <p className="text-muted-foreground">Aguarde enquanto confirmamos sua transação.</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h1 className="text-2xl font-display font-bold">Pagamento confirmado!</h1>
              <p className="text-muted-foreground">
                Sua compra foi processada com sucesso. O vendedor será notificado e você pode combinar a entrega pelo chat de negociação.
              </p>
              <div className="flex gap-3 justify-center">
                <Link to="/negotiations">
                  <Button className="rounded-xl">Ver negociações</Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" className="rounded-xl">Voltar à home</Button>
                </Link>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-display font-bold">Erro no pagamento</h1>
              <p className="text-muted-foreground">Não foi possível confirmar o pagamento. Tente novamente.</p>
              <Link to="/negotiations">
                <Button className="rounded-xl">Voltar às negociações</Button>
              </Link>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
