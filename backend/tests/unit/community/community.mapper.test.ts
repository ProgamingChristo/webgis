import { describe, expect, it } from "vitest";

import { mapCommunityPostRow } from "@/src/features/community";

describe("Community mapper", () => {
  const baseRow = {
    id: "post-1",
    author_id: "user-1",
    content: "Ada tempat menarik di sini 📍",
    created_at: "2026-08-23T00:00:00.000Z",
    updated_at: "2026-08-23T00:00:00.000Z",
    author_display_name: "Revan",
    author_avatar_url: null,
    media_id: null,
    media_storage_path: null,
    media_mime_type: null,
    media_size_bytes: null,
    media_width: null,
    media_height: null,
  };

  it("maps text-only posts without a location", () => {
    expect(
      mapCommunityPostRow({
        ...baseRow,
        location_longitude: null,
        location_latitude: null,
        location_visibility: null,
      }),
    ).toMatchObject({
      id: "post-1",
      authorId: "user-1",
      location: null,
    });
  });

  it("maps only the public location projection", () => {
    const mapped = mapCommunityPostRow({
      ...baseRow,
      location_longitude: 106.827,
      location_latitude: -6.175,
      location_visibility: "APPROXIMATE",
    });

    expect(mapped.location).toEqual({
      longitude: 106.827,
      latitude: -6.175,
      visibility: "APPROXIMATE",
    });
    expect(JSON.stringify(mapped)).not.toContain("location_accuracy_m");
    expect(JSON.stringify(mapped)).not.toContain("raw");
  });
});
