import type { AppRole } from "@/modules/billing/domain/types";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseEmailList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((email) => normalizeEmail(email))
        .filter(Boolean),
    ),
  );
}

export function getBootstrapRolesForEmail(email: string | null | undefined): AppRole[] {
  if (!email) {
    return [];
  }

  const normalizedEmail = normalizeEmail(email);
  const roles = new Set<AppRole>();

  const ownerEmail = process.env.BOOTSTRAP_OWNER_EMAIL?.trim();
  if (ownerEmail && normalizedEmail === normalizeEmail(ownerEmail)) {
    roles.add("owner");
  }

  for (const adminEmail of parseEmailList(process.env.BOOTSTRAP_ADMIN_EMAILS)) {
    if (normalizedEmail === adminEmail) {
      roles.add("admin");
    }
  }

  return Array.from(roles);
}
