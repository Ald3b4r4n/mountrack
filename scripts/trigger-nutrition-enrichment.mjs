function parseArgs(argv) {
  const args = {
    baseUrl: process.env.NUTRITION_BASE_URL?.trim() || "http://localhost:3000",
    limit: 5,
  };
  const positionalArgs = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextArg = argv[index + 1];

    if (arg === "--base-url" && nextArg) {
      args.baseUrl = nextArg.trim();
      index += 1;
      continue;
    }

    if (arg === "--limit" && nextArg) {
      const numericLimit = Number(nextArg);
      if (Number.isFinite(numericLimit) && numericLimit > 0) {
        args.limit = Math.trunc(numericLimit);
      }
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/trigger-nutrition-enrichment.mjs [--base-url <url>] [--limit <number>]",
      );
      process.exit(0);
    }

    positionalArgs.push(arg);
  }

  if (positionalArgs[0]) {
    args.baseUrl = positionalArgs[0].trim();
  }

  if (positionalArgs[1]) {
    const numericLimit = Number(positionalArgs[1]);
    if (Number.isFinite(numericLimit) && numericLimit > 0) {
      args.limit = Math.trunc(numericLimit);
    }
  }

  return args;
}

function resolveToken() {
  const token = process.env.NUTRITION_INGEST_TOKEN?.trim() || process.env.CRON_SECRET?.trim() || "";
  if (!token) {
    throw new Error("Missing NUTRITION_INGEST_TOKEN or CRON_SECRET in the environment.");
  }

  return token;
}

async function main() {
  const { baseUrl, limit } = parseArgs(process.argv.slice(2));
  const token = resolveToken();
  const endpoint = new URL("/api/nutrition/foods/enrichment", baseUrl);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ limit }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `HTTP ${response.status}`;
    throw new Error(`Nutrition enrichment request failed: ${message}`);
  }

  console.log(
    JSON.stringify(
      {
        endpoint: endpoint.toString(),
        ...payload,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
