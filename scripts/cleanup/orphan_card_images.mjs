import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

export const cardImagesBucket = "card-images";

const storageRootPrefix = "";
const storageListLimit = 1000;
const cardsPageSize = 1000;
const newCardImagePathPattern =
  /^users\/[^/]+\/cards\/[^/]+\/front\.(?:webp|jpg)$/;
const legacyCardImagePathPattern =
  /^(?!users\/)[^/]+\/cards\/[^/]+\/front\.(?:webp|jpg)$/;

export function createSupabaseAdminClient(supabaseUrl, serviceRoleKey) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function loadEnvFile(path) {
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

export function createSupabaseAdminClientFromEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
}

function pathJoin(...parts) {
  return parts
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function cardImagePathType(path) {
  if (newCardImagePathPattern.test(path)) {
    return "new";
  }

  if (legacyCardImagePathPattern.test(path)) {
    return "legacy";
  }

  return null;
}

function storageObjectSize(object) {
  const size = object.metadata?.size;

  return typeof size === "number" && Number.isFinite(size) ? size : 0;
}

export function formatBytes(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function isStorageFolder(entry) {
  return !entry.id;
}

async function listStorageEntries(supabase, prefix) {
  const entries = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(cardImagesBucket)
      .list(prefix, {
        limit: storageListLimit,
        offset,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (error) {
      throw error;
    }

    const pageEntries = data ?? [];

    entries.push(...pageEntries);

    if (pageEntries.length < storageListLimit) {
      break;
    }

    offset += storageListLimit;
  }

  return entries;
}

async function listStorageFilesRecursively(supabase, prefix) {
  const files = [];
  const entries = await listStorageEntries(supabase, prefix);

  for (const entry of entries) {
    const entryPath = pathJoin(prefix, entry.name);

    if (isStorageFolder(entry)) {
      files.push(...(await listStorageFilesRecursively(supabase, entryPath)));
      continue;
    }

    const pathType = cardImagePathType(entryPath);

    if (pathType) {
      files.push({
        path: entryPath,
        pathType,
        size: storageObjectSize(entry),
        updatedAt: entry.updated_at ?? entry.created_at ?? "",
      });
    }
  }

  return files;
}

async function fetchReferencedImagePaths(supabase) {
  const referencedPaths = new Set();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("cards")
      .select("image_path")
      .not("image_path", "is", null)
      .range(offset, offset + cardsPageSize - 1);

    if (error) {
      throw error;
    }

    const rows = data ?? [];

    for (const row of rows) {
      const imagePath = row.image_path?.trim().replace(/^\/+/, "");

      if (imagePath && cardImagePathType(imagePath)) {
        referencedPaths.add(imagePath);
      }
    }

    if (rows.length < cardsPageSize) {
      break;
    }

    offset += cardsPageSize;
  }

  return referencedPaths;
}

export function summarizeImages(images) {
  return {
    count: images.length,
    bytes: images.reduce((total, image) => total + image.size, 0),
  };
}

export async function collectOrphanCardImages(supabase) {
  const storageImages = await listStorageFilesRecursively(
    supabase,
    storageRootPrefix,
  );
  const referencedImagePaths = await fetchReferencedImagePaths(supabase);
  const orphanImages = storageImages.filter(
    (image) => !referencedImagePaths.has(image.path),
  );

  return {
    orphanImages,
    referencedImageCount: referencedImagePaths.size,
    storageImages,
  };
}
