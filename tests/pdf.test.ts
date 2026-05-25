import { describe, expect, it } from "vitest";
import { generateAuditPdf } from "@/lib/pdf";

describe("generation PDF", () => {
  it("produit un flux PDF minimal valide", () => {
    const pdf = generateAuditPdf({
      title: "Rapport SENTINELLE",
      lines: ["Controle qualite", "Note globale: 88 %"]
    });

    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("%%EOF");
  });
});
