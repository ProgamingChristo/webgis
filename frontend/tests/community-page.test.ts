import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CommunityShell } from "../src/features/community/components/community-shell";
import { CommentThread } from "../src/features/community/components/comments/comment-thread";
import { CommunityFeed } from "../src/features/community/components/feed/community-feed";
import { LocationPicker } from "../src/features/community/components/location/location-picker";
import { PostLocationMap } from "../src/features/community/components/location/post-location-map";
import { PostPhoto } from "../src/features/community/components/media/post-photo";
import { PhotoPreview } from "../src/features/community/components/media/photo-preview";
import { PostComposer } from "../src/features/community/components/post/post-composer";
import { ReactionBar } from "../src/features/community/components/post/reaction-bar";
import { insertTextAtRange } from "../src/features/community/utils/community-format";

describe("Community feature UI", () => {
  it("renders the Community shell, composer, navigation, and location feed item", () => {
    const post = {
      id: "post-1",
      authorId: "user-1",
      author: {
        id: "user-1",
        displayName: "Revan",
        avatarUrl: null,
      },
      content: "Nemunya warung murah 🍜🔥 Mantap 👍",
      type: "GENERAL" as const,
      category: null,
      location: {
        longitude: 106.827,
        latitude: -6.175,
        visibility: "APPROXIMATE" as const,
      },
      status: "VISIBLE" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      media: [],
      reactions: {
        helpfulCount: 0,
        interestingCount: 0,
        confirmedCount: 0,
        viewerReactions: [],
      },
      replyCount: 0,
    };

    const html = renderToStaticMarkup(
      createElement(
        CommunityShell,
        {
          state: {
            contributionCount: 1,
            statusLabel: "Posts + Emoji + Location",
          },
        },
        createElement(PostComposer, {
          key: "composer",
          authorAvatarUrl: null,
          authorName: "Revan",
          error: null,
          submitting: false,
          onSubmit: async () => true,
        }),
        createElement(CommunityFeed, {
          key: "feed",
          error: null,
          items: [post],
          loading: false,
          loadingMore: false,
          meta: {
            page: 1,
            limit: 20,
            total: 1,
            total_pages: 1,
          },
          onLoadMore: () => undefined,
          onRetry: () => undefined,
        }),
      ),
    );

    expect(html).toContain("GETRA Community");
    expect(html).toContain("Beranda");
    expect(html).toContain("Temuan Komuter");
    expect(html).toContain("Apa yang kamu temukan?");
    expect(html).toContain("Tulis informasi lokal");
    expect(html).toContain("Emoji");
    expect(html).toContain("Tambahkan Lokasi");
    expect(html).toContain("Kamera");
    expect(html).toContain("Galeri");
    expect(html).toContain("Posting");
    expect(html).toContain("Nemunya warung murah 🍜🔥 Mantap 👍");
    expect(html).toContain("Sekitar lokasi ini");
    expect(html).toContain("Lihat di peta");
  });

  it("renders selected photo preview and signed feed photo", () => {
    const previewHtml = renderToStaticMarkup(
      createElement(PhotoPreview, {
        file: new File([new Uint8Array([1, 2, 3])], "temuan.jpg", {
          type: "image/jpeg",
        }),
        onRemove: () => undefined,
      }),
    );
    const postPhotoHtml = renderToStaticMarkup(
      createElement(PostPhoto, {
        author: {
          id: "user-1",
          displayName: "Revan",
          avatarUrl: null,
        },
        media: {
          id: "media-1",
          type: "IMAGE",
          url: "https://signed.example/photo.webp",
          width: 640,
          height: 480,
          mimeType: "image/webp",
          sizeBytes: 128,
        },
      }),
    );

    expect(previewHtml).toContain("Preview foto Community");
    expect(previewHtml).toContain("temuan.jpg");
    expect(previewHtml).toContain("Hapus");
    expect(postPhotoHtml).toContain("https://signed.example/photo.webp");
    expect(postPhotoHtml).toContain("Foto postingan Community oleh Revan");
  });

  it("renders Phase 5 reactions and bounded nested comments", () => {
    const reactionHtml = renderToStaticMarkup(
      createElement(ReactionBar, {
        reactions: {
          helpfulCount: 12,
          interestingCount: 4,
          confirmedCount: 17,
          viewerReactions: ["HELPFUL"],
        },
        replyCount: 8,
        threadHref: "/community/post-1",
      }),
    );
    const commentsHtml = renderToStaticMarkup(
      createElement(CommentThread, {
        comments: [
          {
            id: "comment-1",
            postId: "post-1",
            authorId: "user-1",
            author: {
              id: "user-1",
              displayName: "Andi",
              avatarUrl: null,
            },
            parentCommentId: null,
            content: "Aku tadi lewat juga. Masih buka 👍",
            depth: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "comment-2",
            postId: "post-1",
            authorId: "user-2",
            author: {
              id: "user-2",
              displayName: "Sari",
              avatarUrl: null,
            },
            parentCommentId: "comment-1",
            content: "Sama, tadi pagi masih ramai.",
            depth: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "comment-3",
            postId: "post-1",
            authorId: "user-3",
            author: {
              id: "user-3",
              displayName: "Budi",
              avatarUrl: null,
            },
            parentCommentId: "comment-2",
            content: "Harganya juga masih sama.",
            depth: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        onReply: () => undefined,
      }),
    );

    expect(reactionHtml).toContain("Membantu");
    expect(reactionHtml).toContain("Menarik");
    expect(reactionHtml).toContain("Konfirmasi");
    expect(reactionHtml).toContain("Balasan");
    expect(commentsHtml).toContain("Aku tadi lewat juga");
    expect(commentsHtml).toContain("Harganya juga masih sama.");
    expect(commentsHtml.match(/>Balas</g)?.length).toBe(2);
  });

  it("renders the location picker with current location, map selection, and default approximate privacy", () => {
    const html = renderToStaticMarkup(
      createElement(LocationPicker, {
        initialLocation: null,
        initialVisibility: "APPROXIMATE",
        onClose: () => undefined,
        onConfirm: () => undefined,
      }),
    );

    expect(html).toContain("Gunakan lokasi saya");
    expect(html).toContain("Pilih titik di peta");
    expect(html).toContain("Belum ada titik dipilih");
    expect(html).toContain("Perkiraan lokasi");
    expect(html).toContain("Lokasi presisi");
    expect(html).toContain("Konfirmasi Lokasi");
  });

  it("renders the map preview with public approximate location", () => {
    const html = renderToStaticMarkup(
      createElement(PostLocationMap, {
        location: {
          longitude: 106.827,
          latitude: -6.175,
          visibility: "APPROXIMATE",
        },
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("Lokasi Post");
    expect(html).toContain("Sekitar lokasi yang dibagikan");
    expect(html).toContain("-6.175 / 106.827");
  });

  it("renders empty state without synthetic feed posts", () => {
    const html = renderToStaticMarkup(
      createElement(CommunityFeed, {
        error: null,
        items: [],
        loading: false,
        loadingMore: false,
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          total_pages: 1,
        },
        onLoadMore: () => undefined,
        onRetry: () => undefined,
      }),
    );

    expect(html).toContain("Belum ada postingan Community.");
  });

  it("inserts selected emoji at the caret position", () => {
    expect(insertTextAtRange("Kopi enak  dekat stasiun.", "☕", 10, 10)).toEqual({
      value: "Kopi enak ☕ dekat stasiun.",
      caret: 11,
    });
  });
});
