import { afterEach, describe, expect, it } from "vitest";

import {
  __setLocaleForTests,
  getLocale,
  isLocaleRTL,
  t,
} from "./i18n";

afterEach(() => {
  __setLocaleForTests("en");
});

describe("i18n", () => {
  it("returns the English string by default", () => {
    expect(getLocale()).toBe("en");
    expect(t("common.continue")).toBe("Continue");
  });

  it("returns the Hebrew string when the locale is he", () => {
    __setLocaleForTests("he");
    expect(t("common.continue")).toBe("המשך");
    expect(t("today.doses")).toBe("המנות של היום");
  });

  it("falls back to English for unknown keys", () => {
    expect(t("nope.nada")).toBe("nope.nada");
  });

  it("identifies RTL locales", () => {
    expect(isLocaleRTL("he")).toBe(true);
    expect(isLocaleRTL("en")).toBe(false);
  });
});
