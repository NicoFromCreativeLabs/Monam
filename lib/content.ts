import en from "@/content/en.json";
import es from "@/content/es.json";

export type Lang = "en" | "es";

export interface TreatmentItem {
  name: string;
  tier: string;
  duration: string;
  price: number;
  description: string;
}

export interface PhilosophyPillar {
  icon: "organico" | "serenidad" | "balance";
  title: string;
  description: string;
}

export interface FeaturedTreatment {
  protocol: string;
  label: string;
  icon: "sunburst" | "arches" | "ring";
}

export interface Content {
  lang: string;
  announcement: string;
  nav: {
    estudio: string;
    philosophy: string;
    treatments: string;
    standard: string;
    visit: string;
    bookNow: string;
  };
  hero: {
    subtitle: string;
    eyebrow: string;
    headline: string;
    script: string;
    body: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  featured: {
    eyebrow: string;
    heading: string;
    description: string;
    items: FeaturedTreatment[];
  };
  philosophy: {
    eyebrow: string;
    heading: string;
    pillars: PhilosophyPillar[];
  };
  treatments: {
    eyebrow: string;
    heading: string;
    tagline: string;
    note: string;
    items: TreatmentItem[];
    currency: string;
    cta: string;
  };
  stripe: {
    quote: string;
    cta: string;
  };
  circle: {
    corner1: string;
    corner2: string;
    heading1: string;
    heading2: string;
    ring: string;
  };
  booking: {
    heading: string;
    body: string;
    ctaWhatsapp: string;
    ctaOnline: string;
    skinIdCard: {
      label: string;
      skinType: string;
      allergies: string;
      preferences: string;
      lastTreatment: string;
    };
  };
  social: {
    handle: string;
    cta: string;
    quotes: string[];
  };
  location: {
    heading: string;
    hours: string;
    locations: { name: string; address: string }[];
    ctaDirections: string;
    ctaVisit: string;
  };
  footer: {
    script: string;
    explore: { heading: string; links: string[] };
    connect: { heading: string; links: string[] };
    copyright: string;
  };
}

const CONTENT: Record<Lang, Content> = {
  en: en as Content,
  es: es as Content,
};

export function getContent(lang: Lang): Content {
  return CONTENT[lang];
}
