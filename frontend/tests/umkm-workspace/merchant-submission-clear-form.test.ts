import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(
    import.meta.dirname,
    "../../src/features/merchant-submission/components/merchant-submission-form.tsx",
  ),
  "utf8",
);

describe("UMKM merchant submission clear form", () => {
  it("offers an explicit confirmation instead of immediately discarding input", () => {
    expect(source).toContain("Bersihkan Form");
    expect(source).toContain("Bersihkan semua input?");
    expect(source).toContain("Ya, Bersihkan Form");
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('role="dialog"');
  });

  it("clears every registration field and transient message", () => {
    for (const resetCall of [
      'setName("")',
      'setDescription("")',
      'setAddress("")',
      "setOpeningHours(initialOperatingHours(undefined))",
      "setCoordinates([...DEFAULT_COORDINATES])",
      'setStoredImageUrl("")',
      "setPhotoFile(null)",
      'setPhotoPreviewUrl("")',
      "setMenuPhotoFile(null)",
      'setMenuPhotoPreviewUrl("")',
      'setContactPhone("")',
      "setPriceRange(null)",
      'setPaymentMethods(["CASH"])',
      "setError(null)",
      "setDuplicateWarning(null)",
    ]) {
      expect(source).toContain(resetCall);
    }
  });

  it("releases file previews and remounts stateful AI and map inputs", () => {
    expect(source).toContain("URL.revokeObjectURL(photoObjectUrlRef.current)");
    expect(source).toContain("URL.revokeObjectURL(menuObjectUrlRef.current)");
    expect(source).toContain("photoInputRef.current.value");
    expect(source).toContain("menuPhotoInputRef.current.value");
    expect(source).toContain("merchant-description-${formResetVersion}");
    expect(source).toContain("merchant-map-${formResetVersion}");
  });
});
