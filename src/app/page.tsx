import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/45">
              Private memory decks
            </p>
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              Life Cards
            </h1>
            <p className="mt-6 max-w-xl text-xl font-semibold leading-relaxed text-white sm:text-2xl">
              写真・スクショ・言葉をカードにして、デッキで育てる
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/62 sm:text-lg">
              学び、読書、授業、ChatGPTとの対話。残したい瞬間を1枚のカードにし、忘れた頃に再会するための知的チェキアプリ。
            </p>
            <Link
              href="/cards"
              className="mt-9 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/88 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            >
              カードデッキを開く
            </Link>
          </div>

          <div className="relative mx-auto h-[430px] w-full max-w-[330px]">
            <div className="absolute left-6 top-10 h-72 w-52 rotate-[-10deg] rounded-lg border border-white/15 bg-[linear-gradient(145deg,#7c2d12,#18181b_65%)] shadow-2xl shadow-black" />
            <div className="absolute left-14 top-3 h-80 w-56 rotate-[7deg] rounded-lg border border-white/15 bg-[radial-gradient(circle_at_30%_20%,rgba(125,211,252,0.9),transparent_32%),linear-gradient(145deg,#052e16,#111827_72%)] shadow-2xl shadow-black" />
            <div className="absolute left-2 top-24 h-80 w-56 rotate-[-3deg] overflow-hidden rounded-lg border border-white/20 bg-[radial-gradient(circle_at_24%_18%,rgba(244,114,182,0.9),transparent_34%),linear-gradient(145deg,#312e81,#18181b_78%)] shadow-2xl shadow-black">
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.86),rgba(0,0,0,0.08))]" />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="h-3 w-28 rounded-full bg-white/80" />
                <div className="mt-3 h-2 w-20 rounded-full bg-white/35" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
