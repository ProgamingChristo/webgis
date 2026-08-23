"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "../../../components/providers/AuthProvider";
import { CommunityFeed } from "./feed/community-feed";
import { CommunityShell } from "./community-shell";
import { CulturalMap } from "./map/cultural-map";
import { PostComposer } from "./post/post-composer";
import { RequestComposer } from "./request/request-composer";
import { RequestFeed } from "./request/request-feed";
import type { CommunityView } from "./community-navigation";
import { useCommunityFeed } from "../hooks/use-community-feed";
import { useCommuterRequests } from "../hooks/use-commuter-requests";
import { getAuthorInitials } from "../utils/community-format";

export function CommunityPage() {
  const { context } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const initialView: CommunityView =
    requestedView === "findings" ||
    requestedView === "map" ||
    requestedView === "requests"
      ? requestedView
      : "home";
  const [activeView, setActiveView] = useState<CommunityView>(initialView);
  const feedFilters = useMemo(
    () => (activeView === "findings" ? { type: "FINDING" as const } : {}),
    [activeView],
  );
  const feed = useCommunityFeed(feedFilters);
  const requests = useCommuterRequests();
  const displayName =
    context?.profile?.display_name?.trim() ||
    "Pengguna GETRA";
  const contributionCount =
    activeView === "requests" ? requests.meta.total : feed.meta.total;

  function changeView(view: CommunityView) {
    setActiveView(view);
    router.replace(view === "home" ? "/community" : `/community?view=${view}`);
  }

  return (
    <CommunityShell
      activeView={activeView}
      onChangeView={changeView}
      state={{
        contributionCount,
        statusLabel:
          activeView === "map"
            ? "Spatial Discovery"
            : activeView === "requests"
              ? "Permintaan Komuter"
            : activeView === "findings"
              ? "Temuan Komuter"
              : "Posts + Discussion + Reactions",
      }}
    >
      {activeView === "map" ? (
        <CulturalMap />
      ) : activeView === "requests" ? (
        <>
          <RequestComposer
            error={requests.submitError}
            onSubmit={requests.publishRequest}
            submitting={requests.submitting}
          />
          <RequestFeed
            error={requests.error}
            items={requests.items}
            loading={requests.loading}
            loadingMore={requests.loadingMore}
            meta={requests.meta}
            onLoadMore={requests.loadMore}
            onRetry={requests.reload}
          />
        </>
      ) : (
        <>
          <PostComposer
            authorInitials={getAuthorInitials(displayName)}
            authorName={displayName}
            error={feed.postError}
            onSubmit={feed.publishPost}
            submitting={feed.submitting}
          />
          <CommunityFeed
            error={feed.error}
            items={feed.items}
            loading={feed.loading}
            loadingMore={feed.loadingMore}
            meta={feed.meta}
            pendingReactionByPostId={feed.pendingReactionByPostId}
            onLoadMore={feed.loadMore}
            onRetry={feed.reload}
            onToggleReaction={feed.toggleReaction}
          />
        </>
      )}
    </CommunityShell>
  );
}
