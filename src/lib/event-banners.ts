import sertanejo from "@/assets/banners/sertanejo.jpg";
import rock from "@/assets/banners/rock.jpg";
import pagode from "@/assets/banners/pagode.jpg";
import eletronico from "@/assets/banners/eletronico.jpg";
import funk from "@/assets/banners/funk.jpg";
import forro from "@/assets/banners/forro.jpg";
import outro from "@/assets/banners/outro.jpg";

export const CATEGORY_BANNERS: Record<string, string> = {
  Sertanejo: sertanejo,
  Rock: rock,
  Pagode: pagode,
  "Eletrônico": eletronico,
  Funk: funk,
  "Forró": forro,
  Outro: outro,
};

export const ALL_BANNERS = [
  { id: "sertanejo", label: "Sertanejo", src: sertanejo },
  { id: "rock", label: "Rock", src: rock },
  { id: "pagode", label: "Pagode", src: pagode },
  { id: "eletronico", label: "Eletrônico", src: eletronico },
  { id: "funk", label: "Funk", src: funk },
  { id: "forro", label: "Forró", src: forro },
  { id: "outro", label: "Festival", src: outro },
];

export function getBannerForCategory(category: string): string {
  return CATEGORY_BANNERS[category] || outro;
}
