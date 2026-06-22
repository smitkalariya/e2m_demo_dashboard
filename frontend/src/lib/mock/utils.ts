let counter = 0;

export function mockId(prefix: string): string {
  counter += 1;
  return `mock-${prefix}-${counter}-${Date.now().toString(36)}`;
}

export function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nowIso(): string {
  return new Date().toISOString();
}
