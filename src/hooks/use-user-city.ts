import { useState, useEffect } from "react";

const DEFAULT_CITY = "Salvador";

export function useUserCity() {
  const [city, setCity] = useState<string>(() => {
    try {
      return localStorage.getItem("user_city") || "";
    } catch {
      return "";
    }
  });
  const [detecting, setDetecting] = useState(!city);

  useEffect(() => {
    if (city) return;

    let cancelled = false;

    const detect = async () => {
      try {
        // Try IP-based geolocation (no permission needed)
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error("ipapi failed");
        const data = await res.json();
        const detectedCity = data.city || DEFAULT_CITY;
        if (!cancelled) {
          setCity(detectedCity);
          try { localStorage.setItem("user_city", detectedCity); } catch {}
        }
      } catch {
        if (!cancelled) {
          setCity(DEFAULT_CITY);
          try { localStorage.setItem("user_city", DEFAULT_CITY); } catch {}
        }
      } finally {
        if (!cancelled) setDetecting(false);
      }
    };

    detect();
    return () => { cancelled = true; };
  }, [city]);

  const updateCity = (newCity: string) => {
    setCity(newCity);
    try { localStorage.setItem("user_city", newCity); } catch {}
  };

  return { city, detecting, updateCity };
}
