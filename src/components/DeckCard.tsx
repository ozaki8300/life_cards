type Props = {
  name: string;
  cardCount?: number;
  isShared: boolean;
  coverImage?: string;
};

const gradients = [
  "radial-gradient(circle at 20% 20%, rgba(253, 186, 116, 0.95), transparent 34%), linear-gradient(145deg, #1e1b4b 0%, #7c2d12 55%, #111827 100%)",
  "radial-gradient(circle at 74% 18%, rgba(125, 211, 252, 0.9), transparent 30%), linear-gradient(145deg, #052e16 0%, #0f766e 48%, #111827 100%)",
  "radial-gradient(circle at 26% 24%, rgba(244, 114, 182, 0.9), transparent 32%), linear-gradient(145deg, #312e81 0%, #be123c 52%, #18181b 100%)",
];

function gradientForName(name: string) {
  const index = name.split("").reduce((sum, letter) => sum + letter.charCodeAt(0), 0);

  return gradients[index % gradients.length];
}

export default function DeckCard({ name, cardCount = 0, isShared, coverImage }: Props) {
  const coverStyle = {
    backgroundImage: coverImage ? `url(${coverImage})` : gradientForName(name),
  };

  return (
    <article className="group relative aspect-[3/4] rounded-lg">
      <div className="absolute inset-x-2 top-2 h-full rounded-lg border border-white/10 bg-zinc-800/80 shadow-xl shadow-black/40 transition group-hover:translate-y-1" />
      <div className="absolute inset-x-1 top-1 h-full rounded-lg border border-white/10 bg-zinc-700/80 shadow-xl shadow-black/40 transition group-hover:translate-y-0.5" />

      <div className="relative h-full overflow-hidden rounded-lg border border-white/15 bg-zinc-900 shadow-2xl shadow-black/50 transition duration-200 group-hover:-translate-y-1 group-hover:border-white/30">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={coverStyle}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.22),transparent_30%),linear-gradient(to_top,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.38)_46%,rgba(0,0,0,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.18)_0%,transparent_22%,transparent_100%)] opacity-70" />

        <div className="relative flex h-full flex-col justify-between p-3 sm:p-4">
          <span className="w-fit rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
            {isShared ? "shared" : "private"}
          </span>

          <div>
            <h2 className="text-base font-semibold leading-tight text-white sm:text-lg">
              {name}
            </h2>
            <p className="mt-1 text-xs font-medium text-white/65">
              {cardCount} cards
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
