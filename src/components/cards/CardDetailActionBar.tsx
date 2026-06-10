const actionButtonBaseClass =
  "flex h-11 w-11 items-center justify-center rounded-full border text-base font-semibold shadow-[0_4px_12px_rgba(87,72,52,0.08)] backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] disabled:opacity-35 sm:h-14 sm:w-14 sm:text-lg";
const actionButtonClass =
  `${actionButtonBaseClass} border-[#e0d3c0] bg-white/70 text-[#6f6253] hover:bg-white`;
const deleteActionButtonClass =
  `${actionButtonBaseClass} border-[#e6c9be] bg-[#fff4ef]/84 text-[#9b4b35] hover:bg-white`;
const actionBarClass =
  "mb-[env(safe-area-inset-bottom)] flex w-full max-w-[min(390px,calc(100vw-2rem))] flex-wrap items-center justify-center gap-1.5 rounded-[22px] border border-[#e0d3c0] bg-[#fffaf0]/50 p-2 shadow-[0_12px_34px_rgba(87,72,52,0.1)] backdrop-blur-md sm:max-w-[460px] sm:gap-2";

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
  onOpenPhoto: () => void;
  onShare: () => void;
  hasImage: boolean;
};

export default function CardDetailActionBar({
  onClose,
  onDelete,
  onEdit,
  onOpenPhoto,
  onShare,
  hasImage,
}: Props) {
  return (
    <section className={actionBarClass}>
      <button
        type="button"
        aria-label="QR共有"
        onClick={onShare}
        className={actionButtonClass}
      >
        <QrCodeIcon />
      </button>
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
