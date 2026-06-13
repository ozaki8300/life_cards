import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

const usageEventsPageSize = 1000;
const topLimit = 10;

type UsageEventRow = {
  created_at: string | null;
  event_name: string | null;
  metadata: Record<string, unknown> | null;
};

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }

  const fileBody = readFileSync(path, "utf8");

  for (const line of fileBody.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    process.env[key] ??= value;
  }
}

function createSupabaseAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function incrementCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function eventDate(createdAt: string | null) {
  if (!createdAt) {
    return "unknown";
  }

  return createdAt.slice(0, 10) || "unknown";
}

function metadataCardId(metadata: Record<string, unknown> | null) {
  const cardId = metadata?.cardId ?? metadata?.card_id;

  return typeof cardId === "string" && cardId.trim() ? cardId.trim() : null;
}

function sortedEntries(map: Map<string, number>) {
  return [...map.entries()].sort(([leftKey, leftCount], [rightKey, rightCount]) => {
    if (rightCount !== leftCount) {
      return rightCount - leftCount;
    }

    return leftKey.localeCompare(rightKey);
  });
}

function printCountTable(title: string, entries: Array<[string, number]>) {
  console.log("");
  console.log(title);
  console.log("-".repeat(title.length));

  if (entries.length === 0) {
    console.log("(none)");
    return;
  }

  for (const [key, count] of entries) {
    console.log(`${key}: ${count}`);
  }
}

async function fetchUsageEvents(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
) {
  const rows: UsageEventRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("usage_events")
      .select("event_name,metadata,created_at")
      .order("created_at", { ascending: true })
      .range(offset, offset + usageEventsPageSize - 1);

    if (error) {
      throw error;
    }

    const pageRows = (data ?? []) as UsageEventRow[];

    rows.push(...pageRows);

    if (pageRows.length < usageEventsPageSize) {
      break;
    }

    offset += usageEventsPageSize;
  }

  return rows;
}

async function main() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  const supabase = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
  const rows = await fetchUsageEvents(supabase);
  const eventCounts = new Map<string, number>();
  const dailyCounts = new Map<string, number>();
  const cardViewedCounts = new Map<string, number>();
  const reencounterOpenedCounts = new Map<string, number>();
  const uniqueViewedCards = new Set<string>();
  let latestEventTimestamp = "";

  for (const row of rows) {
    const eventName = row.event_name?.trim() || "unknown";
    const cardId = metadataCardId(row.metadata);

    incrementCount(eventCounts, eventName);
    incrementCount(dailyCounts, eventDate(row.created_at));

    if (row.created_at && row.created_at > latestEventTimestamp) {
      latestEventTimestamp = row.created_at;
    }

    if (eventName === "card_viewed" && cardId) {
      incrementCount(cardViewedCounts, cardId);
      uniqueViewedCards.add(cardId);
    }

    if (eventName === "reencounter_opened" && cardId) {
      incrementCount(reencounterOpenedCounts, cardId);
    }
  }

  console.log("Life Cards usage_events summary");
  console.log("--------------------------------");
  console.log(`total events: ${rows.length}`);
  console.log(`unique viewed cards: ${uniqueViewedCards.size}`);
  console.log(`latest event timestamp: ${latestEventTimestamp || "none"}`);

  printCountTable("event_name counts", sortedEntries(eventCounts));
  printCountTable("daily counts", sortedEntries(dailyCounts));
  printCountTable("card_viewed by cardId", sortedEntries(cardViewedCounts));
  printCountTable(
    "reencounter_opened by cardId",
    sortedEntries(reencounterOpenedCounts),
  );
  printCountTable(
    `top viewed cards top ${topLimit}`,
    sortedEntries(cardViewedCounts).slice(0, topLimit),
  );
  printCountTable(
    `top reencounter opened cards top ${topLimit}`,
    sortedEntries(reencounterOpenedCounts).slice(0, topLimit),
  );
}

main().catch((error: unknown) => {
  console.error("Life Cards usage_events summary failed.");
  console.error(error);
  process.exitCode = 1;
});
