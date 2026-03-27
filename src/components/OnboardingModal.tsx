import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Ticket, MessageSquare, Shield, Wallet, ArrowRight, PartyPopper,
  Music, MapPin, Camera, ChevronRight, Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import tikoLogo from "@/assets/tiko-logo.png";

const TUTORIAL_STEPS = [
  {
    icon: PartyPopper,
    title: "Bem-vindo ao Tiko Pass! 🎉",
    description: "Sua conta foi criada com sucesso! Veja como funciona a plataforma em alguns passos.",
  },
  {
    icon: Search,
    title: "Encontre ingressos",
    description: "Busque eventos por cidade, categoria ou data. Shows, festivais, teatro e muito mais!",
  },
  {
    icon: Ticket,
    title: "Venda com segurança",
    description: "Faça upload do PDF do ingresso e nossa IA valida automaticamente. Simples assim!",
  },
  {
    icon: MessageSquare,
    title: "Negocie com outros fãs",
    description: "Faça ofertas, contra-propostas e converse diretamente pela plataforma.",
  },
  {
    icon: Shield,
    title: "Pagamento protegido",
    description: "O pagamento fica retido até o comprador confirmar o recebimento. Segurança para os dois lados!",
  },
  {
    icon: Wallet,
    title: "Sua carteira digital",
    description: "O dinheiro das vendas vai para a carteira Tiko. Saque quando quiser.",
  },
];

const MUSIC_GENRES = [
  "Sertanejo", "Rock & Pop", "Pagode & Samba", "Eletrônica", "MPB & Axé", "Funk & Rap", "Forró", "Gospel",
];

type OnboardingPhase = "tutorial" | "personalization";

export default function OnboardingModal() {
  const { user, profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<OnboardingPhase>("tutorial");
  const [tutorialStep, setTutorialStep] = useState(0);
  const [personStep, setPersonStep] = useState(0);

  // Personalization state
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [userCity, setUserCity] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (JPG, PNG, WEBP)");
      return;
    }
    setCompressing(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      setAvatarFile(compressed);
      setAvatarPreview(URL.createObjectURL(compressed));
    } catch {
      toast.error("Erro ao processar a imagem. Tente outra.");
    } finally {
      setCompressing(false);
    }
  };

  useEffect(() => {
    if (user && profile) {
      const seen = localStorage.getItem(`onboarding_done_${user.id}`);
      if (!seen) {
        setOpen(true);
      }
    }
  }, [user, profile]);

  const finishOnboarding = () => {
    if (user) localStorage.setItem(`onboarding_done_${user.id}`, "true");
    setOpen(false);
  };

  const handleTutorialNext = () => {
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setPhase("personalization");
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (userCity) updates.city = userCity;
      if (bio) updates.bio = bio;

      // Upload avatar if selected
      if (avatarFile) {
        const filePath = `${user.id}/avatar.jpg`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
          upsert: true,
          contentType: "image/jpeg",
        });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          updates.avatar_url = urlData.publicUrl;
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("user_id", user.id);
      }

      // Store genres in localStorage for now (could be a table later)
      if (selectedGenres.length > 0) {
        localStorage.setItem(`user_genres_${user.id}`, JSON.stringify(selectedGenres));
      }

      await refreshProfile();
      toast.success("Perfil personalizado com sucesso!");
      finishOnboarding();
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const current = TUTORIAL_STEPS[tutorialStep];
  const Icon = current.icon;

  const PERSON_STEPS = [
    {
      title: "Quais gêneros você curte?",
      subtitle: "Selecione seus gêneros favoritos para recomendações melhores",
      content: (
        <div className="grid grid-cols-2 gap-2">
          {MUSIC_GENRES.map((genre) => {
            const selected = selectedGenres.includes(genre);
            return (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:border-primary/50"
                }`}
              >
                <Music className="w-4 h-4 shrink-0" />
                {genre}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Onde você mora?",
      subtitle: "Para mostrar eventos perto de você",
      content: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Sua cidade</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ex: São Paulo, Salvador, Rio de Janeiro..."
                value={userCity}
                onChange={(e) => setUserCity(e.target.value)}
                className="pl-10 rounded-xl h-11"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Conte sobre você",
      subtitle: "Compradores veem seu perfil antes de negociar",
      content: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Bio (opcional)</Label>
            <Textarea
              placeholder="Ex: Fã de sertanejo, sempre vou a shows em Salvador. Vendo ingressos que não consigo ir..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="rounded-xl resize-none min-h-[100px]"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
          </div>
        </div>
      ),
    },
  ];

  const currentPerson = PERSON_STEPS[personStep];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finishOnboarding(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border">
        {phase === "tutorial" ? (
          <div className="p-6 space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <img src={tikoLogo} alt="Tiko Pass" className="h-12 object-contain" />
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5">
              {TUTORIAL_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === tutorialStep
                      ? "bg-primary w-6"
                      : i < tutorialStep
                      ? "bg-primary/40 w-1.5"
                      : "bg-muted w-1.5"
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="text-center space-y-4" key={tutorialStep}>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-display font-bold text-foreground">
                {current.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {current.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={finishOnboarding} className="text-muted-foreground">
                Pular
              </Button>
              <Button onClick={handleTutorialNext} className="gap-2 rounded-xl px-5">
                {tutorialStep === TUTORIAL_STEPS.length - 1 ? "Personalizar perfil" : "Próximo"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2">
              {PERSON_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full transition-all ${
                    i <= personStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-display font-bold text-foreground">
                {currentPerson.title}
              </h2>
              <p className="text-sm text-muted-foreground">{currentPerson.subtitle}</p>
            </div>

            {currentPerson.content}

            <div className="flex items-center justify-between gap-3">
              {personStep > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setPersonStep(personStep - 1)}>
                  Voltar
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={finishOnboarding} className="text-muted-foreground">
                  Pular
                </Button>
              )}
              {personStep < PERSON_STEPS.length - 1 ? (
                <Button onClick={() => setPersonStep(personStep + 1)} className="gap-2 rounded-xl px-5">
                  Próximo <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 rounded-xl px-5">
                  {saving ? "Salvando..." : "Concluir"} <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
