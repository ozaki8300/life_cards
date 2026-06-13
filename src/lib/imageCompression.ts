export type ImageCompressionOptions = {
  maxLongEdge?: number;
  minQuality?: number;
  quality?: number;
  mimeType?: ImageCompressionMimeType;
  targetBytes?: number;
};

type ImageCompressionMimeType = "image/jpeg" | "image/webp";

export type CompressedImageResult = {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
};

export const IMAGE_COMPRESSION_TARGET_BYTES = 300 * 1024;
export const IMAGE_COMPRESSION_MAX_LONG_EDGE = 1600;
export const IMAGE_COMPRESSION_INITIAL_QUALITY = 0.72;
export const IMAGE_COMPRESSION_MIN_QUALITY = 0.45;

const IMAGE_COMPRESSION_QUALITY_STEP = 0.07;
const IMAGE_COMPRESSION_MAX_ATTEMPTS = 8;

const defaultOptions = {
  maxLongEdge: IMAGE_COMPRESSION_MAX_LONG_EDGE,
  minQuality: IMAGE_COMPRESSION_MIN_QUALITY,
  mimeType: "image/webp",
  quality: IMAGE_COMPRESSION_INITIAL_QUALITY,
  targetBytes: IMAGE_COMPRESSION_TARGET_BYTES,
} satisfies Required<ImageCompressionOptions>;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = window.URL.createObjectURL(file);
    const image = new Image();

    image.addEventListener(
      "load",
      () => {
        window.URL.revokeObjectURL(objectUrl);
        resolve(image);
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        window.URL.revokeObjectURL(objectUrl);
        reject(new Error("Image load failed"));
      },
      { once: true },
    );
    image.decoding = "async";
    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: ImageCompressionMimeType,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

async function compressCanvas(
  canvas: HTMLCanvasElement,
  mimeType: ImageCompressionMimeType,
  quality: number,
) {
  const blob = await canvasToBlob(canvas, mimeType, quality);

  if (blob.type !== mimeType) {
    throw new Error(`Image compression must produce ${mimeType}`);
  }

  return blob;
}

async function compressCanvasWithFallback(
  canvas: HTMLCanvasElement,
  mimeType: ImageCompressionMimeType,
  quality: number,
) {
  try {
    return await compressCanvas(canvas, mimeType, quality);
  } catch (error) {
    if (mimeType !== "image/webp") {
      throw error;
    }

    console.warn("Life Cards WebP compression failed; retrying as JPEG", error);
    return compressCanvas(canvas, "image/jpeg", quality);
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Blob read failed"));
    });
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string) {
  const [metadata, base64Data] = dataUrl.split(",");
  const mimeType = metadata.match(/^data:([^;]+);base64$/)?.[1];

  if (!mimeType || !base64Data) {
    throw new Error("Invalid data URL");
  }

  const binary = window.atob(base64Data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {},
): Promise<CompressedImageResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Image compression requires a browser environment");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("File is not an image");
  }

  const maxLongEdge = options.maxLongEdge ?? defaultOptions.maxLongEdge;
  const initialQuality = Math.min(
    1,
    Math.max(0, options.quality ?? defaultOptions.quality),
  );
  const minQuality = Math.min(
    initialQuality,
    Math.max(0, options.minQuality ?? defaultOptions.minQuality),
  );
  let mimeType = options.mimeType ?? defaultOptions.mimeType;
  const targetBytes = options.targetBytes ?? defaultOptions.targetBytes;
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const longEdge = Math.max(sourceWidth, sourceHeight);

  if (!sourceWidth || !sourceHeight || !longEdge) {
    throw new Error("Image dimensions are unavailable");
  }

  const scale = Math.min(1, maxLongEdge / longEdge);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context is unavailable");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  let quality = initialQuality;
  let blob = await compressCanvasWithFallback(canvas, mimeType, quality);
  mimeType = blob.type as ImageCompressionMimeType;
  let smallestBlob = blob;
  let attempts = 1;

  while (
    targetBytes > 0 &&
    blob.size > targetBytes &&
    quality > minQuality &&
    attempts < IMAGE_COMPRESSION_MAX_ATTEMPTS
  ) {
    quality = Math.max(
      minQuality,
      Number((quality - IMAGE_COMPRESSION_QUALITY_STEP).toFixed(2)),
    );
    blob = await compressCanvas(canvas, mimeType, quality);
    attempts += 1;

    if (blob.size < smallestBlob.size) {
      smallestBlob = blob;
    }
  }

  blob = smallestBlob;

  if (targetBytes > 0 && blob.size > targetBytes) {
    console.warn("Life Cards image exceeded compression target", {
      compressedSize: blob.size,
      minQuality,
      targetBytes,
    });
  }

  const dataUrl = await blobToDataUrl(blob);

  return {
    blob,
    dataUrl,
    width,
    height,
    originalSize: file.size,
    compressedSize: blob.size,
  };
}
