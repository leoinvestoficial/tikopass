import { useState, useEffect } from "react";

const CACHE_KEY = "user_city";
const CACHE_TS_KEY = "user_city_ts";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function useUserCity() {
  const [city, setCity] = useState<string>(() => {
    try {
      const ts = localStorage.getItem(CACHE_TS_KEY);
      if (ts && Date.now() - Number(ts) < CACHE_TTL) {
        return localStorage.getItem(CACHE_KEY) || "";
      }
      // Cache expired, clear it
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TS_KEY);
      return "";
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
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error("ipapi failed");
        const data = await res.json();
        const detectedCity = data.city || "";
        if (!cancelled && detectedCity) {
          setCity(detectedCity);
          try {
            localStorage.setItem(CACHE_KEY, detectedCity);
            localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
          } catch {}
        }
      } catch {
        // Don't default to any city - leave empty
        if (!cancelled) setCity("");
      } finally {
        if (!cancelled) setDetecting(false);
      }
    };

    detect();
    return () => { cancelled = true; };
  }, [city]);

  const updateCity = (newCity: string) => {
    setCity(newCity);
    try {
      localStorage.setItem(CACHE_KEY, newCity);
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
    } catch {}
  };

  return { city, detecting, updateCity };
}
