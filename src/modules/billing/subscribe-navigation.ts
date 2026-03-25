export type SubscribeEntry = "default" | "plan" | "checkout";

export function resolveSubscribeEntry(value?: string | null): SubscribeEntry {
  if (value === "plan" || value === "checkout") {
    return value;
  }

  return "default";
}

export function buildSubscribePath(entry: SubscribeEntry = "default"): string {
  if (entry === "default") {
    return "/subscribe";
  }

  return `/subscribe?entry=${entry}`;
}

export function resolveSubscribeStep(entry: SubscribeEntry): number {
  switch (entry) {
    case "checkout":
      return 2;
    case "plan":
    case "default":
    default:
      return 0;
  }
}

export function shouldStayOnSubscribe(entry: SubscribeEntry): boolean {
  return entry !== "default";
}
