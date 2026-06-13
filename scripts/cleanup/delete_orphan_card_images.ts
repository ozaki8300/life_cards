import { resolve } from "node:path";

import {
  cardImagesBucket,
  collectOrphanCardImages,
  createSupabaseAdminClientFromEnv,
  formatBytes,
  loadEnvFile,
  summarizeImages,
} from "./orphan_card_images.mjs";

const storageRemoveBatchSize = 100;

async function removeOrphanImages(
  supabase: ReturnType<typeof createSupabaseAdminClientFromEnv>,
  orphanImages: Array<{ path: string }>,
) {
  let failureCount = 0;
  let successCount = 0;

  for (let index = 0; index < orphanImages.length; index += storageRemoveBatchSize) {
    const batch = orphanImages.slice(index, index + storageRemoveBatchSize);
    const paths = batch.map((image) => image.path);
    const { error } = await supabase.storage
      .from(cardImagesBucket)
      .remove(paths);

    if (error) {
      failureCount += paths.length;
      console.warn("Life Cards orphan image remove batch failed", {
        error,
        paths,
      });
      continue;
    }

    successCount += paths.length;
  }

  return {
    failureCount,
    successCount,
  };
}

async function main() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));

  const isConfirmed = process.argv.includes("--confirm");
  const supabase = createSupabaseAdminClientFromEnv();
  const { orphanImages, referencedImageCount, storageImages } =
    await collectOrphanCardImages(supabase);
  const storageSummary = summarizeImages(storageImages);
  const orphanSummary = summarizeImages(orphanImages);

  console.log("Life Cards orphan card images cleanup");
  console.log("-------------------------------------");
  console.log(`bucket: ${cardImagesBucket}`);
  console.log("target paths: users/{userId}/cards/{cardId}/front.webp|front.jpg");
  console.log("target paths: {userId}/cards/{cardId}/front.webp|front.jpg");
  console.log(`total storage image count: ${storageSummary.count}`);
  console.log(`referenced image count: ${referencedImageCount}`);
  console.log(`orphan candidate count: ${orphanSummary.count}`);
  console.log(`estimated orphan bytes: ${formatBytes(orphanSummary.bytes)}`);
  console.log("");

  if (orphanImages.length === 0) {
    console.log("No orphan card images found. Nothing to delete.");
    return;
  }

  if (!isConfirmed) {
    console.log("Dry-run only. No files were deleted.");
    console.log("Run with --confirm to delete the orphan candidates.");
    return;
  }

  console.log("Deleting orphan card images...");

  const result = await removeOrphanImages(supabase, orphanImages);

  console.log("");
  console.log(`delete success count: ${result.successCount}`);
  console.log(`delete failure count: ${result.failureCount}`);
}

main().catch((error: unknown) => {
  console.error("Life Cards orphan card images cleanup failed.");
  console.error(error);
  process.exitCode = 1;
});
