import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const cardImagesBucket = "card-images";
const cardImagesUserPrefix = "users";
const storageListLimit = 100;
const storageRemoveBatchSize = 100;

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

function pathJoin(...parts: string[]) {
  return parts
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function isMissingShareCardsTable(error: { code?: string }) {
  return error.code === "42P01" || error.code === "PGRST205";
}

async function listStorageFilesRecursively(
  admin: SupabaseAdminClient,
  bucket: string,
  prefix: string,
) {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
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

    const entries = data ?? [];

    for (const entry of entries) {
      const entryPath = pathJoin(prefix, entry.name);
      const isFolder = !entry.id;

      if (isFolder) {
        files.push(
          ...(await listStorageFilesRecursively(admin, bucket, entryPath)),
        );
      } else {
        files.push(entryPath);
      }
    }

    if (entries.length < storageListLimit) {
      break;
    }

    offset += storageListLimit;
  }

  return files;
}

async function removeStorageFiles(
  admin: SupabaseAdminClient,
  bucket: string,
  paths: string[],
) {
  for (let index = 0; index < paths.length; index += storageRemoveBatchSize) {
    const batch = paths.slice(index, index + storageRemoveBatchSize);
    const { error } = await admin.storage.from(bucket).remove(batch);

    if (error) {
      throw error;
    }
  }
}

export async function deleteStoragePrefix(
  admin: SupabaseAdminClient,
  bucket: string,
  prefix: string,
) {
  const paths = await listStorageFilesRecursively(admin, bucket, prefix);

  if (paths.length === 0) {
    return;
  }

  await removeStorageFiles(admin, bucket, paths);
}

async function deleteShareCardsForUser(
  admin: SupabaseAdminClient,
  userId: string,
) {
  const { error } = await admin
    .from("share_cards")
    .delete()
    .eq("creator_user_id", userId);

  if (!error || isMissingShareCardsTable(error)) {
    return;
  }

  throw error;
}

export async function deleteAccountForUser(userId: string) {
  const admin = createSupabaseAdminClient();
  const userStoragePrefix = pathJoin(cardImagesUserPrefix, userId);

  await deleteStoragePrefix(admin, cardImagesBucket, userStoragePrefix);
  await deleteShareCardsForUser(admin, userId);

  const { error } = await admin.auth.admin.deleteUser(userId, false);

  if (error) {
    throw error;
  }
}
