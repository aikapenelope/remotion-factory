/**
 * Brand configuration for each product.
 * Used by all templates to maintain visual consistency.
 */

export const BRANDS = {
  docflow: {
    name: "Docflow",
    tagline: "Tu clinica, sin papel",
    accent: "#e94560",
    secondary: "#0ea5e9",
    logo: "🏥",
  },
  whabi: {
    name: "Whabi",
    tagline: "WhatsApp Business CRM",
    accent: "#25D366",
    secondary: "#128C7E",
    logo: "💬",
  },
  aurora: {
    name: "Aurora",
    tagline: "Voice-first para negocios",
    accent: "#8B5CF6",
    secondary: "#EC4899",
    logo: "🎙️",
  },
} as const;

export type BrandKey = keyof typeof BRANDS;

/** Shared design tokens across all templates. */
export const DESIGN = {
  bg: "#0A0A0F",
  bgCard: "#141420",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.5)",
  fontHeading: "Inter",
  fontBody: "Inter",
  fps: 30,
  width: 1080,
  height: 1920,
  safePadding: {
    top: 1920 * 0.12,
    bottom: 1920 * 0.15,
    sides: 1080 * 0.06,
  },
} as const;
