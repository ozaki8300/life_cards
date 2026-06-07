import MarkdownMemo from "@/components/MarkdownMemo";

type CardFaceSize = "tile" | "preview" | "detail";

type Props = {
  backgroundImage: string;
  backText?: string;
  date: string;
  deckLabel: string;
  face: "front" | "back";
  frontComment?: string;
  frontText?: string;
  size: CardFaceSize;
};

const faceSize = {
  tile: {
    rounded: "rounded-[18px]",
    topFade: "h-24",
    label: "left-4 top-4 max-w-[60%] px-3 py-1 text-[11px]",
    frontContent: "px-5 pb-5 pt-5 sm:px-4 sm:pb-4",
    title: "line-clamp-3 text-2xl leading-snug sm:text-xl",
    comment: "line-clamp-3 text-[15px] leading-6 sm:text-sm",
    date: "text-[10px]",
    backContent: "px-5 pb-5 pt-4 sm:px-4 sm:pb-4",
    backMemo: "max-h-[calc(100%-4.75rem)] overflow-hidden text-[15px] leading-6 sm:text-sm",
  },
  preview: {
    rounded: "rounded-[22px]",
    topFade: "h-28",
    label: "left-5 top-5 max-w-[70%] px-3 py-1 text-[11px]",
    frontContent: "px-5 pb-6 pt-5",
    title: "line-clamp-3 text-3xl leading-tight",
    comment: "text-sm leading-6",
    date: "text-xs",
    backContent: "px-5 pb-5 pt-4",
    backMemo: "card-back-scroll overflow-y-auto pr-2 text-sm leading-6",
  },
  detail: {
    rounded: "rounded-[24px]",
    topFade: "h-32",
    label: "left-6 top-7 max-w-[70%] px-3 py-1 text-[11px] sm:left-7 sm:top-8",
    frontContent: "px-6 pb-8 pt-7 sm:px-7 sm:pb-9 sm:pt-8",
    title: "text-4xl leading-tight",
    comment: "text-base leading-7",
    date: "text-xs",
    backContent: "px-6 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6",
    backMemo: "card-back-scroll overflow-y-auto pr-2 text-base leading-7",
  },
} as const;

export default function CardFace({
  backgroundImage,
  backText = "",
  date,
  deckLabel,
  face,
  frontComment = "",
  frontText = "",
  size,
}: Props) {
  const styles = faceSize[size];
  const backgroundStyle = { backgroundImage: `url(${backgroundImage})` };
  const isBack = face === "back";

  return (
    <section
      className={`absolute inset-0 overflow-hidden border border-white/25 bg-cover bg-center [backface-visibility:hidden] ${
        styles.rounded
      } ${isBack ? "[transform:rotateY(180deg)]" : ""}`}
      style={backgroundStyle}
    >
      {isBack ? <div className="absolute inset-0 backdrop-blur-[1.5px]" /> : null}
      <div
        className={`absolute inset-0 ${
          isBack
            ? "bg-[#fff7ec]/88"
            : "bg-gradient-to-t from-black/56 via-black/18 to-black/5"
        }`}
      />
      {!isBack ? (
        <div
          className={`absolute inset-x-0 top-0 bg-gradient-to-b from-black/32 to-transparent ${styles.topFade}`}
        />
      ) : null}

      {!isBack ? (
        <>
          <p
            className={`absolute truncate rounded-full bg-black/16 font-semibold uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm ${styles.label}`}
          >
            {deckLabel}
          </p>

          <div
            className={`absolute inset-x-0 bottom-0 text-white ${styles.frontContent}`}
          >
            <p
              className={`font-medium text-white/88 drop-shadow-[0_1px_7px_rgba(0,0,0,0.86)] ${styles.date}`}
            >
              {date}
            </p>
            <h3
              className={`mt-3 font-semibold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] ${styles.title}`}
            >
              {frontText || "Untitled"}
            </h3>
            {frontComment ? (
              <p
                className={`mt-4 whitespace-pre-line text-white/88 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] ${styles.comment}`}
              >
                {frontComment}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <div
          className={`relative flex h-full min-h-0 flex-col text-[#332d25] ${styles.backContent}`}
        >
          <div className="flex items-center justify-between gap-3 pr-12">
            <p className="max-w-[55%] truncate rounded-full bg-white/54 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f6253] backdrop-blur-sm">
              {deckLabel}
            </p>
            <p
              className={`shrink-0 whitespace-nowrap font-medium text-[#7d705f] ${styles.date}`}
            >
              {date}
            </p>
          </div>

          <div
            className={`mt-3 min-h-0 flex-1 ${styles.backMemo}`}
          >
            <MarkdownMemo
              compact={size !== "detail"}
              emptyText="裏面メモを書く（Markdown対応）"
            >
              {backText}
            </MarkdownMemo>
          </div>
        </div>
      )}
    </section>
  );
}
