"use client";

import type { Card, Deck } from "@/lib/types";

import CardDetailModal from "./CardDetailModal";
import CardEditDialog from "./CardEditDialog";
import CardShareDialog from "./CardShareDialog";
import type { CardDetailViewMode } from "./useCardDetailViewCycle";

type Props = {
  canGoNextFullscreenImage: boolean;
  card: Card | null;
  currentCardsForEdit: Card[];
  deckLabel: string;
  decks: Deck[];
  hasMultipleCards: boolean;
  initialViewMode: CardDetailViewMode;
  index: number | null;
  isEditing: boolean;
  isFavorite: boolean;
  isSharing: boolean;
  onBackdropClick: () => void;
  onDecksChange?: (decks: Deck[]) => void;
  onDelete: (card: Card) => void;
  onDetailClose: () => void;
  onEdit: () => void;
  onEditClose: () => void;
  onNext: () => void;
  onNextFullscreenImage?: (
    currentCardId: string,
  ) => Promise<{ cardId: string; imageUrl: string } | null>;
  onPrevious: () => void;
  onSaved?: (card: Card) => void;
  onShare: () => void;
  onShareClose: () => void;
  onToggleFavorite: () => void;
  onTouchEnd: (touchEndX: number, touchEndY: number) => void;
  onTouchStart: (touchStartX: number, touchStartY: number) => void;
};

export default function CardGridDialogs({
  canGoNextFullscreenImage,
  card,
  currentCardsForEdit,
  deckLabel,
  decks,
  hasMultipleCards,
  initialViewMode,
  index,
  isEditing,
  isFavorite,
  isSharing,
  onBackdropClick,
  onDecksChange,
  onDelete,
  onDetailClose,
  onEdit,
  onEditClose,
  onNext,
  onNextFullscreenImage,
  onPrevious,
  onSaved,
  onShare,
  onShareClose,
  onToggleFavorite,
  onTouchEnd,
  onTouchStart,
}: Props) {
  if (!card || index === null) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#3b3126]/45 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5 backdrop-blur-md sm:px-6 sm:py-6"
      onTouchStart={(event) =>
        onTouchStart(
          event.changedTouches[0].clientX,
          event.changedTouches[0].clientY,
        )
      }
      onTouchEnd={(event) =>
        onTouchEnd(
          event.changedTouches[0].clientX,
          event.changedTouches[0].clientY,
        )
      }
    >
      <button
        type="button"
        aria-label="Close card preview"
        className="fixed inset-0 z-0 cursor-default"
        onClick={onBackdropClick}
      />

      <div className="relative z-10 mx-auto flex min-h-full max-w-6xl items-center">
        <div className="relative w-full">
          {isEditing ? (
            <CardEditDialog
              card={card}
              currentCards={currentCardsForEdit}
              decks={decks}
              onClose={onEditClose}
              onDecksChange={onDecksChange}
              onSaved={onSaved}
            />
          ) : (
            <CardDetailModal
              card={card}
              canGoNextFullscreenImage={canGoNextFullscreenImage}
              deckLabel={deckLabel}
              index={index}
              initialViewMode={initialViewMode}
              isFavorite={isFavorite}
              hasMultipleCards={hasMultipleCards}
              onClose={onDetailClose}
              onDelete={() => onDelete(card)}
              onEdit={onEdit}
              onNext={onNext}
              onNextFullscreenImage={onNextFullscreenImage}
              onPrevious={onPrevious}
              onShare={onShare}
              onToggleFavorite={onToggleFavorite}
            />
          )}
        </div>
      </div>

      {isSharing ? (
        <CardShareDialog
          card={card}
          deckLabel={deckLabel}
          onClose={onShareClose}
        />
      ) : null}
    </div>
  );
}
