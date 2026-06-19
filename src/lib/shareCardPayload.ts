import type {
  Card,
  CardImageFitMode,
  CardImageFrameMode,
  DefaultCardImageKey,
} from "./types";

export type ShareCardType = "card" | "people";
export type ShareCardMode = "withImage" | "textOnly";

export type ShareCardPayload = {
  schemaVersion: 1 | 2;
  shareMode: ShareCardMode;
  card: {
    frontText?: string;
    frontComment?: string;
    backText?: string;
    defaultImageKey?: DefaultCardImageKey;
    linkUrl?: string;
    imagePath?: string;
    shareImageStoragePath?: string;
    imageFitMode: CardImageFitMode;
    imageFrameMode?: CardImageFrameMode;
    createdAt: string;
    updatedAt: string;
  };
  creator: {
    label: string;
  };
};

type CreateShareCardPayloadOptions = {
  shareImageStoragePath?: string;
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isCardImageFitMode(value: unknown): value is CardImageFitMode {
  return value === "cover" || value === "blurExtend";
}

function isCardImageFrameMode(value: unknown): value is CardImageFrameMode {
  return value === "none" || value === "paper";
}

function isDefaultCardImageKey(value: unknown): value is DefaultCardImageKey {
  return (
    value === "paper" ||
    value === "night" ||
    value === "sea" ||
    value === "mountain" ||
    value === "library"
  );
}

function isShareCardMode(value: unknown): value is ShareCardMode {
  return value === "withImage" || value === "textOnly";
}

export function createShareCardPayload(
  card: Card,
  creatorLabel: string,
  shareMode: ShareCardMode = "withImage",
  options: CreateShareCardPayloadOptions = {},
): ShareCardPayload {
  return {
    schemaVersion: 2,
    shareMode,
    card: {
      frontText: card.frontText,
      frontComment: card.frontComment,
      backText: card.backText,
      defaultImageKey: card.defaultImageKey ?? "paper",
      linkUrl: card.linkUrl,
      imagePath: "",
      shareImageStoragePath:
        shareMode === "withImage" ? options.shareImageStoragePath ?? "" : "",
      imageFitMode: card.imageFitMode ?? "cover",
      imageFrameMode: card.imageFrameMode ?? "none",
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    },
    creator: {
      label: creatorLabel,
    },
  };
}

export function parseShareCardPayload(value: unknown): ShareCardPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const schemaVersion =
    payload.schemaVersion === 1 || payload.schemaVersion === 2
      ? payload.schemaVersion
      : null;
  const card = payload.card;
  const creator = payload.creator;

  if (!schemaVersion || !card || typeof card !== "object") {
    return null;
  }

  const cardRecord = card as Record<string, unknown>;
  const creatorRecord =
    creator && typeof creator === "object" ? (creator as Record<string, unknown>) : {};
  const imageFitMode = isCardImageFitMode(cardRecord.imageFitMode)
    ? cardRecord.imageFitMode
    : "cover";
  const imageFrameMode = isCardImageFrameMode(cardRecord.imageFrameMode)
    ? cardRecord.imageFrameMode
    : "none";

  if (!isString(cardRecord.createdAt) || !isString(cardRecord.updatedAt)) {
    return null;
  }

  return {
    schemaVersion,
    shareMode: isShareCardMode(payload.shareMode)
      ? payload.shareMode
      : "withImage",
    card: {
      backText: isString(cardRecord.backText) ? cardRecord.backText : "",
      createdAt: cardRecord.createdAt,
      defaultImageKey: isDefaultCardImageKey(cardRecord.defaultImageKey)
        ? cardRecord.defaultImageKey
        : "paper",
      frontComment: isString(cardRecord.frontComment)
        ? cardRecord.frontComment
        : "",
      frontText: isString(cardRecord.frontText) ? cardRecord.frontText : "",
      imageFrameMode,
      imageFitMode,
      imagePath: isString(cardRecord.imagePath) ? cardRecord.imagePath : "",
      linkUrl: isString(cardRecord.linkUrl) ? cardRecord.linkUrl : "",
      shareImageStoragePath:
        schemaVersion === 2 && isString(cardRecord.shareImageStoragePath)
          ? cardRecord.shareImageStoragePath
          : "",
      updatedAt: cardRecord.updatedAt,
    },
    creator: {
      label: isString(creatorRecord.label) ? creatorRecord.label : "",
    },
  };
}
