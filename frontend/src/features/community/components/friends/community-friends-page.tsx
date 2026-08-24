"use client";

import Link from "next/link";
import { useState } from "react";

import { CommunityShell } from "../community-shell";
import { CommunityAvatar } from "../common/community-avatar";
import { useCommunityFriends } from "../../hooks/use-community-friends";
import type {
  CommunityFriendListItem,
  CommunityFriendshipView,
} from "../../types/community.types";
import styles from "../community.module.css";

const FRIEND_TABS: Array<{
  value: CommunityFriendshipView;
  label: string;
}> = [
  { value: "FRIENDS", label: "Teman Saya" },
  { value: "INCOMING", label: "Permintaan Masuk" },
  { value: "OUTGOING", label: "Permintaan Terkirim" },
];

function FriendCard({
  item,
  acting,
  view,
  onAction,
}: {
  item: CommunityFriendListItem;
  acting: boolean;
  view: CommunityFriendshipView;
  onAction(action: "ACCEPT" | "DECLINE" | "CANCEL" | "UNFRIEND"): void;
}) {
  return (
    <article className={styles.friendCard}>
      <CommunityAvatar
        avatarUrl={item.avatarUrl}
        displayName={item.displayName}
      />
      <div>
        <strong>{item.displayName}</strong>
        <span>
          {view === "FRIENDS"
            ? "Teman"
            : view === "INCOMING"
              ? "Mengirim permintaan"
              : "Menunggu respons"}
        </span>
      </div>
      <div className={styles.friendCardActions}>
        <Link
          className={styles.locationLinkButton}
          href={`/community/users/${item.userId}`}
        >
          Profil
        </Link>
        {view === "FRIENDS" ? (
          <button
            className={styles.secondaryButton}
            disabled={acting}
            onClick={() => onAction("UNFRIEND")}
            type="button"
          >
            Hapus Teman
          </button>
        ) : view === "INCOMING" ? (
          <>
            <button
              className={styles.primaryButton}
              disabled={acting}
              onClick={() => onAction("ACCEPT")}
              type="button"
            >
              Terima
            </button>
            <button
              className={styles.secondaryButton}
              disabled={acting}
              onClick={() => onAction("DECLINE")}
              type="button"
            >
              Tolak
            </button>
          </>
        ) : (
          <button
            className={styles.secondaryButton}
            disabled={acting}
            onClick={() => onAction("CANCEL")}
            type="button"
          >
            Batalkan
          </button>
        )}
      </div>
    </article>
  );
}

export function CommunityFriendsPage() {
  const [activeView, setActiveView] =
    useState<CommunityFriendshipView>("FRIENDS");
  const friends = useCommunityFriends(activeView);

  return (
    <CommunityShell
      activeView="friends"
      state={{
        contributionCount: friends.meta.total,
        statusLabel: "Friendship",
      }}
    >
      <div className={styles.detailLayout}>
        <div className={styles.requestTabs} role="tablist" aria-label="Teman">
          {FRIEND_TABS.map((tab) => (
            <button
              aria-selected={activeView === tab.value}
              className={
                activeView === tab.value
                  ? styles.segmentedButtonActive
                  : styles.segmentedButton
              }
              key={tab.value}
              onClick={() => setActiveView(tab.value)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {friends.loading ? (
          <section className={styles.feedState}>
            <span className={styles.eyebrow}>Teman</span>
            <h2>Memuat daftar...</h2>
          </section>
        ) : friends.error ? (
          <section className={styles.feedState} role="alert">
            <span className={styles.eyebrow}>Teman error</span>
            <h2>Daftar teman belum bisa dimuat.</h2>
            <p>{friends.error}</p>
            <button
              className={styles.secondaryButton}
              onClick={friends.reload}
              type="button"
            >
              Coba lagi
            </button>
          </section>
        ) : friends.items.length === 0 ? (
          <section className={styles.feedState}>
            <span className={styles.eyebrow}>Teman</span>
            <h2>Belum ada data.</h2>
          </section>
        ) : (
          <section className={styles.friendList}>
            {friends.items.map((item) => (
              <FriendCard
                acting={friends.actingId === item.friendshipId}
                item={item}
                key={item.friendshipId}
                view={activeView}
                onAction={(action) =>
                  void friends.act(item.friendshipId, action)
                }
              />
            ))}
          </section>
        )}
      </div>
    </CommunityShell>
  );
}
