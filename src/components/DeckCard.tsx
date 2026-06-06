import Link from "next/link";

type Props = {
  name: string;
  cardCount?: number;
  isShared: boolean;
  coverImage?: string;
  href?: string;
};

const gradients = [
  "linear-gradient(145deg, #fffaf0 0%, #f1e7d6 100%)",
  "linear-gradient(145deg, #fff8ea 0%, #e9f1e8 100%)",
  "linear-gradient(145deg, #fff7ec 0%, #f4eadc 100%)",
];

function gradientForName(name: string) {
  const index = name.split("").reduce((sum, letter) => sum + letter.charCodeAt(0), 0);

  return gradients[index % gradients.length];
}

export default function DeckCard({ name, cardCount = 0, isShared, coverImage, href }: Props) {
  const coverStyle = {
    backgroundImage: coverImage ? `url(${coverImage})` : gradientForName(name),
  };

  const card = (
    <article className="group relative aspect-[3/4] rounded-[12px]">
      <div className="absolute inset-x-2 top-2 h-full rounded-[12px] border border-[#e5d9c7] bg-[#efe5d4] shadow-[0_12px_28px_rgba(122,105,82,0.14)] transition group-hover:translate-y-1" />
      <div className="absolute inset-x-1 top-1 h-full rounded-[12px] border border-[#eadfce] bg-[#f8f0e3] shadow-[0_12px_28px_rgba(122,105,82,0.14)] transition group-hover:translate-y-0.5" />

      <div className="relative h-full overflow-hidden rounded-[12px] border border-[#e8ddcb] bg-[#fffaf0] p-3 shadow-[0_16px_36px_rgba(122,105,82,0.17)] transition duration-200 group-hover:-translate-y-1">
        <div
          className="h-3/5 rounded-[8px] border border-[#eadfce]/70 bg-cover bg-center"
          style={coverStyle}
        />

        <div className="flex h-2/5 flex-col justify-between pt-4">
          <span className="w-fit rounded-full border border-[#e0d3c0] bg-[#f6ecdc] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d7f6e]">
            {isShared ? "shared" : "private"}
          </span>

          <div>
            <h2 className="text-base font-semibold leading-tight text-[#332d25] sm:text-lg">
              {name}
            </h2>
            <p className="mt-1 text-xs font-medium text-[#8d7f6e]">
              {cardCount} cards
            </p>
          </div>
        </div>
      </div>
    </article>
  );

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      className="block focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#f7f3ea]"
    >
      {card}
    </Link>
  );
}
