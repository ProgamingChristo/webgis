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
import { DemandSignalList } from "./demand/demand-signal-list";
import type { CommunityView } from "./community-navigation";
import { useCommunityFeed } from "../hooks/use-community-feed";
import { useCommuterRequests } from "../hooks/use-commuter-requests";
import { useDemandSignals } from "../hooks/use-demand-signals";
import { useCommunityFriends } from "../hooks/use-community-friends";
import styles from "./community.module.css";

export function CommunityPage() {
  const { context } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const initialView: CommunityView =
    requestedView === "findings" ||
    requestedView === "map" ||
    requestedView === "requests" ||
    requestedView === "friends"
      ? requestedView
      : "home";
  const [activeView, setActiveView] = useState<CommunityView>(initialView);
  const feedFilters = useMemo(
    () => (activeView === "findings" ? { type: "FINDING" as const } : {}),
    [activeView],
  );
  const [feedMode, setFeedMode] = useState<"FOR_YOU" | "NEARBY" | "FOLLOWING">("FOR_YOU");
  const feed = useCommunityFeed(feedFilters);
  const friends = useCommunityFriends("FRIENDS", feedMode === "FOLLOWING");
  const requests = useCommuterRequests();
  const signals = useDemandSignals();
  const [requestTab, setRequestTab] = useState<"latest" | "signals">("latest");
  const [nearbyOrigin, setNearbyOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyMessage, setNearbyMessage] = useState<string | null>(null);
  const displayName =
    context?.profile?.display_name?.trim() ||
    "Pengguna GETRA";
  const contributionCount =
    activeView === "requests"
      ? requestTab === "signals"
        ? signals.meta.total
        : requests.meta.total
      : feed.meta.total;
  const visibleFeed = useMemo(() => {
    if (feedMode === "FOLLOWING") {
      const friendIds = new Set(friends.items.map((friend) => friend.userId));
      return feed.items.filter((post) => friendIds.has(post.authorId));
    }
    if (feedMode === "NEARBY" && nearbyOrigin) {
      const distance = (latitude: number, longitude: number) => {
        const radians = Math.PI / 180;
        const latitudeDelta = (latitude - nearbyOrigin.latitude) * radians;
        const longitudeDelta = (longitude - nearbyOrigin.longitude) * radians;
        const value = Math.sin(latitudeDelta / 2) ** 2
          + Math.cos(nearbyOrigin.latitude * radians) * Math.cos(latitude * radians) * Math.sin(longitudeDelta / 2) ** 2;
        return 6371008.8 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)));
      };
      return feed.items.filter((post) => post.location).sort((left, right) =>
        distance(left.location!.latitude, left.location!.longitude) - distance(right.location!.latitude, right.location!.longitude),
      );
    }
    return feed.items;
  }, [feed.items, feedMode, friends.items, nearbyOrigin]);
  const visibleMeta = feedMode === "FOR_YOU"
    ? feed.meta
    : { page: 1, limit: Math.max(visibleFeed.length, 1), total: visibleFeed.length, total_pages: 1 };

  function selectFeedMode(mode: "FOR_YOU" | "NEARBY" | "FOLLOWING") {
    setFeedMode(mode);
    setNearbyMessage(null);
    if (mode !== "NEARBY" || nearbyOrigin) return;
    if (!("geolocation" in navigator)) {
      setNearbyMessage("Lokasi perangkat tidak tersedia. Aktifkan lokasi untuk melihat post terdekat.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setNearbyOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setNearbyMessage("Lokasi belum diizinkan. Post terdekat belum dapat diurutkan."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 },
    );
  }

  function changeView(view: CommunityView) {
    if (view === "contributions") {
      router.push("/community/contributions");
      return;
    }

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
            ? "Jelajahi area"
            : activeView === "requests"
              ? "Permintaan Komuter"
            : activeView === "findings"
              ? "Temuan Komuter"
              : "Posts + Discussion + Reactions",
      }}
    >
      {activeView === "map" ? (
        <CulturalMap />
      ) : activeView === "friends" ? (
        <section className={styles.feedState}>
          <span className={styles.eyebrow}>Teman</span>
          <h2>Kelola teman komunitas.</h2>
          <button
            className={styles.primaryButton}
            onClick={() => router.push("/community/friends")}
            type="button"
          >
            Buka Teman
          </button>
        </section>
      ) : activeView === "requests" ? (
        <>
          <RequestComposer
            error={requests.submitError}
            onSubmit={requests.publishRequest}
            submitting={requests.submitting}
          />
          <div className={styles.requestTabs} role="tablist" aria-label="Mode permintaan">
            <button
              aria-selected={requestTab === "latest"}
              className={
                requestTab === "latest"
                  ? styles.segmentedButtonActive
                  : styles.segmentedButton
              }
              onClick={() => setRequestTab("latest")}
              role="tab"
              type="button"
            >
              Permintaan Terbaru
            </button>
            <button
              aria-selected={requestTab === "signals"}
              className={
                requestTab === "signals"
                  ? styles.segmentedButtonActive
                  : styles.segmentedButton
              }
              onClick={() => setRequestTab("signals")}
              role="tab"
              type="button"
            >
              Kebutuhan warga
            </button>
          </div>
          {requestTab === "signals" ? (
            <DemandSignalList
              error={signals.error}
              items={signals.items}
              loading={signals.loading}
              loadingMore={signals.loadingMore}
              meta={signals.meta}
              onLoadMore={signals.loadMore}
              onRetry={signals.reload}
            />
          ) : (
            <RequestFeed
              error={requests.error}
              items={requests.items}
              loading={requests.loading}
              loadingMore={requests.loadingMore}
              meta={requests.meta}
              onLoadMore={requests.loadMore}
              onRetry={requests.reload}
            />
          )}
        </>
      ) : (
        <>
          <PostComposer
            authorAvatarUrl={context?.profile?.avatar_url ?? null}
            authorName={displayName}
            error={feed.postError}
            onSubmit={feed.publishPost}
            submitting={feed.submitting}
          />
          <div className={styles.feedTabs} role="tablist" aria-label="Urutan feed komunitas">
            {([
              ["FOR_YOU", "Untuk Kamu"],
              ["NEARBY", "Terdekat"],
              ["FOLLOWING", "Mengikuti"],
            ] as const).map(([mode, label]) => (
              <button aria-selected={feedMode === mode} key={mode} onClick={() => selectFeedMode(mode)} role="tab" type="button">
                {label}
              </button>
            ))}
          </div>
          {nearbyMessage ? <p className={styles.feedNotice} role="status">{nearbyMessage}</p> : null}
          <CommunityFeed
            error={feed.error}
            items={visibleFeed}
            loading={feed.loading || (feedMode === "FOLLOWING" && friends.loading)}
            loadingMore={feedMode === "FOR_YOU" && feed.loadingMore}
            meta={visibleMeta}
            pendingReactionByPostId={feed.pendingReactionByPostId}
            onLoadMore={feedMode === "FOR_YOU" ? feed.loadMore : async () => undefined}
            onRetry={feed.reload}
            onToggleReaction={feed.toggleReaction}
            canDelete={(post) => context?.profile?.account_role === "ADMIN" || post.authorId === context?.user.id}
            isModerationDelete={(post) => context?.profile?.account_role === "ADMIN" && post.authorId !== context?.user.id}
            deletingPostId={feed.deletingPostId}
            onDelete={feed.deletePost}
          />
        </>
      )}
    </CommunityShell>
  );
}
