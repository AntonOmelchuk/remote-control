export type PairedMacSummary = { name: string; id: string };
export type PairingPreparation = { name: string; comparison: string };

function parseSummary(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid native pairing summary');
  }
  return parsed as Record<string, unknown>;
}

export function readPairedMac(value: string): PairedMacSummary {
  const parsed = parseSummary(value);
  if (
    typeof parsed.name !== 'string' ||
    !parsed.name.trim() ||
    parsed.name.length > 80 ||
    typeof parsed.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.id)
  ) {
    throw new Error('Invalid paired Mac summary');
  }
  return { name: parsed.name, id: parsed.id };
}

export function readPreparation(value: string): PairingPreparation {
  const parsed = parseSummary(value);
  if (
    typeof parsed.name !== 'string' ||
    !parsed.name.trim() ||
    parsed.name.length > 80 ||
    typeof parsed.comparison !== 'string' ||
    !/^\d{6}$/.test(parsed.comparison)
  ) {
    throw new Error('Invalid pairing preparation');
  }
  return { name: parsed.name, comparison: parsed.comparison };
}
