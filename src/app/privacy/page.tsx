import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";

import LegalDocumentPage from "@/components/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Life Cards",
};

function readPrivacyPolicy() {
  return readFileSync(
    path.join(process.cwd(), "docs/privacy_policy.md"),
    "utf8",
  );
}

export default function PrivacyPage() {
  return (
    <LegalDocumentPage eyebrow="Privacy">{readPrivacyPolicy()}</LegalDocumentPage>
  );
}
