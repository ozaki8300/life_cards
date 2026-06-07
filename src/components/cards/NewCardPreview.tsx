import MarkdownMemo from "@/components/MarkdownMemo";

type Props = {
  backText: string;
  cardDate: string;
  frontText: string;
  imageLabel: string;
  imagePath: string;
  selectedDeckName: string;
};

export default function NewCardPreview({
  backText,
  cardDate,
  frontText,
  imageLabel,
  imagePath,
  selectedDeckName,
}: Props) {
  return (
    <section className="space-y-3">
      <div className="mx-auto aspect-[3/4] w-full max-w-[320px] rounded-[22px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_20px_56px_rgba(122,105,82,0.2)]">
        <div className="h-[60%] overflow-hidden rounded-[12px] border border-[#eadfce]/80 bg-[linear-gradient(145deg,#fffaf0,#f1e7d6)]">
          {imagePath ? (
            <div
              className="h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${imagePath})` }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
                  {imageLabel || "Photo"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#8d7f6e]">
                  写真・本・リンクの余白
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex h-[40%] flex-col justify-between pt-4">
          <p className="line-clamp-3 text-lg font-semibold leading-snug text-[#332d25]">
            {frontText || "今の気持ちや 大切にしたいこと"}
          </p>
          <div>
            <p className="text-sm font-semibold text-[#7d705f]">
              {selectedDeckName}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#a19380]">
              {cardDate.replaceAll("-", ".")}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[320px] rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_14px_36px_rgba(122,105,82,0.13)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
          Back
        </p>
        <div className="mt-3 min-h-[88px]">
          <MarkdownMemo compact emptyText="裏面メモを書く">
            {backText}
          </MarkdownMemo>
        </div>
      </div>
    </section>
  );
}
