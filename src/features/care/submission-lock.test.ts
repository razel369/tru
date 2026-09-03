import { afterEach, describe, expect, it, vi } from "vitest";

import { tryAcquireSubmissionLock } from "./submission-lock";

afterEach(() => {
  vi.useRealTimers();
});

describe("submission lock", () => {
  it("rejects duplicate submissions inside the touch window", () => {
    vi.useFakeTimers();
    const lock = { current: false };

    expect(tryAcquireSubmissionLock(lock)).toBe(true);
    expect(tryAcquireSubmissionLock(lock)).toBe(false);
    expect(lock.current).toBe(true);
  });

  it("releases automatically for the next intentional save", () => {
    vi.useFakeTimers();
    const lock = { current: false };

    expect(tryAcquireSubmissionLock(lock, 500)).toBe(true);
    vi.advanceTimersByTime(499);
    expect(tryAcquireSubmissionLock(lock)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(tryAcquireSubmissionLock(lock)).toBe(true);
  });
});
