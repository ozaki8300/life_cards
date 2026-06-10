import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";

import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Terms of Service | Life Cards",
};

function readTermsOfService() {
  return readFileSync(
    path.join(process.cwd(), "docs/terms_of_service.md"),
    "utf8",
  );
}

export default function TermsPage() {
  return (
    <LegalDocumentPage eyebrow="Terms">{readTermsOfService()}</LegalDocumentPage>
  );
}
