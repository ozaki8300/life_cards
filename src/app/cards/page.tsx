import CardHome from "@/components/CardHome";
import NewCardFab from "@/components/cards/NewCardFab";
import { cards } from "@/data/cards/cards";
import { decks } from "@/data/decks/decks";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function canUseSeedInitialData() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return !user && !error;
  } catch {
    return false;
  }
}

export default async function CardsPage() {
  const useSeedInitialData = await canUseSeedInitialData();
  const initialCards = useSeedInitialData ? cards : [];
  const initialDecks = useSeedInitialData ? decks : [];

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#2f2a23] sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <CardHome cards={initialCards} decks={initialDecks} />
      </section>
      <NewCardFab href="/cards/new" />
    </main>
  );
}
