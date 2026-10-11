export function requiredTestValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

export function firstMockCallOrder(mock: {
  mock: { invocationCallOrder: readonly number[] };
}): number {
  return requiredTestValue(
    mock.mock.invocationCallOrder[0],
    'Expected the mock to have been called before comparing call order',
  );
}
