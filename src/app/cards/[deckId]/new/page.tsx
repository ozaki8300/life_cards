import NewCardForm from "@/components/NewCardForm";
import { decks } from "@/data/decks/decks";

type Props = {
  params: Promise<{
    deckId: string;
  }>;
};

export function generateStaticParams() {
  return decks.map((deck) => ({
    deckId: deck.id,
  }));
}

export const dynamicParams = true;

export default async function NewDeckCardPage({ params }: Props) {
  const { deckId } = await params;
  const encodedDeckId = encodeURIComponent(deckId);

  return (
    <NewCardForm
      backHref={`/cards/${encodedDeckId}`}
      deckId={deckId}
      deckOptions={decks}
    />
  );
}
