/// <reference types="vitest/globals" />
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("should handle conditional classes", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toBe("base visible");
  });

  it("should handle tailwind conflict resolution", () => {
    // 'px-4' should be overridden by 'px-6'
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("should handle null/undefined inputs", () => {
    expect(cn("a", null, undefined, "b")).toBe("a b");
  });

  it("should handle array inputs", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("should handle object syntax", () => {
    expect(cn({ a: true, b: false, c: true })).toBe("a c");
  });
});
