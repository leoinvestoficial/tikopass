import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, User, Save, Loader2, MapPin, Phone, FileText, Trash2, Clock } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [city, setCity] = useState(profile?.city || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [initialized, setInitialized] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync state when profile loads — moved to useEffect to avoid setState during render
  useEffect(() => {
    if (profile && !initialized) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setCity(profile.city || "");
      setPhone(profile.phone || "");
      setAvatarPreview(profile.avatar_url || "");
      setInitialized(true);
    }
  }, [profile, initialized]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/pending-avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const pendingUrl = urlData.publicUrl + "?t=" + Date.now();

      await supabase
        .from("profiles")
        .update({
          pending_avatar_url: pendingUrl,
          avatar_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      await refreshProfile();
      toast.success("Foto enviada para aprovação! Um moderador irá analisar em breve.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          city: city.trim() || null,
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const initials = (displayName || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="flex-1">
        <div className="container max-w-2xl py-10 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Meu Perfil
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie suas informações pessoais
            </p>
          </div>

          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-border">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt={displayName || "Avatar"} />
                ) : null}
                <AvatarFallback className="text-xl font-display font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">
                {displayName || "Seu nome"}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {(profile as any)?.avatar_status === "pending" && (
                <span className="inline-flex items-center gap-1 text-xs text-warning mt-1">
                  <Clock className="w-3 h-3" /> Foto em análise
                </span>
              )}
              {(profile as any)?.avatar_status === "rejected" && (
                <span className="inline-flex items-center gap-1 text-xs text-destructive mt-1">
                  Foto recusada
                </span>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-primary hover:underline mt-1 block"
              >
                Alterar foto
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4 text-muted-foreground" />
                Nome de exibição
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como você quer ser chamado"
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Cidade
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Salvador, BA"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Telefone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(71) 99999-9999"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Sobre mim
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você..."
                maxLength={300}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
            </div>
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </Button>

          {/* Delete Account */}
          <div className="pt-8 border-t border-border">
            <h3 className="text-sm font-medium text-destructive mb-2">Zona de perigo</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                  Excluir minha conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza que deseja excluir sua conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. Todos os seus dados pessoais, ingressos e histórico serão permanentemente removidos conforme a LGPD.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) throw new Error("Sessão expirada");
                        
                        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                        const res = await fetch(
                          `https://${projectId}.supabase.co/functions/v1/delete-account`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${session.access_token}`,
                              "Content-Type": "application/json",
                            },
                          }
                        );
                        const result = await res.json();
                        if (!res.ok) throw new Error(result.error);
                        
                        await signOut();
                        toast.success("Conta excluída com sucesso.");
                        navigate("/");
                      } catch (err: any) {
                        toast.error(err.message || "Erro ao excluir conta.");
                      } finally {
                        setDeleting(false);
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleting}
                  >
                    {deleting ? "Excluindo..." : "Sim, excluir conta"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2">
              Conforme a LGPD, você tem o direito de solicitar a exclusão dos seus dados a qualquer momento.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
