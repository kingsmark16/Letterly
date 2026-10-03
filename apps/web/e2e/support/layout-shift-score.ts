export interface ObservedShift {
  time: number;
  value: number;
}

export function layoutShiftScore(shifts: readonly ObservedShift[]): number {
  let largestSession = 0;
  let sessionValue = 0;
  let sessionStart: number | undefined;
  let previousShift = 0;
  for (const shift of shifts) {
    if (
      sessionStart === undefined ||
      sessionValue === 0 ||
      shift.time - previousShift >= 1_000 ||
      shift.time - sessionStart >= 5_000
    ) {
      sessionValue = 0;
      sessionStart = shift.time;
    }
    sessionValue += shift.value;
    largestSession = Math.max(largestSession, sessionValue);
    previousShift = shift.time;
  }
  return largestSession;
}
