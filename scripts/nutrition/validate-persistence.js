function formatDefaultDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(now);
}

function parseArgs(argv, env = process.env) {
  const args = {
    baseUrl: (env.NUTRITION_BASE_URL || "http://localhost:3000").trim(),
    date: (env.NUTRITION_VALIDATION_DATE || formatDefaultDate()).trim(),
    primaryUserId: (env.NUTRITION_VALIDATION_PRIMARY_USER || "preview-validation-primary").trim(),
    secondaryUserId: (env.NUTRITION_VALIDATION_SECONDARY_USER || "preview-validation-secondary").trim(),
    ingestToken: (env.NUTRITION_INGEST_TOKEN || env.CRON_SECRET || "").trim(),
    skipEnrichment: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextArg = argv[index + 1];

    if ((arg === "--base-url" || arg === "--date" || arg === "--primary-user" || arg === "--secondary-user" || arg === "--token") && nextArg) {
      if (arg === "--base-url") args.baseUrl = nextArg.trim();
      if (arg === "--date") args.date = nextArg.trim();
      if (arg === "--primary-user") args.primaryUserId = nextArg.trim();
      if (arg === "--secondary-user") args.secondaryUserId = nextArg.trim();
      if (arg === "--token") args.ingestToken = nextArg.trim();
      index += 1;
      continue;
    }

    if (arg === "--skip-enrichment") {
      args.skipEnrichment = true;
      continue;
    }
  }

  return args;
}

function createPreviewHeaders(userId, extraHeaders = {}) {
  return {
    "x-dev-user-id": userId,
    "x-dev-auth-mode": "preview",
    ...extraHeaders,
  };
}

function getRunId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function buildValidationFoodName(runId) {
  return `Codex Persistence Validation ${runId}`;
}

function parseJsonSafely(response) {
  return response
    .json()
    .catch(() => null);
}

async function requestJson(fetchImpl, url, init, label) {
  const response = await fetchImpl(url, init);
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `HTTP ${response.status}`;
    throw new Error(`${label} failed: ${message}`);
  }

  return { response, payload };
}

async function requestJsonAllowFailure(fetchImpl, url, init) {
  const response = await fetchImpl(url, init);
  const payload = await parseJsonSafely(response);
  return { response, payload };
}

function ensureGoalMatches(goal) {
  return (
    goal &&
    goal.targetCalories === 2345 &&
    goal.targetWaterMl === 2600 &&
    goal.targetProtein === 150 &&
    goal.targetCarbs === 210 &&
    goal.targetFat === 70 &&
    goal.objective === "maintain"
  );
}

