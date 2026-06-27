"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, FormEvent } from "react";

import {
  createCardToImagePrompt,
  createImageToCardPrompt,
} from "@/lib/aiAssistPrompts";
import { createCopyForAiMarkdown } from "@/lib/copyForAi";
import { DeckRepository } from "@/lib/deckRepository";
import { compressImage } from "@/lib/imageCompression";
import {
  createSupabaseBrowserClient,
  getSupabaseSessionSafely,
} from "@/lib/supabase/client";
import type {
  Card,
  CardImageFitMode,
  CardImageFrameMode,
  Deck,
  DefaultCardImageKey,
} from "@/lib/types";

import BackMemoEditor from "./BackMemoEditor";
import CardFormPreview from "./CardFormPreview";
import DeckCreateModal from "./DeckCreateModal";
import MobileDesktopHint from "./MobileDesktopHint";
import {
  type BackMemoMode,
  imageActions,
  normalizeDateInputValue,
  todayInputValue,
} from "./cardFormUtils";
import {
  DEFAULT_CARD_IMAGE_KEY,
  DEFAULT_CARD_IMAGE_OPTIONS,
  normalizeDefaultImageKey,
} from "./cardUiUtils";

const imageLoginMessage =
  "写真カードはログイン後に利用できます。ログインすると画像をクラウド保存し、PC/スマホで同期できます。";
const imageFitModeOptions = [
  {
    id: "cover",
    label: "Cover",
  },
  {
    id: "blurExtend",
    label: "Blur Extend",
  },
] as const satisfies ReadonlyArray<{
  id: CardImageFitMode;
  label: string;
}>;
const blurExtendPaperModeOptions = [
  {
    id: "none",
    label: "台紙なし",
  },
  {
    id: "paper",
    label: "白台紙あり",
  },
] as const satisfies ReadonlyArray<{
  id: CardImageFrameMode;
  label: string;
}>;
const previewCollapsedStorageKey = "life_cards.card_form.preview_collapsed";
const bookCardBackMemoTemplate = `## 要約

## 重要な示唆

## 自分への問い

## 仕事・学びへの転用

## 読後アクション`;

function sanitizeIsbnInput(value: string) {
  return value.replaceAll("-", "").replace(/\s+/g, "").toUpperCase();
}

function isValidIsbn13(value: string) {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  const sum = value
    .slice(0, 12)
    .split("")
    .reduce((total, digit, index) => {
      const multiplier = index % 2 === 0 ? 1 : 3;

      return total + Number(digit) * multiplier;
    }, 0);
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === Number(value[12]);
}

function convertIsbn13ToIsbn10(value: string) {
  if (!value.startsWith("978") || !isValidIsbn13(value)) {
    return value;
  }

  const isbn10Body = value.slice(3, 12);
  const weightedSum = isbn10Body
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
  const checkValue = 11 - (weightedSum % 11);
  const checkDigit =
    checkValue === 10 ? "X" : checkValue === 11 ? "0" : String(checkValue);

  return `${isbn10Body}${checkDigit}`;
}

export type CardFormValues = {
  backText: string;
  cardDate: string;
  defaultImageKey?: DefaultCardImageKey;
  deckId: string;
  frontComment: string;
  frontText: string;
  imageFitMode?: CardImageFitMode;
  imageFrameMode?: CardImageFrameMode;
  imagePath: string;
  imageStoragePath?: string;
  linkUrl: string;
};

export type CardFormSubmitContext = {
  expectsCloudSave: boolean;
};

type Props = {
  deckOptions: Deck[];
  initialValues: CardFormValues;
  mode: "new" | "edit";
  onCancel?: () => void;
  onDecksChange?: (decks: Deck[]) => void;
  onSubmit: (
    values: CardFormValues,
    context: CardFormSubmitContext,
  ) => Promise<void> | void;
  saveLabel?: string;
};

type AiAssistModalState = {
  message: string;
  title: string;
};

