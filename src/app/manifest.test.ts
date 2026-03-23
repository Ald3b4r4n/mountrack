import manifest from "@/app/manifest";

describe("manifest", () => {
  it("returns installable metadata for the PWA shell", () => {
    const result = manifest();

    expect(result.name).toBe("MounTrack");
    expect(result.display).toBe("standalone");
    expect(result.start_url).toBe("/");
    expect(result.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/pwa/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        }),
        expect.objectContaining({
          src: "/pwa/icon-maskable-512.png",
          purpose: "maskable",
        }),
      ]),
    );
  });
});
