type SubmissionLock = {
  current: boolean;
};

const DEFAULT_RELEASE_MS = 800;

export function tryAcquireSubmissionLock(
  lock: SubmissionLock,
  releaseAfterMs = DEFAULT_RELEASE_MS,
) {
  if (lock.current) return false;

  lock.current = true;
  setTimeout(() => {
    lock.current = false;
  }, Math.max(0, releaseAfterMs));
  return true;
}
