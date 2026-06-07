const actionButtonBaseClass =
  "flex h-11 w-11 items-center justify-center rounded-full border text-base font-semibold shadow-[0_4px_12px_rgba(87,72,52,0.08)] backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:opacity-35 sm:h-14 sm:w-14 sm:text-lg";
const actionButtonClass =
  `${actionButtonBaseClass} border-[#e0d3c0] bg-white/70 text-[#6f6253] hover:bg-white`;
const deleteActionButtonClass =
  `${actionButtonBaseClass} border-[#e6c9be] bg-[#fff4ef]/84 text-[#9b4b35] hover:bg-white`;
const actionBarClass =
  "mb-[env(safe-area-inset-bottom)] flex w-full max-w-[min(390px,calc(100vw-2rem))] flex-wrap items-center justify-center gap-1.5 rounded-[22px] border border-[#e0d3c0] bg-[#fffaf0]/50 p-2 shadow-[0_12px_34px_rgba(87,72,52,0.1)] backdrop-blur-md sm:max-w-[460px] sm:gap-2";
const photoActionBarClass =
  "mb-[env(safe-area-inset-bottom)] flex w-full max-w-[min(520px,calc(100vw-2rem))] flex-wrap items-center justify-center gap-1.5 rounded-[22px] border border-[#e0d3c0] bg-[#fffaf0]/50 p-2 shadow-[0_12px_34px_rgba(87,72,52,0.1)] backdrop-blur-md sm:gap-2";

type Props = {
  hasMultipleCards: boolean;
  isPhotoMode: boolean;
  photoZoom: number;
  zoomLabel: string;
  onClose: () => void;
  onDecreasePhotoZoom: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onIncreasePhotoZoom: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onResetPhotoZoom: () => void;
  onShare: () => void;
};

export default function CardDetailActionBar({
  hasMultipleCards,
  isPhotoMode,
  photoZoom,
  zoomLabel,
  onClose,
  onDecreasePhotoZoom,
  onDelete,
  onEdit,
  onIncreasePhotoZoom,
  onNext,
  onPrevious,
  onResetPhotoZoom,
  onShare,
}: Props) {
  return (
    <section className={isPhotoMode ? photoActionBarClass : actionBarClass}>
      {isPhotoMode ? (
        <>
          <button
            type="button"
            aria-label="前へ"
            onClick={onPrevious}
            disabled={!hasMultipleCards}
            className={actionButtonClass}
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="縮小"
            onClick={onDecreasePhotoZoom}
            disabled={photoZoom <= 1}
            className={actionButtonClass}
          >
            −
          </button>
          <button
            type="button"
            aria-label="倍率をリセット"
            onClick={onResetPhotoZoom}
            className="flex h-12 min-w-14 items-center justify-center rounded-full border border-[#e0d3c0] bg-white/45 px-3 text-sm font-semibold text-[#6f6253] shadow-[0_4px_12px_rgba(87,72,52,0.06)] backdrop-blur transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] sm:h-14 sm:min-w-16"
          >
            {zoomLabel}
          </button>
          <button
            type="button"
            aria-label="拡大"
            onClick={onIncreasePhotoZoom}
            disabled={photoZoom >= 3}
            className={actionButtonClass}
          >
            ＋
          </button>
          <button
            type="button"
            aria-label="次へ"
            onClick={onNext}
            disabled={!hasMultipleCards}
            className={actionButtonClass}
          >
            ▶
          </button>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className={actionButtonClass}
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            aria-label="前へ"
            onClick={onPrevious}
            disabled={!hasMultipleCards}
            className={actionButtonClass}
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="次へ"
            onClick={onNext}
            disabled={!hasMultipleCards}
            className={actionButtonClass}
          >
            ▶
          </button>
          <button
            type="button"
            aria-label="QR共有"
            onClick={onShare}
            className={actionButtonClass}
          >
            QR
          </button>
          <button
            type="button"
            aria-label="編集"
            onClick={onEdit}
            className={actionButtonClass}
          >
            ✎
          </button>
          <button
            type="button"
            aria-label="削除"
            onClick={onDelete}
            className={deleteActionButtonClass}
          >
            削
          </button>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className={actionButtonClass}
          >
            ✕
          </button>
        </>
      )}
    </section>
  );
}