async function runNutritionPersistenceValidation(options) {
  const fetchImpl = options.fetchImpl || global.fetch;

  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required to run nutrition persistence validation.");
  }

  const baseUrl = String(options.baseUrl || "http://localhost:3000").replace(/\/+$/, "");
  const date = String(options.date || formatDefaultDate()).trim();
  const primaryUserId = String(options.primaryUserId || "preview-validation-primary").trim();
  const secondaryUserId = String(options.secondaryUserId || "preview-validation-secondary").trim();
  const ingestToken = String(options.ingestToken || "").trim();
  const skipEnrichment = Boolean(options.skipEnrichment);
  const runId = String(options.runId || getRunId()).trim();
  const foodName = buildValidationFoodName(runId);
  const goalPayload = {
    targetCalories: 2345,
    targetWaterMl: 2600,
    targetProtein: 150,
    targetCarbs: 210,
    targetFat: 70,
    objective: "maintain",
  };
  const hydrationPayload = {
    waterIntakeMl: 900,
  };
  const results = {};

  const diaryUrl = new URL(`/api/nutrition/diaries/${date}`, baseUrl).toString();
  const goalsUrl = new URL("/api/nutrition/goals", baseUrl).toString();
  const customFoodUrl = new URL("/api/nutrition/foods/custom", baseUrl).toString();
  const enrichmentUrl = new URL("/api/nutrition/foods/enrichment", baseUrl).toString();

  const initialDiary = await requestJson(
    fetchImpl,
    diaryUrl,
    {
      method: "GET",
      headers: createPreviewHeaders(primaryUserId),
    },
    "Diary bootstrap check",
  );

  const storage = initialDiary.response.headers.get("x-nutrition-storage") || "unknown";
  if (storage !== "database") {
    throw new Error(`Expected nutrition storage to be database, received ${storage}`);
  }

  results.storage = {
    status: "pass",
    storage,
  };

  await requestJson(
    fetchImpl,
    goalsUrl,
    {
      method: "PUT",
      headers: createPreviewHeaders(primaryUserId, {
        "content-type": "application/json",
      }),
      body: JSON.stringify(goalPayload),
    },
    "Goal save check",
  );

  const savedGoal = await requestJson(
    fetchImpl,
    goalsUrl,
    {
      method: "GET",
      headers: createPreviewHeaders(primaryUserId),
    },
    "Goal fetch check",
  );

  if (!ensureGoalMatches(savedGoal.payload?.goal)) {
    throw new Error("Goal validation failed: persisted goal does not match the expected payload.");
  }

  results.goals = {
    status: "pass",
    goal: savedGoal.payload.goal,
  };

  await requestJson(
    fetchImpl,
    diaryUrl,
    {
      method: "PATCH",
      headers: createPreviewHeaders(primaryUserId, {
        "content-type": "application/json",
      }),
      body: JSON.stringify(hydrationPayload),
    },
    "Diary hydration update check",
  );

  const refreshedDiary = await requestJson(
    fetchImpl,
    diaryUrl,
    {
      method: "GET",
      headers: createPreviewHeaders(primaryUserId),
    },
    "Diary hydration fetch check",
  );

  if (refreshedDiary.payload?.diary?.waterIntakeMl !== hydrationPayload.waterIntakeMl) {
    throw new Error("Diary validation failed: hydration update was not persisted.");
  }

  results.hydration = {
    status: "pass",
    waterIntakeMl: refreshedDiary.payload.diary.waterIntakeMl,
  };

  const createdFood = await requestJson(
    fetchImpl,
    customFoodUrl,
    {
      method: "POST",
      headers: createPreviewHeaders(primaryUserId, {
        "content-type": "application/json",
      }),
      body: JSON.stringify({
        name: foodName,
        servingGrams: 100,
        caloriesPer100: 131,
        proteinPer100: 26,
        carbsPer100: 0,
        fatPer100: 3,
      }),
    },
    "Custom food creation check",
  );

  const createdFoodId = createdFood.payload?.item?.id;
  if (!createdFoodId) {
    throw new Error("Custom food validation failed: response did not include an item id.");
  }

  const primarySearchUrl = new URL("/api/nutrition/foods/search", baseUrl);
  primarySearchUrl.searchParams.set("q", foodName);
  const primarySearch = await requestJson(
    fetchImpl,
    primarySearchUrl.toString(),
    {
      method: "GET",
      headers: createPreviewHeaders(primaryUserId),
    },
    "Custom food primary search check",
  );

  const secondarySearchUrl = new URL("/api/nutrition/foods/search", baseUrl);
  secondarySearchUrl.searchParams.set("q", foodName);
  const secondarySearch = await requestJson(
    fetchImpl,
    secondarySearchUrl.toString(),
    {
      method: "GET",
      headers: createPreviewHeaders(secondaryUserId),
    },
    "Custom food isolation check",
  );

  const visibleToPrimary = Array.isArray(primarySearch.payload?.results)
    && primarySearch.payload.results.some((item) => item.id === createdFoodId);
  const visibleToSecondary = Array.isArray(secondarySearch.payload?.results)
    && secondarySearch.payload.results.some((item) => item.id === createdFoodId);

  if (!visibleToPrimary || visibleToSecondary) {
    throw new Error("Custom food isolation validation failed: visibility rules did not match expectations.");
  }

  results.customFoodIsolation = {
    status: "pass",
    foodName,
    createdFoodId,
    visibleToPrimary,
    visibleToSecondary,
  };

  const unauthorizedEnrichment = await requestJsonAllowFailure(
    fetchImpl,
    enrichmentUrl,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ limit: 1 }),
    },
  );

  if (![401, 503].includes(unauthorizedEnrichment.response.status)) {
    throw new Error(
      `Enrichment auth validation failed: expected 401 or 503, received ${unauthorizedEnrichment.response.status}`,
    );
  }

  results.enrichmentUnauthorized = {
    status: "pass",
    statusCode: unauthorizedEnrichment.response.status,
  };

  if (skipEnrichment || !ingestToken) {
    results.enrichmentAuthorized = {
      status: "skipped",
      reason: skipEnrichment ? "Skipped by CLI flag" : "No ingest token provided",
    };
  } else {
    const authorizedEnrichment = await requestJson(
      fetchImpl,
      enrichmentUrl,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${ingestToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ limit: 1 }),
      },
      "Authorized enrichment check",
    );

    results.enrichmentAuthorized = {
      status: "pass",
      statusCode: authorizedEnrichment.response.status,
      payload: authorizedEnrichment.payload,
    };
  }

  return {
    baseUrl,
    date,
    storage,
    primaryUserId,
    secondaryUserId,
    results,
  };
}

function printHelp() {
  console.log(
    [
      "Usage: node scripts/nutrition/validate-persistence.js [options]",
      "",
      "Options:",
      "  --base-url <url>         Base URL to validate (default: http://localhost:3000)",
      "  --date <yyyy-mm-dd>      Diary date used by the validation flow",
      "  --primary-user <id>      Preview user id used for write/read checks",
      "  --secondary-user <id>    Preview user id used for isolation checks",
      "  --token <secret>         Ingest token for the authenticated enrichment check",
      "  --skip-enrichment        Skip the authenticated enrichment check",
      "  --help, -h               Show this help",
    ].join("\n"),
  );
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  const args = parseArgs(argv);
  const result = await runNutritionPersistenceValidation(args);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  buildValidationFoodName,
  createPreviewHeaders,
  parseArgs,
  runNutritionPersistenceValidation,
};
