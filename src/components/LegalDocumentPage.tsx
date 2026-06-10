import Link from "next/link";

import MarkdownMemo from "./MarkdownMemo";

type Props = {
  children: string;
  eyebrow: string;
};

export default function LegalDocumentPage({ children, eyebrow }: Props) {
  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <article className="mx-auto max-w-3xl">
        <header className="mb-7 border-b border-[#eadfce] pb-5">
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#a19380]">
            {eyebrow}
          </p>
        </header>

        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-full border border-[#e8ddcb] bg-[#fffaf0]/78 px-4 text-sm font-semibold text-[#6f6253] shadow-sm transition hover:border-[#d8c8aa] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa] focus:ring-offset-2 focus:ring-offset-[#f7f3ea]"
          >
            ← Life Cards に戻る
          </Link>
        </div>

        <section className="rounded-[18px] border border-[#e8ddcb] bg-[#fffaf0]/72 px-5 py-6 shadow-[0_18px_52px_rgba(122,105,82,0.12)] sm:px-7 sm:py-8">
          <MarkdownMemo>{children}</MarkdownMemo>
        </section>

        <footer className="flex flex-wrap gap-4 px-1 py-7 text-sm font-semibold text-[#8d7f6e]">
          <Link href="/privacy" className="transition hover:text-[#2f2a23]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition hover:text-[#2f2a23]">
            Terms of Service
          </Link>
        </footer>
      </article>
    </main>
  );
}
