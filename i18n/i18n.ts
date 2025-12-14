"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pt from "./translations/pt.json";
import en from "./translations/en.json";

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: "pt",
        supportedLngs: ["en", "pt"],
        debug: process.env.NODE_ENV === "development",
        interpolation: {
            escapeValue: false,
        },
        resources: {
            en: { translation: en },
            pt: { translation: pt },
        },
    });

export default i18n;
