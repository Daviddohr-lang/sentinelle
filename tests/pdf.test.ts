import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateAuditPdf } from "../lib/pdf.ts";

describe("generation PDF", () => {
  it("produit un flux PDF minimal valide", () => {
    const pdf = generateAuditPdf({
      title: "Rapport SENTINELLE",
      lines: ["Controle qualite", "Note globale: 88 %"]
    });

    const text = new TextDecoder().decode(pdf);
    assert.equal(text.startsWith("%PDF-1.4"), true);
    assert.equal(text.includes("%%EOF"), true);
  });
});
