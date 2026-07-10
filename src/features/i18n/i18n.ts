/**
 * PawPair — i18n.
 *
 * docs/AAA-HANDOFF.md §10: "Start with English but make layout
 * safe for German, French, Spanish, Portuguese, Japanese, and
 * right-to-left languages."
 *
 * Stage 10 ships the scaffolding: a translation table indexed
 * by locale, a useTranslation() hook that reads the current
 * locale, and an English + Hebrew starter set so we can prove
 * the plumbing works. The full Hebrew translation and the RTL
 * pass land in stage 10-final.
 */

export type Locale = "en" | "he";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "today.doses": "Today's doses",
    "today.carePlan": "Care plan",
    "today.empty": "All done for today.",
    "today.markGiven": "Mark as given",
    "today.skip": "Skip",
    "pets.title": "Pets",
    "insights.title": "Insights",
    "notifications.title": "Notifications",
    "settings.title": "Settings",
    "common.continue": "Continue",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.add": "Add",
    "common.loading": "Loading…",
  },
  he: {
    "today.doses": "המנות של היום",
    "today.carePlan": "תכנית טיפול",
    "today.empty": "סיימת הכל להיום.",
    "today.markGiven": "סמן כניתן",
    "today.skip": "דלג",
    "pets.title": "חיות מחמד",
    "insights.title": "תובנות",
    "notifications.title": "התראות",
    "settings.title": "הגדרות",
    "common.continue": "המשך",
    "common.cancel": "ביטול",
    "common.save": "שמור",
    "common.add": "הוסף",
    "common.loading": "טוען…",
  },
};

let current: Locale = "en";

export function __setLocaleForTests(next: Locale): void {
  current = next;
}

export function setLocale(next: Locale): void {
  current = next;
}

export function getLocale(): Locale {
  return current;
}

export function t(key: string): string {
  return translations[current][key] ?? translations.en[key] ?? key;
}

export function useTranslation() {
  return {
    locale: current,
    t,
  };
}

export const SUPPORTED_LOCALES: Locale[] = ["en", "he"];

export const RTL_LOCALES: Locale[] = ["he"];

export function isLocaleRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}