export default function CardForm({
  deckOptions,
  initialValues,
  mode,
  onCancel,
  onDecksChange,
  onSubmit,
  saveLabel = "保存",
}: Props) {
  const [frontText, setFrontText] = useState(initialValues.frontText);
  const [frontComment, setFrontComment] = useState(
    initialValues.frontComment,
  );
  const [backText, setBackText] = useState(initialValues.backText);
  const [selectedDeckId, setSelectedDeckId] = useState(initialValues.deckId);
  const [cardDate, setCardDate] = useState(() =>
    normalizeDateInputValue(initialValues.cardDate),
  );
  const [defaultImageKey, setDefaultImageKey] = useState<DefaultCardImageKey>(
    () =>
      mode === "new"
        ? DEFAULT_CARD_IMAGE_KEY
        : normalizeDefaultImageKey(initialValues.defaultImageKey),
  );
  const [imageLabel, setImageLabel] = useState("");
  const [imageErrorMessage, setImageErrorMessage] = useState("");
  const [imagePath, setImagePath] = useState(initialValues.imagePath);
  const [imageStoragePath, setImageStoragePath] = useState(
    initialValues.imageStoragePath ?? "",
  );
  const [imageFitMode, setImageFitMode] = useState<CardImageFitMode>(
    initialValues.imageFitMode ?? "cover",
  );
  const [imageFrameMode, setImageFrameMode] = useState<CardImageFrameMode>(
    initialValues.imageFrameMode ?? "none",
  );
  const [linkUrl, setLinkUrl] = useState(initialValues.linkUrl);
  const [bookIsbn, setBookIsbn] = useState("");
  const [bookLinkMessage, setBookLinkMessage] = useState("");
  const [previewFace, setPreviewFace] = useState<"front" | "back">("front");
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
  const [isDefaultImagesOpen, setIsDefaultImagesOpen] = useState(false);
  const [backMode, setBackMode] = useState<BackMemoMode>("edit");
  const [availableDecks, setAvailableDecks] = useState(deckOptions);
  const [isDecksResolved, setIsDecksResolved] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [aiAssistModal, setAiAssistModal] =
    useState<AiAssistModalState | null>(null);
  const isSavingRef = useRef(false);
  const hasResolvedPreviewPreferenceRef = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const selectedDeckName =
    availableDecks.find((deck) => deck.id === selectedDeckId)?.name ??
    "Deck";
  const hasSelectedImage = Boolean(imagePath.trim() || imageStoragePath.trim());
  const selectedDefaultImageLabel =
    DEFAULT_CARD_IMAGE_OPTIONS.find((option) => option.key === defaultImageKey)
      ?.label ?? "Paper";
  const selectedImageLabel = hasSelectedImage
    ? imageLabel || "選択中の画像"
    : selectedDefaultImageLabel;
  const formLayoutClass = isPreviewCollapsed
    ? "grid min-w-0 max-w-full gap-3 overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:mx-auto lg:w-full lg:max-w-[1240px] xl:grid-cols-[96px_minmax(0,1120px)] xl:items-start xl:justify-center"
    : "grid min-w-0 max-w-full gap-3 overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:mx-auto lg:w-full lg:max-w-[1440px] xl:grid-cols-[minmax(232px,288px)_minmax(0,1fr)] xl:items-start xl:justify-center";
  const editorColumnClass = "xl:col-start-2";
  const editorStackClass = `order-3 grid min-w-0 max-w-full gap-3 xl:order-1 xl:row-start-1 xl:w-full ${editorColumnClass}`;
  const appearanceColumnClass = isPreviewCollapsed
    ? "order-1 grid min-w-0 gap-3 rounded-[16px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_10px_28px_rgba(122,105,82,0.1)] sm:p-4 xl:sticky xl:top-4 xl:col-start-1 xl:row-span-1 xl:min-h-[152px] xl:content-start xl:justify-items-center xl:px-2"
    : "order-1 grid min-w-0 gap-3 rounded-[16px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_10px_28px_rgba(122,105,82,0.1)] sm:p-4 xl:sticky xl:top-4 xl:col-start-1 xl:row-span-1";
  const previewPanelClass = isPreviewCollapsed
    ? "grid gap-3 lg:justify-items-center"
    : "grid gap-3";
  const previewHeaderClass = isPreviewCollapsed
    ? "flex items-center justify-between gap-3 lg:flex-col lg:items-center lg:gap-2"
    : "flex items-center justify-between gap-3";
  const previewLabelClass = isPreviewCollapsed
    ? "text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380] lg:hidden"
    : "text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]";
  const previewToggleButtonClass = isPreviewCollapsed
    ? "rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-2 text-xs font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] lg:w-full lg:px-2 lg:leading-5"
    : "rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-2 text-xs font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]";
  const imageSettingsSectionClass = isPreviewCollapsed
    ? "grid gap-2 lg:hidden"
    : "grid gap-2";

  function requestPreviewFace(face: "front" | "back") {
    setPreviewFace(face);
  }

  const applyImageFile = useCallback(
    async (file: File, label: string) => {
      if (!isSignedIn) {
        alert(imageLoginMessage);
        return;
      }

      setImageErrorMessage("");

      try {
        const result = await compressImage(file);

        setImagePath(result.dataUrl);
        setImageStoragePath("");
        setImageLabel(label);
      } catch (error) {
        console.warn("Life Cards image compression failed", error);
        setImagePath("");
        setImageLabel("");
        setImageErrorMessage(
          "画像を準備できませんでした。別の写真を選んでください。",
        );
      }
    },
    [isSignedIn],
  );

  useEffect(() => {
    let isActive = true;

    try {
      const supabase = createSupabaseBrowserClient();

      getSupabaseSessionSafely(supabase).then((session) => {
        if (isActive) {
          setIsSignedIn(Boolean(session?.user));
          setIsAuthResolved(true);
        }
      }).catch(() => {
        if (isActive) {
          setIsSignedIn(false);
          setIsAuthResolved(true);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsSignedIn(Boolean(session?.user));
        setIsAuthResolved(true);
      });

      return () => {
        isActive = false;
        subscription.unsubscribe();
      };
    } catch {
      queueMicrotask(() => {
        if (isActive) {
          setIsSignedIn(false);
          setIsAuthResolved(true);
        }
      });
    }

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setIsPreviewCollapsed(
          window.localStorage.getItem(previewCollapsedStorageKey) === "true",
        );
      } catch {
        setIsPreviewCollapsed(false);
      } finally {
        hasResolvedPreviewPreferenceRef.current = true;
      }
    });
  }, []);

  useEffect(() => {
    if (!hasResolvedPreviewPreferenceRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(
        previewCollapsedStorageKey,
        String(isPreviewCollapsed),
      );
    } catch {
      // localStorage is a convenience only; the editor should keep working.
    }
  }, [isPreviewCollapsed]);

  useEffect(() => {
    let isActive = true;

    queueMicrotask(async () => {
      if (isActive) {
        setIsDecksResolved(false);
      }

      const repositoryDecks =
        await DeckRepository.getDecksForCurrentUser(deckOptions);

      if (isActive) {
        setAvailableDecks(repositoryDecks);
        setSelectedDeckId((currentDeckId) =>
          repositoryDecks.some((deck) => deck.id === currentDeckId)
            ? currentDeckId
            : (repositoryDecks[0]?.id ?? ""),
        );
        setIsDecksResolved(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, [deckOptions]);

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/"),
    );
    const file = imageItem?.getAsFile();

    if (file) {
      event.preventDefault();
      if (!isSignedIn) {
        alert(imageLoginMessage);
        return;
      }

      applyImageFile(file, "貼り付け画像");
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    label: string,
  ) {
    const file = event.target.files?.[0];

    if (file) {
      if (!isSignedIn) {
        alert(imageLoginMessage);
        event.target.value = "";
        return;
      }

      applyImageFile(file, label);
    }

    event.target.value = "";
  }

  async function handleCreateDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const deckName = String(formData.get("deckName") ?? "").trim();

    if (!deckName) {
      alert("デッキ名を入力してください。");
      return;
    }

    const nextDeck: Deck = {
      id: `deck_${Date.now()}`,
      name: deckName,
      isShared: false,
      createdAt: todayInputValue(),
      cardCount: 0,
    };
    const nextDecks = await DeckRepository.saveDeckForCurrentUser(nextDeck);

    setAvailableDecks(nextDecks);
    setSelectedDeckId(nextDeck.id);
    onDecksChange?.(nextDecks);
    setIsDeckModalOpen(false);
  }

  function handleImageAction(action: (typeof imageActions)[number]) {
    if (!isSignedIn) {
      alert(imageLoginMessage);
      return;
    }

    if (action.id === "photo") {
      photoInputRef.current?.click();
      return;
    }

    if (action.id === "camera") {
      cameraInputRef.current?.click();
      return;
    }
  }

  function insertBookCardTemplate() {
    setBackMode("edit");
    setPreviewFace("back");
    setBackText((currentBackText) => {
      const trimmedEnd = currentBackText.trimEnd();

      return trimmedEnd
        ? `${trimmedEnd}\n\n${bookCardBackMemoTemplate}`
        : bookCardBackMemoTemplate;
    });
  }

  function createAmazonLinkFromIsbn() {
    const sanitizedIsbn = sanitizeIsbnInput(bookIsbn);

    if (!sanitizedIsbn) {
      setBookLinkMessage("ISBNを入力してください。");
      return;
    }

    if (
      linkUrl.trim() &&
      !window.confirm("Link欄のURLをAmazonリンクで上書きしますか？")
    ) {
      setBookLinkMessage("既存のLinkを残しました。");
      return;
    }

    const isbnOrAsin = convertIsbn13ToIsbn10(sanitizedIsbn);

    setBookIsbn(sanitizedIsbn);
    setLinkUrl(`https://www.amazon.co.jp/dp/${isbnOrAsin}`);
    setBookLinkMessage("AmazonリンクをLink欄に入れました。");
  }

  async function copyAiAssistPrompt(
    prompt: string,
    successMessage: string,
  ) {
    try {
      await navigator.clipboard.writeText(prompt);
      setAiAssistModal({
        message: successMessage,
        title: "コピーしました",
      });
    } catch (error) {
      console.warn("Life Cards AI Assist copy failed", error);
      setAiAssistModal({
        message: "クリップボードへコピーできませんでした。",
        title: "コピーできませんでした",
      });
    }
  }

  function handleCopyImageToCardPrompt() {
    void copyAiAssistPrompt(
      createImageToCardPrompt(),
      "ChatGPTへ画像を添付して貼り付けてください",
    );
  }

  function handleCopyCardToImagePrompt() {
    void copyAiAssistPrompt(
      createCardToImagePrompt({
        backMemo: backText,
        comment: frontComment,
        front: frontText,
      }),
      "ChatGPTへ貼り付けて画像生成してください",
    );
  }

  function handleCopyLifeCardPrompt() {
    const markdownSource: Card = {
      id: "ai_assist_draft",
      backText,
      createdAt: cardDate,
      deckId: selectedDeckId,
      frontComment,
      frontText,
      linkUrl,
      updatedAt: todayInputValue(),
    };

    void copyAiAssistPrompt(
      createCopyForAiMarkdown(markdownSource, { deckLabel: selectedDeckName }),
      "Life Cardコピーをコピーしました。",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");
    setSaveErrorMessage("");

    if (!isAuthResolved) {
      setSaveErrorMessage("保存先を確認中です。少し待ってからもう一度お試しください。");
      setSaveStatus("error");
      isSavingRef.current = false;
      return;
    }

    if (!isDecksResolved) {
      setSaveErrorMessage("保存先のデッキを確認中です。少し待ってからもう一度お試しください。");
      setSaveStatus("error");
      isSavingRef.current = false;
      return;
    }

    const selectedDeck = availableDecks.find(
      (deck) => deck.id === selectedDeckId,
    );

    if (!selectedDeck) {
      setSaveErrorMessage("保存先のデッキを確認できませんでした。デッキを選び直してください。");
      setSaveStatus("error");
      isSavingRef.current = false;
      return;
    }

    const values: CardFormValues = {
      backText,
      cardDate,
      deckId: selectedDeckId,
      defaultImageKey,
      frontComment,
      frontText,
      imageFitMode,
      imageFrameMode,
      imagePath,
      imageStoragePath,
      linkUrl: linkUrl.trim(),
    };

    try {
      await onSubmit(values, {
        expectsCloudSave: isSignedIn,
      });
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
      setSaveErrorMessage("保存できませんでした。もう一度お試しください。");
      isSavingRef.current = false;
    }
  }

  const submitButtonLabel =
    saveStatus === "saving"
      ? "保存中..."
      : saveStatus === "success"
        ? "保存しました"
        : saveStatus === "error" && saveErrorMessage
          ? "保存できませんでした"
          : saveLabel;
  const isSaving = saveStatus === "saving";

  return (
    <>
      <form
        onPaste={handlePaste}
        onSubmit={handleSubmit}
        className={formLayoutClass}
      >
        <input type="hidden" name="deckId" value={selectedDeckId} />
        <input type="hidden" name="imageAction" value={imageLabel} />
        <input type="hidden" name="imageFitMode" value={imageFitMode} />
        <input type="hidden" name="imagePath" value={imagePath} />

        <div className={appearanceColumnClass}>
          <section className={previewPanelClass}>
            <div className={previewHeaderClass}>
              <span className={previewLabelClass}>Preview</span>
              <button
                type="button"
                onClick={() => setIsPreviewCollapsed((current) => !current)}
                className={previewToggleButtonClass}
              >
                {isPreviewCollapsed ? "▷ プレビュー" : "プレビューを隠す"}
              </button>
            </div>

            {!isPreviewCollapsed ? (
              <CardFormPreview
                backText={backText}
                cardDate={cardDate}
                defaultImageKey={defaultImageKey}
                frontComment={frontComment}
                frontText={frontText}
                imageFrameMode={imageFrameMode}
                imageFitMode={imageFitMode}
                imagePath={imagePath}
                linkUrl={linkUrl}
                onPreviewFaceChange={setPreviewFace}
                previewFace={previewFace}
                selectedDeckName={selectedDeckName}
              />
            ) : null}
          </section>

        <section className={imageSettingsSectionClass}>
          <div className="grid gap-2 rounded-[16px] border border-[#e8ddcb] bg-[#f8f0e3] px-3 py-2.5">
            {!isSignedIn ? (
              <p className="text-xs leading-5 text-[#7d705f]">
                {imageLoginMessage}
              </p>
            ) : null}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              disabled={!isSignedIn}
              className="hidden"
              onChange={(event) => handleFileChange(event, "写真")}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={!isSignedIn}
              className="hidden"
              onChange={(event) => handleFileChange(event, "カメラ")}
            />

            <div className="hidden flex-wrap gap-2 lg:flex">
              <button
                type="button"
                disabled={!isSignedIn}
                onClick={() => photoInputRef.current?.click()}
                className={`inline-flex min-h-11 w-fit items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:cursor-not-allowed disabled:border-[#e6ddcf] disabled:bg-[#f3eadc]/70 disabled:text-[#b0a392] ${
                  hasSelectedImage
                    ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                    : "border-[#e0d3c0] bg-white/72 text-[#5f5346] hover:bg-white"
                }`}
              >
                画像を選ぶ
              </button>
            </div>
            <p className="hidden text-xs font-semibold leading-5 text-[#7d705f] lg:block">
              スクショは Ctrl+V / ⌘V で貼り付けできます
            </p>

            <div className="grid grid-cols-2 gap-2 lg:hidden">
              {imageActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  aria-label={`${action.label}: ${action.description}`}
                  disabled={!isSignedIn}
                  onClick={() => handleImageAction(action)}
                  className={`grid min-h-14 rounded-[14px] border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:cursor-not-allowed disabled:border-[#e6ddcf] disabled:bg-[#f3eadc]/70 disabled:text-[#b0a392] ${
                    imageLabel === action.label
                      ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                      : "border-[#e0d3c0] bg-white/72 text-[#5f5346] hover:bg-white"
                  }`}
                >
                  <span className="text-sm font-semibold leading-5">
                    {action.label}
                  </span>
                  <span
                    className={`text-xs leading-5 ${
                      imageLabel === action.label
                        ? "text-[#fffaf0]/78"
                        : "text-[#8d7f6e]"
                    }`}
                  >
                    {action.description}
                  </span>
                </button>
              ))}
            </div>
            {imageErrorMessage ? (
              <p className="text-xs font-semibold leading-5 text-[#a24d3c]">
                {imageErrorMessage}
              </p>
            ) : null}
            <div className="grid gap-2 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a19380]">
                画像表示
              </span>
              <div className="grid grid-cols-2 overflow-hidden rounded-full border border-[#e0d3c0] bg-white/52 p-1">
                {imageFitModeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={imageFitMode === option.id}
                    onClick={() => setImageFitMode(option.id)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] ${
                      imageFitMode === option.id
                        ? "bg-[#2f2a23] text-[#fffaf0] shadow-sm"
                        : "text-[#6f6253] hover:bg-white/78"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {imageFitMode === "blurExtend" ? (
                <div className="grid gap-2 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a19380]">
                    台紙
                  </span>
                  <div className="grid grid-cols-2 overflow-hidden rounded-full border border-[#e0d3c0] bg-white/52 p-1">
                    {blurExtendPaperModeOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={imageFrameMode === option.id}
                        onClick={() => setImageFrameMode(option.id)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] ${
                          imageFrameMode === option.id
                            ? "bg-[#2f2a23] text-[#fffaf0] shadow-sm"
                            : "text-[#6f6253] hover:bg-white/78"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="grid gap-2 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a19380]">
                    現在の画像
                  </span>
                  <span className="block truncate text-sm font-semibold text-[#4f4438]">
                    {selectedImageLabel}
                  </span>
                </div>
                {!hasSelectedImage ? (
                  <button
                    type="button"
                    onClick={() =>
                      setIsDefaultImagesOpen((current) => !current)
                    }
                    className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-2 text-xs font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
                  >
                    {isDefaultImagesOpen ? "画像一覧を閉じる" : "画像を変更"}
                  </button>
                ) : null}
              </div>
              {!hasSelectedImage && isDefaultImagesOpen ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {DEFAULT_CARD_IMAGE_OPTIONS.map((option) => {
                    const isSelected = defaultImageKey === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setDefaultImageKey(option.key)}
                        className={`rounded-[14px] border p-2 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] ${
                          isSelected
                            ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                            : "border-[#e0d3c0] bg-white/60 text-[#7d705f] hover:bg-white"
                        }`}
                      >
                        <span
                          className="mb-2 block aspect-[4/3] rounded-[10px] border border-white/45 bg-cover bg-center"
                          style={{ backgroundImage: `url(${option.path})` }}
                          aria-hidden="true"
                        />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </section>
        </div>

        <div className={editorStackClass}>
          <section className="grid min-w-0 gap-3 rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_14px_38px_rgba(122,105,82,0.13)] sm:p-5">
            {saveErrorMessage ? (
              <p className="rounded-[14px] border border-[#e7b8a9] bg-[#fff2ee] px-4 py-3 text-sm font-semibold text-[#a24d3c]">
                {saveErrorMessage}
              </p>
            ) : null}

            <label className="block min-w-0">
              <input
                name="frontText"
                value={frontText}
                onChange={(event) => setFrontText(event.target.value)}
                onFocus={() => requestPreviewFace("front")}
                placeholder="表面タイトル"
                className="box-border block w-full min-w-0 max-w-full rounded-[16px] border border-[#eadfce] bg-white/72 px-4 py-3 text-base font-semibold leading-6 text-[#332d25] shadow-inner shadow-[#d9cdbb]/30 outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
              />
            </label>

            <label className="block min-w-0">
              <textarea
                name="frontComment"
                value={frontComment}
                onChange={(event) => setFrontComment(event.target.value)}
                onFocus={() => requestPreviewFace("front")}
                rows={2}
                placeholder="表面に添える数行コメント"
                className="box-border block w-full min-w-0 max-w-full resize-none rounded-[16px] border border-[#eadfce] bg-white/72 px-4 py-3 text-base leading-6 text-[#332d25] shadow-inner shadow-[#d9cdbb]/30 outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
              />
            </label>
          </section>

          <section className="grid min-w-0 gap-3 rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_14px_38px_rgba(122,105,82,0.13)] sm:p-4">
            <BackMemoEditor
              backMode={backMode}
              backText={backText}
              onBackModeChange={setBackMode}
              onBackTextChange={setBackText}
              onFocus={() => requestPreviewFace("back")}
            />

            <details className="group min-w-0 rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3]/72 px-3 py-2.5 shadow-inner shadow-[#d9cdbb]/10 sm:px-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380] marker:hidden [&::-webkit-details-marker]:hidden">
                <span>AI Assist</span>
                <span className="rounded-full border border-[#e0d3c0] bg-[#fffaf0]/82 px-3 py-1.5 text-[11px] normal-case tracking-normal text-[#6f6253] transition group-open:bg-[#2f2a23] group-open:text-[#fffaf0]">
                  <span className="group-open:hidden">開く</span>
                  <span className="hidden group-open:inline">閉じる</span>
                </span>
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleCopyImageToCardPrompt}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/82 px-4 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
                >
                  画像からカード化
                </button>
                <button
                  type="button"
                  onClick={handleCopyCardToImagePrompt}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/82 px-4 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
                >
                  カードから画像化
                </button>
                <button
                  type="button"
                  onClick={handleCopyLifeCardPrompt}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#e0d3c0] bg-[#fffaf0]/82 px-4 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
                >
                  Life Cardコピー
                </button>
              </div>
            </details>

            <details className="group min-w-0 rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3]/72 px-3 py-2.5 shadow-inner shadow-[#d9cdbb]/10 sm:px-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380] marker:hidden [&::-webkit-details-marker]:hidden">
                <span>詳細設定</span>
                <span className="rounded-full border border-[#e0d3c0] bg-[#fffaf0]/82 px-3 py-1.5 text-[11px] normal-case tracking-normal text-[#6f6253] transition group-open:bg-[#2f2a23] group-open:text-[#fffaf0]">
                  <span className="group-open:hidden">開く</span>
                  <span className="hidden group-open:inline">閉じる</span>
                </span>
              </summary>

              <div className="mt-3 grid min-w-0 gap-3">
                <section className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <select
                      name="deckId"
                      aria-label="Deck"
                      value={selectedDeckId}
                      onChange={(event) =>
                        setSelectedDeckId(event.target.value)
                      }
                      className="box-border block w-full min-w-0 max-w-full rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-base font-semibold text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
                    >
                      {availableDecks.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsDeckModalOpen(true)}
                      className="rounded-full border border-[#e0d3c0] bg-white/72 px-4 py-3 text-sm font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#e8ddcb]"
                    >
                      ＋
                    </button>
                  </div>

                  <input
                    type="date"
                    name="createdAt"
                    aria-label="Date"
                    value={cardDate}
                    onChange={(event) => setCardDate(event.target.value)}
                    className="box-border block w-full min-w-0 max-w-full appearance-none rounded-[14px] border border-[#e8ddcb] bg-white/72 px-4 py-3 text-base font-semibold text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
                  />
                </section>

                <label className="block min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                    Link
                  </span>
                  <input
                    type="url"
                    name="linkUrl"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://example.com"
                    className="mt-2 box-border block w-full min-w-0 max-w-full rounded-[14px] border border-[#e0d3c0] bg-white/72 px-3 py-2.5 text-base leading-6 text-[#332d25] outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
                  />
                </label>

                <div className="grid gap-2 rounded-[14px] border border-[#e8ddcb] bg-[#fffaf0]/72 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold leading-5 text-[#7d705f]">
                      推薦本・読書メモをLife Card化
                    </span>
                    <button
                      type="button"
                      onClick={insertBookCardTemplate}
                      className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-2 text-xs font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
                    >
                      本カード
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      type="text"
                      inputMode="text"
                      value={bookIsbn}
                      onChange={(event) => {
                        setBookIsbn(event.target.value);
                        setBookLinkMessage("");
                      }}
                      placeholder="ISBN / 978-4023308398"
                      aria-label="ISBN"
                      className="box-border block w-full min-w-0 max-w-full rounded-[14px] border border-[#e0d3c0] bg-white/72 px-3 py-2 text-sm font-semibold text-[#332d25] outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
                    />
                    <button
                      type="button"
                      onClick={createAmazonLinkFromIsbn}
                      className="rounded-full border border-[#e0d3c0] bg-white/72 px-3 py-2 text-xs font-semibold text-[#5f5346] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
                    >
                      Amazonリンクを作成
                    </button>
                  </div>
                  {bookLinkMessage ? (
                    <p className="text-xs font-semibold leading-5 text-[#7d705f]">
                      {bookLinkMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </details>

            <div className="mt-2 grid gap-3 border-t border-[#eadfce] pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              {isSaving ? (
                <p className="text-xs font-semibold text-[#8d7f6e]">
                  保存しています。少しお待ちください。
                </p>
              ) : (
                <span aria-hidden="true" className="hidden sm:block" />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {onCancel ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#e0d3c0] bg-white/72 px-6 py-3 text-sm font-semibold text-[#7d705f] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#fffaf0] sm:w-auto"
                  >
                    閉じる
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={
                    !isAuthResolved ||
                    !isDecksResolved ||
                    isSaving ||
                    saveStatus === "success"
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2f2a23] px-6 py-3 text-sm font-semibold text-[#fffaf0] shadow-[0_10px_24px_rgba(87,72,52,0.16)] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#fffaf0] disabled:cursor-not-allowed disabled:bg-[#8d7f6e] disabled:shadow-none sm:w-auto sm:justify-self-start"
                >
                  {isSaving ? (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 rounded-full border-2 border-[#fffaf0]/45 border-t-[#fffaf0] motion-safe:animate-spin"
                    />
                  ) : null}
                  {submitButtonLabel}
                </button>
              </div>
              <MobileDesktopHint isVisible={isAuthResolved && isSignedIn} />
            </div>
          </section>
        </div>
      </form>

      {isDeckModalOpen ? (
        <DeckCreateModal
          onClose={() => setIsDeckModalOpen(false)}
          onSubmit={handleCreateDeck}
        />
      ) : null}

      {aiAssistModal ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[80] grid place-items-center bg-[#17110d]/46 px-4 backdrop-blur-sm"
          onClick={() => setAiAssistModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-assist-dialog-title"
            className="w-full max-w-sm rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0] p-5 text-[#332d25] shadow-[0_28px_80px_rgba(87,72,52,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="ai-assist-dialog-title"
              className="text-base font-bold tracking-tight"
            >
              {aiAssistModal.title}
            </h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#6f6253]">
              {aiAssistModal.message}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setAiAssistModal(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#2f2a23] px-5 py-3 text-sm font-semibold text-[#fffaf0] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#fffaf0]"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
