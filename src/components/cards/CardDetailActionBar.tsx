const actionButtonBaseClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold shadow-[0_4px_12px_rgba(87,72,52,0.08)] backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:opacity-35 sm:h-14 sm:w-14 sm:text-lg";
const actionButtonClass =
  `${actionButtonBaseClass} border-[#e0d3c0] bg-white/70 text-[#6f6253] hover:bg-white`;
const copyForAiActionButtonClass =
  `${actionButtonBaseClass} border-[#d9c9b2] bg-white/70 text-[#6f6253] hover:bg-white`;
const favoriteActionButtonBaseClass =
  `${actionButtonBaseClass} text-lg leading-none sm:text-xl`;
const favoriteActionButtonActiveClass =
  `${favoriteActionButtonBaseClass} border-[#d8c8aa]/55 bg-[#fff2c8]/84 text-[#8a6f24] hover:bg-[#fff0b5]/92 hover:text-[#765d19]`;
const favoriteActionButtonInactiveClass =
  `${favoriteActionButtonBaseClass} border-[#e0d3c0] bg-white/70 text-[#8f806d] hover:bg-white hover:text-[#756750]`;
const deleteActionButtonClass =
  `${actionButtonBaseClass} border-[#e6c9be] bg-[#fff4ef]/84 text-[#9b4b35] hover:bg-white`;
const actionBarBaseClass =
  "mb-[env(safe-area-inset-bottom)] flex w-full max-w-[min(390px,calc(100vw-1rem))] flex-nowrap items-center justify-center gap-1 rounded-[22px] border p-1.5 backdrop-blur-md sm:max-w-[460px] sm:gap-2 sm:p-2";
const actionBarToneClass =
  "border-[#e0d3c0] bg-[#fffaf0]/50 shadow-[0_12px_34px_rgba(87,72,52,0.1)]";
const actionBarReadingToneClass =
  "border-[#e0d3c0]/45 bg-[#fffaf0]/34 shadow-[0_6px_18px_rgba(87,72,52,0.055)]";

type IconProps = {
  className?: string;
};

function XIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PencilIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function QrCodeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="5" width="5" x="3" y="3" />
      <rect height="5" width="5" x="16" y="3" />
      <rect height="5" width="5" x="3" y="16" />
      <path d="M16 16h.01" />
      <path d="M21 16h-2v3" />
      <path d="M16 21v-2h3" />
      <path d="M21 21h.01" />
    </svg>
  );
}

function ImageIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </svg>
  );
}

function TrashIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 20H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

type Props = {
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onCopyForAi?: () => void;
  onOpenPhoto: () => void;
  onShare: () => void;
  copyForAiStatus?: "copied" | "failed" | "idle" | "working";
  hasImage: boolean;
  isFavorite: boolean;
  isSubdued?: boolean;
  showCopyForAi?: boolean;
};

export default function CardDetailActionBar({
  onClose,
  onDelete,
  onEdit,
  onToggleFavorite,
  onCopyForAi,
  onOpenPhoto,
  onShare,
  copyForAiStatus = "idle",
  hasImage,
  isFavorite,
  isSubdued = false,
  showCopyForAi = false,
}: Props) {
  const favoriteActionButtonClass = isFavorite
    ? favoriteActionButtonActiveClass
    : favoriteActionButtonInactiveClass;

  return (
    <section
      className={`${actionBarBaseClass} ${
        isSubdued ? actionBarReadingToneClass : actionBarToneClass
      }`}
    >
      <button
        type="button"
        aria-label="QR共有"
        onClick={onShare}
        className={actionButtonClass}
      >
        <QrCodeIcon />
      </button>
      {showCopyForAi ? (
        <button
          type="button"
          aria-label="AIに渡す文章をコピー"
          title="AIに渡す文章をコピー"
          onClick={onCopyForAi}
          disabled={copyForAiStatus === "working"}
          className={copyForAiActionButtonClass}
        >
          AI
        </button>
      ) : null}
      <button
        type="button"
        aria-label="編集"
        onClick={onEdit}
        className={actionButtonClass}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        aria-label="画像を開く"
        onClick={onOpenPhoto}
        disabled={!hasImage}
        className={actionButtonClass}
      >
        <ImageIcon />
      </button>
      <button
        type="button"
        aria-label={isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
        aria-pressed={isFavorite}
        onClick={onToggleFavorite}
        className={favoriteActionButtonClass}
      >
        {isFavorite ? "★" : "☆"}
      </button>
      <button
        type="button"
        aria-label="削除"
        onClick={onDelete}
        className={deleteActionButtonClass}
      >
        <TrashIcon />
      </button>
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className={actionButtonClass}
      >
        <XIcon />
      </button>
    </section>
  );
}
