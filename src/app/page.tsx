import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f3ea] text-[#2f2a23]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#8d7f6e]">
              Private memory decks
            </p>
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              Life Cards
            </h1>
            <p className="mt-6 max-w-xl text-xl font-semibold leading-relaxed text-[#3c352c] sm:text-2xl">
              忘れた頃に、もう一度出会う。
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#6f6253] sm:text-lg">
              Life Cardsは、カードを管理するためのアプリではありません。
              写真、学び、読書、会話。残したい瞬間をカードとして残し、
              忘れた頃にもう一度出会うためのアプリです。保存し、忘れ、
              再会する。その循環をつくります。
            </p>
            <Link
              href="/cards"
              className="mt-9 inline-flex rounded-full bg-[#2f2a23] px-6 py-3 text-sm font-semibold text-[#fffaf0] shadow-lg shadow-[#d5cab8] transition hover:bg-[#4a4034] focus:outline-none focus:ring-2 focus:ring-[#2f2a23] focus:ring-offset-2 focus:ring-offset-[#f7f3ea]"
            >
              再会を始める
            </Link>
          </div>

          <div className="relative mx-auto h-[430px] w-full max-w-[330px]">
            <div className="absolute left-6 top-10 h-72 w-52 rotate-[-10deg] rounded-[10px] border border-[#eadfce] bg-[#fffaf0] p-3 shadow-2xl shadow-[#d9cdbb]" />
            <div className="absolute left-14 top-3 h-80 w-56 rotate-[7deg] rounded-[10px] border border-[#eadfce] bg-[#fffaf0] p-3 shadow-2xl shadow-[#d9cdbb]">
              <div className="h-48 rounded-md border border-[#eadfce]/70 bg-[linear-gradient(145deg,#fff8ea,#e9f1e8)]" />
              <div className="mt-4 h-3 w-28 rounded-full bg-[#c8bda9]" />
              <div className="mt-3 h-2 w-20 rounded-full bg-[#ded2c1]" />
            </div>
            <div className="absolute left-2 top-24 h-80 w-56 rotate-[-3deg] overflow-hidden rounded-[10px] border border-[#eadfce] bg-[#fffaf0] p-3 shadow-2xl shadow-[#d9cdbb]">
              <div className="h-48 rounded-md border border-[#eadfce]/70 bg-[linear-gradient(145deg,#fffaf0,#f1e7d6)]" />
              <div className="mt-5">
                <div className="h-3 w-32 rounded-full bg-[#7d705f]" />
                <div className="mt-3 h-2 w-24 rounded-full bg-[#cfc2b0]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
