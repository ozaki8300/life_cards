"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { DeckRepository } from "@/lib/deckRepository";
import { cardSaveErrorMessage } from "@/lib/cardSaveErrors";
import { compressImage } from "@/lib/imageCompression";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CardImageFitMode, Deck } from "@/lib/types";

import BackMemoEditor from "./BackMemoEditor";
import CardFormPreview from "./CardFormPreview";
import DeckCreateModal from "./DeckCreateModal";
import {
  type BackMemoMode,
  imageActions,
  normalizeDateInputValue,
  todayInputValue,
} from "./cardFormUtils";

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

export type CardFormValues = {
  backText: string;
  cardDate: string;
  deckId: string;
  frontComment: string;
  frontText: string;
  imageFitMode?: CardImageFitMode;
  imagePath: string;
  linkUrl: string;
};

export type CardFormSubmitContext = {
  expectsCloudSave: boolean;
};

type Props = {
  cardId: string;
  deckOptions: Deck[];
  initialValues: CardFormValues;
  mode: "new" | "edit";
  onCancel?: () => void;
  onSubmit: (
    values: CardFormValues,
    context: CardFormSubmitContext,
  ) => Promise<void> | void;
  saveLabel?: string;
};

export default function CardForm({
  cardId,
  deckOptions,
  initialValues,
  onCancel,
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
  const [imageLabel, setImageLabel] = useState("");
  const [imageErrorMessage, setImageErrorMessage] = useState("");
  const [imagePath, setImagePath] = useState(initialValues.imagePath);
  const [imageFitMode, setImageFitMode] = useState<CardImageFitMode>(
    initialValues.imageFitMode ?? "cover",
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const selectedDeckName =
    availableDecks.find((deck) => deck.id === selectedDeckId)?.name ??
    "Deck";

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
      console.warn("Life Cards image selected", {
        label,
        size: file.size,
        type: file.type || "unknown",
      });

      try {
        const result = await compressImage(file);

        console.warn("Life Cards image compressed", {
          blobSize: result.blob.size,
          compressedSize: result.compressedSize,
          contentType: result.blob.type || "unknown",
          height: result.height,
          label,
          originalSize: result.originalSize,
          type: result.blob.type || "unknown",
          width: result.width,
        });
        setImagePath(result.dataUrl);
        setImageLabel(label);
      } catch (error) {
        console.warn("Life Cards image compression failed", error);
        setImagePath("");
        setImageLabel("");
        setImageErrorMessage(
          "画像を圧縮できませんでした。別の写真を選んでください。",
        );
      }
    },
    [isSignedIn],
  );

  useEffect(() => {
    let isActive = true;

    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getSession().then(({ data }) => {
        if (isActive) {
          setIsSignedIn(Boolean(data.session?.user));
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

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) =>
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

    window.addEventListener("paste", handlePaste);

    return () => window.removeEventListener("paste", handlePaste);
  }, [applyImageFile, isSignedIn]);

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

    if (action.id === "screenshot") {
      screenshotInputRef.current?.click();
      return;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveErrorMessage("");

    if (!isAuthResolved) {
      setSaveErrorMessage("保存先を確認中です。少し待ってからもう一度お試しください。");
      return;
    }

    if (!isDecksResolved) {
      setSaveErrorMessage("保存先のデッキを確認中です。少し待ってからもう一度お試しください。");
      return;
    }

    const selectedDeck = availableDecks.find(
      (deck) => deck.id === selectedDeckId,
    );

    if (!selectedDeck) {
      setSaveErrorMessage("保存先のデッキを確認できませんでした。デッキを選び直してください。");
      return;
    }

    const values: CardFormValues = {
      backText,
      cardDate,
      deckId: selectedDeckId,
      frontComment,
      frontText,
      imageFitMode,
      imagePath,
      linkUrl: linkUrl.trim(),
    };

    console.log("Life Cards form submit values", {
      cardId,
      deckId: values.deckId,
      deckName: selectedDeck.name,
      imageFitMode: values.imageFitMode,
    });

    try {
      await onSubmit(values, {
        expectsCloudSave: isSignedIn,
      });
    } catch (error) {
      console.warn("Life Cards form save failed", error);
      setSaveErrorMessage(cardSaveErrorMessage(error));
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="grid min-w-0 gap-5 pb-[calc(env(safe-area-inset-bottom)+7rem)] lg:grid-cols-[minmax(280px,0.42fr)_minmax(0,0.58fr)] lg:items-start"
      >
        <input type="hidden" name="deckId" value={selectedDeckId} />
        <input type="hidden" name="imageAction" value={imageLabel} />
        <input type="hidden" name="imageFitMode" value={imageFitMode} />
        <input type="hidden" name="imagePath" value={imagePath} />

        <CardFormPreview
          backText={backText}
          cardDate={cardDate}
          cardId={cardId}
          frontComment={frontComment}
          frontText={frontText}
          imageFitMode={imageFitMode}
          imagePath={imagePath}
          linkUrl={linkUrl}
          onPreviewFaceChange={setPreviewFace}
          previewFace={previewFace}
          selectedDeckName={selectedDeckName}
        />

        <section className="grid min-w-0 gap-4 rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-4 shadow-[0_18px_52px_rgba(122,105,82,0.16)] sm:p-5">
          {saveErrorMessage ? (
            <p className="rounded-[14px] border border-[#e7b8a9] bg-[#fff2ee] px-4 py-3 text-sm font-semibold text-[#a24d3c]">
              {saveErrorMessage}
            </p>
          ) : null}

          <section className="rounded-[16px] border border-[#e8ddcb] bg-[#f8f0e3] px-3 py-2.5">
            <div className="grid gap-2">
              <p className="text-xs font-semibold text-[#8d7f6e]">
                {!isAuthResolved || !isDecksResolved
                  ? "保存先を確認中"
                  : isSignedIn
                    ? "クラウド同期中"
                    : "この端末にテキスト保存中"}
              </p>
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
              <input
                ref={screenshotInputRef}
                type="file"
                accept="image/*"
                disabled={!isSignedIn}
                className="hidden"
                onChange={(event) => handleFileChange(event, "スクショ")}
              />

              <div className="flex flex-wrap gap-2">
                {imageActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={!isSignedIn}
                    onClick={() => handleImageAction(action)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:cursor-not-allowed disabled:border-[#e6ddcf] disabled:bg-[#f3eadc]/70 disabled:text-[#b0a392] ${
                      imageLabel === action.label
                        ? "border-[#2f2a23] bg-[#2f2a23] text-[#fffaf0]"
                        : "border-[#e0d3c0] bg-white/72 text-[#5f5346] hover:bg-white"
                    }`}
                  >
                    {action.label}
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
              </div>
            </div>
          </section>

          <section className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
              <select
                name="deckId"
                aria-label="Deck"
                value={selectedDeckId}
                onChange={(event) => setSelectedDeckId(event.target.value)}
                className="box-border block w-full min-w-0 max-w-full rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3] px-4 py-3 text-sm font-semibold text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
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
              className="box-border block w-full min-w-0 max-w-full appearance-none rounded-[14px] border border-[#e8ddcb] bg-[#f8f0e3] px-4 py-3 text-sm font-semibold text-[#332d25] outline-none focus:ring-2 focus:ring-[#e8ddcb]"
            />
          </section>

          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
              表面タイトル
            </span>
            <input
              name="frontText"
              value={frontText}
              onChange={(event) => setFrontText(event.target.value)}
              onFocus={() => requestPreviewFace("front")}
              placeholder="表面タイトル"
              className="mt-2 box-border block w-full min-w-0 max-w-full rounded-[16px] border border-[#eadfce] bg-white/72 px-4 py-3 text-base font-semibold leading-6 text-[#332d25] shadow-inner shadow-[#d9cdbb]/30 outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
            />
          </label>

          <label className="block min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
              表面コメント
            </span>
            <textarea
              name="frontComment"
              value={frontComment}
              onChange={(event) => setFrontComment(event.target.value)}
              onFocus={() => requestPreviewFace("front")}
              rows={3}
              placeholder="表面に添える数行コメント"
              className="mt-2 box-border block w-full min-w-0 max-w-full resize-none rounded-[16px] border border-[#eadfce] bg-white/72 px-4 py-3 text-sm leading-6 text-[#332d25] shadow-inner shadow-[#d9cdbb]/30 outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
            />
          </label>

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
              className="mt-2 box-border block w-full min-w-0 max-w-full rounded-[16px] border border-[#eadfce] bg-white/72 px-4 py-3 text-sm leading-6 text-[#332d25] shadow-inner shadow-[#d9cdbb]/30 outline-none placeholder:text-[#9d917f] focus:border-[#cdbda6] focus:ring-2 focus:ring-[#e8ddcb]"
            />
          </label>

          <div className="sticky bottom-[env(safe-area-inset-bottom)] z-10 -mx-4 -mb-4 grid gap-2 border-t border-[#eadfce] bg-[#fffaf0]/92 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur sm:-mx-5 sm:-mb-5 sm:bottom-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 sm:pb-4">
            <button
              type="submit"
              disabled={!isAuthResolved || !isDecksResolved}
              className="rounded-full bg-[#2f2a23] px-6 py-3 text-sm font-semibold text-[#fffaf0] shadow-lg shadow-[#d5cab8] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#fffaf0] disabled:cursor-not-allowed disabled:bg-[#8d7f6e] disabled:shadow-none"
            >
              {saveLabel}
            </button>
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-[#e0d3c0] bg-white/72 px-6 py-3 text-sm font-semibold text-[#7d705f] transition hover:bg-white"
              >
                閉じる
              </button>
            ) : null}
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
