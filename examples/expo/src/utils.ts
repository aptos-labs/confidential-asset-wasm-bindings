const HEX_DIGITS = /^[0-9a-f]+$/i;
const MAX_U64 = 18_446_744_073_709_551_615n;

export function budgetFieldId(key: string): string {
  return `budget.${key}`;
}

export function bytesToHex(bytes: Uint8Array): string {
  let result = '';

  for (const byte of bytes) {
    result += byte.toString(16).padStart(2, '0');
  }

  return result;
}

export function hexToBytes(
  fieldName: string,
  value: string,
  expectedByteLength?: number,
): Uint8Array {
  const trimmed = value.trim().replace(/^0x/i, '').toLowerCase();

  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (trimmed.length % 2 !== 0) {
    throw new Error(
      `${fieldName} must contain an even number of hex characters`,
    );
  }

  if (!HEX_DIGITS.test(trimmed)) {
    throw new Error(`${fieldName} must contain only hex characters`);
  }

  const bytes = new Uint8Array(trimmed.length / 2);

  for (let index = 0; index < trimmed.length; index += 2) {
    bytes[index / 2] = Number.parseInt(trimmed.slice(index, index + 2), 16);
  }

  if (expectedByteLength !== undefined && bytes.length !== expectedByteLength) {
    throw new Error(`${fieldName} must be exactly ${expectedByteLength} bytes`);
  }

  return bytes;
}

export function parsePositiveInteger(
  fieldName: string,
  value: string,
  options?: { max?: number },
): number {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  if (options?.max !== undefined && parsed > options.max) {
    throw new Error(`${fieldName} must be at most ${options.max}`);
  }

  return parsed;
}

export function parseNonNegativeInteger(
  fieldName: string,
  value: string,
): number {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return parsed;
}

export function parseU64(fieldName: string, value: string): string {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${fieldName} must be an unsigned 64-bit decimal string`);
  }

  const parsed = BigInt(trimmed);

  if (parsed > MAX_U64) {
    throw new Error(`${fieldName} must fit within uint64`);
  }

  return trimmed;
}

export function parseCsvIntegers(
  fieldName: string,
  value: string,
  options?: { min?: number; max?: number },
): number[] {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error(`${fieldName} must contain at least one integer`);
  }

  return items.map((item) => {
    if (!/^\d+$/.test(item)) {
      throw new Error(`${fieldName} must contain only integers`);
    }

    const parsed = Number.parseInt(item, 10);

    if (!Number.isSafeInteger(parsed)) {
      throw new Error(`${fieldName} contains an invalid integer`);
    }

    if (options?.min !== undefined && parsed < options.min) {
      throw new Error(`${fieldName} values must be at least ${options.min}`);
    }

    if (options?.max !== undefined && parsed > options.max) {
      throw new Error(`${fieldName} values must be at most ${options.max}`);
    }

    return parsed;
  });
}

export function parseCsvU64(fieldName: string, value: string): string[] {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error(`${fieldName} must contain at least one value`);
  }

  return items.map((item) => parseU64(fieldName, item));
}

export function uint8ArrayEquals(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export function summarizeValue(value: string, maxLength = 96): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
