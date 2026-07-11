import { useState, useEffect } from "react";

const EVENT_NAME = "languageChange";

export type Language = "en" | "mr" | "hi";

export function useLanguage() {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("app_lang") as Language;
      if (stored && stored !== "en") {
        setLang(stored);
      }
    }
  }, []);

  useEffect(() => {
    const handleLangChange = (e: any) => setLang(e.detail);
    window.addEventListener(EVENT_NAME, handleLangChange);
    return () => window.removeEventListener(EVENT_NAME, handleLangChange);
  }, []);

  const changeLanguage = (newLang: Language) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("app_lang", newLang);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newLang }));
    }
  };

  return { lang, setLang: changeLanguage };
}
