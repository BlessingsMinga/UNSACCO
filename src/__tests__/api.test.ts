/// <reference types="vitest/globals" />
import { generateReference } from "@/lib/api";

describe("generateReference", () => {
  it("should generate a reference with the given prefix", () => {
    const ref = generateReference("DEP");
    expect(ref).toMatch(/^DEP-/);
  });

  it("should include date in YYMMDD format", () => {
    const ref = generateReference("SAV");
    const today = new Date();
    const yy = String(today.getFullYear()).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    expect(ref).toContain(`${yy}${mm}${dd}`);
  });

  it("should include a 4-char random suffix", () => {
    const ref = generateReference("LNR");
    const parts = ref.split("-");
    expect(parts.length).toBe(3);
    expect(parts[2]).toMatch(/^[A-Z0-9]{4}$/);
  });

  it("should generate unique references on successive calls", () => {
    const refs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      refs.add(generateReference("TST"));
    }
    // All 100 should be unique (each has random suffix)
    expect(refs.size).toBe(100);
  });

  it("should handle various prefixes", () => {
    const prefixes = ["DEP", "WDR", "LNR", "LND", "PCD", "SHB", "FEE", "SAV"];
    for (const p of prefixes) {
      const ref = generateReference(p);
      expect(ref).toMatch(new RegExp(`^${p}-\\d{6}-[A-Z0-9]{4}$`));
    }
  });
});
