// Hard limits for one consented review, shared by proposal and confirmation.
// Fast overload responses can earn limited additional attempts; quota errors,
// invalid successful outputs, timeouts and other statuses never earn them.
const limits = Object.freeze({
  deadlineMs: 14000,
  maxAttempts: 8,
  maxStandardAttempts: 4,
  maxFast503Credits: 4,
  fast503ThresholdMs: 1000,
});

export function providerReviewLimits() {
  return limits;
}
