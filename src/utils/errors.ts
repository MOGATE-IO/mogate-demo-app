export function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

export class CapabilityBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapabilityBlockedError';
  }
}
