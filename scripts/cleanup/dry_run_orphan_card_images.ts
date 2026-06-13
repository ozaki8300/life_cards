import { resolve } from "node:path";

import {
  cardImagesBucket,
  collectOrphanCardImages,
  createSupabaseAdminClientFromEnv,
  formatBytes,
  loadEnvFile,
  summarizeImages,
} from "./orphan_card_images.mjs";

function printOrphanPathList(
  orphanImages: Array<{
    path: string;
    pathType: string;
    size: number;
    updatedAt: string;
  }>,
) {
  if (orphanImages.length === 0) {
    console.log("orphan path list: none");
    return;
  }

  console.log("orphan path list:");

  for (const image of orphanImages) {
    const updatedAtLabel = image.updatedAt || "unknown";

    console.log(
      `- path=${image.path} | size=${formatBytes(image.size)} bytes | updated_at=${updatedAtLabel} | pathType=${image.pathType}`,
    );
  }
}

async function main() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));

  const supabase = createSupabaseAdminClientFromEnv();
  const { orphanImages, referencedImageCount, storageImages } =
    await collectOrphanCardImages(supabase);
  const storageSummary = summarizeImages(storageImages);
  const orphanSummary = summarizeImages(orphanImages);

  console.log("Life Cards orphan card images dry-run");
  console.log("--------------------------------------");
  console.log(`bucket: ${cardImagesBucket}`);
  console.log("target paths: users/{userId}/cards/{cardId}/front.webp|front.jpg");
  console.log("target paths: {userId}/cards/{cardId}/front.webp|front.jpg");
  console.log(`total storage image count: ${storageSummary.count}`);
  console.log(`referenced image count: ${referencedImageCount}`);
  console.log(`orphan candidate count: ${orphanSummary.count}`);
  console.log(
    `estimated total storage bytes: ${formatBytes(storageSummary.bytes)}`,
  );
  console.log(`estimated orphan bytes: ${formatBytes(orphanSummary.bytes)}`);
  console.log("");

  printOrphanPathList(orphanImages);
}

main().catch((error: unknown) => {
  console.error("Life Cards orphan card images dry-run failed.");
  console.error(error);
  process.exitCode = 1;
});
