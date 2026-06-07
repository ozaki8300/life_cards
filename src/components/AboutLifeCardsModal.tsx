"use client";

import Image from "next/image";

import { useEscapeKey } from "@/lib/useEscapeKey";

const aboutParagraphs = [
  "Life Cardsは、写真や言葉をカードとして残し、忘れた頃にもう一度出会うためのアプリです。",
  "Version: v0.1",
  "Developed by K",
  "© 2026 Life Cards. All rights reserved.",
  "本サービスの利用により生じたいかなる損害についても、開発者は責任を負いません。",
  "予告なく仕様変更・停止する場合があります。",
  "入力されたデータは、ローカルまたは一時的にサーバーへ保存される場合があります。",
  "個人を特定する目的では利用しません。",
  "共有URLを知っている人は内容にアクセスできます。",
  "共有された内容は、閲覧者によって再共有される可能性があります。",
  "公開範囲を十分にご確認のうえ、ご利用ください。",
  "機密情報の取り扱いにはご注意ください。",
  "外部アプリやサービスとの連携は、ユーザーの責任で行ってください。",
  "Life Cardsは、カードを管理するためのアプリではありません。",
  "Deckは整理箱。主役はCard。",
  "保存し、忘れ、再会する。",
  "その循環をつくるために、このアプリを育てています。",
];

type Props = {
  onClose: () => void;
};

export default function AboutLifeCardsModal({ onClose }: Props) {
  useEscapeKey(onClose);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#3b3126]/45 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close about Life Cards"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[20px] border border-[#e8ddcb] bg-[#fffaf0] p-5 text-sm leading-7 text-[#5f5346] shadow-[0_28px_80px_rgba(87,72,52,0.28)] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[#e0d3c0] bg-white/72 text-lg font-semibold text-[#7d705f] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#d8c8aa]"
        >
          ×
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a19380]">
          About Life Cards
        </p>
        <h2 className="mt-3 pr-10 text-2xl font-bold tracking-tight text-[#332d25]">
          Save. Forget. Reencounter.
        </h2>

        <div className="mt-6 space-y-4">
          {aboutParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-7 border-t border-[#eadfce] pt-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a19380]">
            Life Cards QR
          </p>
          <Image
            src="/life-cards-qr.png"
            alt="Life Cards QR"
            width={320}
            height={320}
            className="mx-auto mt-3 h-32 w-32 rounded-[12px] border border-[#e8ddcb] bg-white p-2 shadow-sm"
          />
          <p className="mt-2 break-all text-xs leading-5 text-[#8d7f6e]">
            https://life-cards-three.vercel.app/
          </p>
        </div>
      </section>
    </div>
  );
}
