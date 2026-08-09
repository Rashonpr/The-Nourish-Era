/**
 * Single source of truth for product branding.
 * Swap these values (and the CSS tokens in `src/app/globals.css`) to
 * re-skin the app without touching feature code. Nothing outside this
 * file and globals.css should hardcode the product name, tagline, or
 * color values.
 */
export const branding = {
  appName: "TheNourishEra",
  shortName: "NourishEra",
  tagline: "Personalized nutrition plans, backed by verified data.",
  description:
    "TheNourishEra helps registered dietitians and nutrition professionals build, review, and deliver personalized nutrition plans for their patients.",
  logoInitials: "NE",
  supportEmail: "support@thenourishera.com",
  companyName: "TheNourishEra",
  legal: {
    disclaimer:
      "AI-generated nutrition recommendations are intended to assist qualified professionals. All plans should be reviewed and approved by the practitioner before being provided to a patient.",
    clinicalDisclaimer:
      "Clinical nutrition recommendations should be individualized by a qualified healthcare professional.",
    footer:
      "This document was prepared by your dietitian using TheNourishEra and is intended for general nutrition guidance, not as a substitute for individualized medical advice.",
  },
} as const;

export type Branding = typeof branding;
