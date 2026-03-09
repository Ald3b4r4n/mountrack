import { createHash } from "node:crypto";

export type MissingFoodLookupStatus =
  | "pending"
  | "processing"
  | "completed"
  | "no_match"
  | "failed";

export const MISSING_FOOD_LOOKUP_MAX_ATTEMPTS = 3;
export const MISSING_FOOD_LOOKUP_PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;

export interface MissingFoodLookupInput {
  query?: string;
  barcode?: string;
  reason: string;
}

export interface MissingFoodLookupRecord {
  id: string;
  query?: string;
  barcode?: string;
  reason: string;
  status: MissingFoodLookupStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  processingStartedAt?: string | null;
  processedAt?: string | null;
  lastError?: string | null;
}

export function normalizeMissingFoodLookupValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function buildMissingFoodLookupSeed({ query, barcode }: Pick<MissingFoodLookupInput, "query" | "barcode">): string {
  const normalizedBarcode = barcode?.trim();
  if (normalizedBarcode) {
    return `barcode:${normalizedBarcode}`;
  }

  const normalizedQuery = query ? normalizeMissingFoodLookupValue(query) : "";
  if (normalizedQuery) {
    return `query:${normalizedQuery}`;
  }

  throw new Error("Missing food lookup requires a query or barcode.");
}

export function buildMissingFoodLookupId(input: Pick<MissingFoodLookupInput, "query" | "barcode">): string {
  const seed = buildMissingFoodLookupSeed(input);
  const digest = createHash("sha256").update(seed).digest("hex").slice(0, 24);
  return `missing-food:${digest}`;
}
