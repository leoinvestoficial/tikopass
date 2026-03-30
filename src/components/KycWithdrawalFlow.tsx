import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, ShieldCheck, Upload, CalendarDays, Zap, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import browserImageCompression from "browser-image-compression";

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave aleatória" },
];

type KycStatus = "pending" | "submitted" | "approved" | "rejected";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  kycStatus: KycStatus;
  availableBalance: number;
  existingPixKey?: string | null;
  existingPixKeyType?: string | null;
  existingDob?: string | null;
  onSuccess: () => void;
}

export default function KycWithdrawalFlow({
  open, onOpenChange, userId, kycStatus, availableBalance,
  existingPixKey, existingPixKeyType, existingDob, onSuccess,
}: Props) {
  const [step, setStep] = useState<"kyc" | "withdraw">(
    kycStatus === "approved" ? "withdraw" : "kyc"
  );
  const [dob, setDob] = useState(existingDob || "");
  const [pixKey, setPixKey] = useState(existingPixKey || "");
  const [pixKeyType, setPixKeyType] = useState(existingPixKeyType || "");
  const [uploading, setUploading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const formatPixKey = (value: string, type: string) => {
    if (type === "cpf") {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    if (type === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 13);
      if (digits.length <= 2) return `+${digits}`;
      if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
      return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return value;
  };

  const compressImage = async (file: File) => {
    return browserImageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
  };

  const handleKycSubmit = async () => {
    if (!dob) { toast.error("Informe sua data de nascimento."); return; }

    // Check age >= 18
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    if (age < 18) { toast.error("Você precisa ter 18 anos ou mais para sacar."); return; }

    if (!docFile) { toast.error("Envie uma foto do documento (RG ou CNH)."); return; }
    if (!selfieFile) { toast.error("Envie uma selfie segurando o documento."); return; }

    setUploading(true);
    try {
      const [compDoc, compSelfie] = await Promise.all([
        compressImage(docFile),
        compressImage(selfieFile),
      ]);

      const docPath = `${userId}/kyc-doc.jpg`;
      const selfiePath = `${userId}/kyc-selfie.jpg`;

      const [docUpload, selfieUpload] = await Promise.all([
        supabase.storage.from("avatars").upload(docPath, compDoc, { upsert: true }),
        supabase.storage.from("avatars").upload(selfiePath, compSelfie, { upsert: true }),
      ]);

      if (docUpload.error) throw docUpload.error;
      if (selfieUpload.error) throw selfieUpload.error;

      const { error } = await supabase.from("profiles").update({
        date_of_birth: dob,
        kyc_status: "submitted",
        kyc_submitted_at: new Date().toISOString(),
        kyc_document_path: docPath,
        kyc_selfie_path: selfiePath,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      if (error) throw error;

      toast.success("Documentos enviados! Aguarde a aprovação do moderador.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar documentos.");
    } finally {
      setUploading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!pixKey || !pixKeyType) {
      toast.error("Informe sua chave Pix para sacar.");
      return;
    }
    setWithdrawing(true);
    try {
      await supabase.from("profiles").update({
        pix_key: pixKey,
        pix_key_type: pixKeyType,
      }).eq("user_id", userId);

      const { data, error } = await supabase.functions.invoke("request-withdrawal", {
        body: { pix_key: pixKey, pix_key_type: pixKeyType, amount: availableBalance },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Saque solicitado! O Pix será enviado em instantes.");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar saque.");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        {/* KYC Status banners */}
        {kycStatus === "submitted" && (
          <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
            <Clock className="w-5 h-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Verificação em análise</p>
              <p className="text-xs text-muted-foreground">Seus documentos estão sendo analisados por um moderador. Você será notificado quando aprovado.</p>
            </div>
          </div>
        )}

        {kycStatus === "rejected" && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Verificação recusada</p>
              <p className="text-xs text-muted-foreground">Seus documentos foram recusados. Envie novamente com fotos mais claras.</p>
            </div>
          </div>
        )}

        {(kycStatus === "pending" || kycStatus === "rejected") && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> Verificação de identidade
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Para realizar saques, precisamos verificar sua identidade. Este processo é feito apenas uma vez.
            </p>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" /> Data de nascimento
                </Label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="rounded-xl h-11"
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4 text-muted-foreground" /> Documento com foto (RG ou CNH)
                </Label>
                <div
                  onClick={() => docRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {docFile ? (
                    <p className="text-sm text-primary font-medium">{docFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Clique para enviar</p>
                  )}
                </div>
                <input ref={docRef} type="file" accept="image/*" className="hidden" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4 text-muted-foreground" /> Selfie segurando o documento
                </Label>
                <div
                  onClick={() => selfieRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {selfieFile ? (
                    <p className="text-sm text-primary font-medium">{selfieFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Clique para enviar</p>
                  )}
                </div>
                <input ref={selfieRef} type="file" accept="image/*" className="hidden" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Seus documentos são armazenados com segurança e usados apenas para verificação. Conforme a LGPD, você pode solicitar exclusão a qualquer momento.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleKycSubmit} disabled={uploading} className="rounded-xl gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Enviar documentos
              </Button>
            </DialogFooter>
          </>
        )}

        {kycStatus === "submitted" && (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="rounded-xl w-full">Entendi</Button>
          </DialogFooter>
        )}

        {kycStatus === "approved" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> Sacar via Pix
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="flex items-center gap-2 p-3 bg-success/10 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <p className="text-sm text-success font-medium">Identidade verificada</p>
              </div>
              <div className="bg-success/10 rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">Valor disponível</p>
                <p className="text-2xl font-display font-bold text-success">
                  R$ {availableBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de chave Pix</Label>
                  <Select value={pixKeyType} onValueChange={setPixKeyType}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIX_KEY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Chave Pix</Label>
                  <Input
                    placeholder={
                      pixKeyType === "cpf" ? "000.000.000-00" :
                      pixKeyType === "email" ? "email@exemplo.com" :
                      pixKeyType === "phone" ? "+55 11 99999-9999" :
                      "Cole sua chave aleatória"
                    }
                    value={pixKey}
                    onChange={(e) => setPixKey(
                      pixKeyType === "cpf" || pixKeyType === "phone"
                        ? formatPixKey(e.target.value, pixKeyType)
                        : e.target.value
                    )}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>O valor será transferido instantaneamente para a chave Pix informada. Confira os dados antes de confirmar.</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
              <Button
                onClick={handleWithdraw}
                disabled={!pixKey || !pixKeyType || withdrawing || availableBalance <= 0}
                className="rounded-xl gap-2"
              >
                {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Confirmar saque
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
