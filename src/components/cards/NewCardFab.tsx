import Link from "next/link";

type Props = {
  href: string;
};

export default function NewCardFab({ href }: Props) {
  return (
    <Link
      href={href}
      aria-label="New card"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.75rem)] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[#d8c8aa]/60 bg-[#fffaf0]/70 text-[1.7rem] font-light leading-none text-[#2f2a23] shadow-[0_8px_20px_rgba(87,72,52,0.1)] backdrop-blur-md transition hover:border-[#cdb895]/75 hover:bg-[#fffaf0]/84 focus:outline-none focus:ring-2 focus:ring-[#b9a789] focus:ring-offset-4 focus:ring-offset-[#f7f3ea] sm:bottom-8 sm:right-8 sm:h-16 sm:w-16 sm:bg-[#fffaf0]/86 sm:text-4xl sm:shadow-[0_10px_28px_rgba(87,72,52,0.14)] lg:right-12 xl:right-[calc((100vw-72rem)/2+3rem)]"
    >
      <span aria-hidden="true" className="-translate-y-px">
        +
      </span>
    </Link>
  );
}
