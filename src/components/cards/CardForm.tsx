"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, FormEvent } from "react";

import { DeckRepository } from "@/lib/deckRepository";
import { compressImage } from "@/lib/imageCompression";
import {
  createSupabaseBrowserClient,
  getSupabaseSessionSafely,
} from "@/lib/supabase/client";
import type {
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
  const [previewFace, setPreviewFace] = useState<"front" | "back">("front");
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
  const isSavingRef = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const selectedDeckName =
    availableDecks.find((deck) => deck.id === selectedDeckId)?.name ??
    "Deck";
  const hasSelectedImage = Boolean(imagePath.trim() || imageStoragePath.trim());

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
        className="grid min-w-0 gap-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:grid-cols-[minmax(280px,0.42fr)_minmax(0,0.58fr)] lg:items-start"
      >
        <input type="hidden" name="deckId" value={selectedDeckId} />
        <input type="hidden" name="imageAction" value={imageLabel} />
        <input type="hidden" name="imageFitMode" value={imageFitMode} />
        <input type="hidden" name="imagePath" value={imagePath} />

        <section className="order-1 grid min-w-0 gap-4 rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_18px_52px_rgba(122,105,82,0.16)] sm:p-5 lg:order-2 lg:col-start-2">
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
              rows={3}
              placeholder="表面に添える数行コメント"
              className="box-border block w-full min-w-0 max-w-full resize-none rounded-[16px] border border-[#eadfce] bg-white/72 px-4 py-3 text-base leading-6 text-[#332d25] shadow-inner shadow-[#d9cdbb]/30 outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
            />
          </label>
        </section>

        <div className="order-2 lg:order-1 lg:row-span-3 lg:row-start-1">
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
        </div>

        <section className="order-3 rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_18px_52px_rgba(122,105,82,0.16)] sm:p-5 lg:col-start-2">
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
            {!hasSelectedImage ? (
              <div className="grid gap-2 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a19380]">
                  default画像
                </span>
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
              </div>
            ) : null}
          </div>
        </section>

        <section className="order-4 grid min-w-0 gap-4 rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_18px_52px_rgba(122,105,82,0.16)] sm:p-5 lg:col-start-2">
          <section className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
              <select
                name="deckId"
                aria-label="Deck"
                value={selectedDeckId}
                onChange={(event) => setSelectedDeckId(event.target.value)}
                className="box-border block w-full min-w-0 max-w-full rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3] px-4 py-3 text-base font-semibold text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
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
              className="box-border block w-full min-w-0 max-w-full appearance-none rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3] px-4 py-3 text-base font-semibold text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
            />
          </section>

          <BackMemoEditor
            backMode={backMode}
            backText={backText}
            onBackModeChange={setBackMode}
            onBackTextChange={setBackText}
            onFocus={() => requestPreviewFace("back")}
          />

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
              className="mt-2 box-border block w-full min-w-0 max-w-full rounded-[16px] border border-[#eadfce] bg-white/72 px-4 py-3 text-base leading-6 text-[#332d25] shadow-inner shadow-[#d9cdbb]/30 outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
            />
          </label>

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
      </form>

      {isDeckModalOpen ? (
        <DeckCreateModal
          onClose={() => setIsDeckModalOpen(false)}
          onSubmit={handleCreateDeck}
        />
      ) : null}
    </>
  );
}
