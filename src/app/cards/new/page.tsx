import NewCardForm from "@/components/NewCardForm";
import { decks } from "@/data/decks/decks";

export default function NewCardPage() {
  return <NewCardForm backHref="/cards" deckOptions={decks} />;
}
