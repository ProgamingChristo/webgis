"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Search, UserPlus, Users } from "lucide-react";

import { CommunityShell } from "../community-shell";
import { CommunityAvatar } from "../common/community-avatar";
import { useCommunityFriends } from "../../hooks/use-community-friends";
import { sendCommunityFriendRequest } from "../../api/community.api";
import { authenticatedFetch } from "../../../../lib/auth-client";
import { getGetraApiBaseUrl } from "../../../../lib/api-base-url";
import type {
  CommunityFriendListItem,
  CommunityFriendshipView,
} from "../../types/community.types";
import styles from "../community.module.css";

type ActiveTab = CommunityFriendshipView | "EXPLORE";

type PublicProfile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  stakeholder_modes?: string[];
};

const FRIEND_TABS: Array<{
  value: ActiveTab;
  label: string;
}> = [
  { value: "FRIENDS", label: "Teman Saya" },
  { value: "INCOMING", label: "Permintaan Masuk" },
  { value: "OUTGOING", label: "Permintaan Terkirim" },
  { value: "EXPLORE", label: "Cari Teman" },
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("FRIENDS");
  const friendsView: CommunityFriendshipView =
    activeTab === "EXPLORE" ? "FRIENDS" : activeTab;
  const friends = useCommunityFriends(friendsView);

  // Explore & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const reloadProfiles = useCallback(() => {
    if (activeTab !== "EXPLORE") return;
    setProfilesLoading(true);
    setProfilesError(null);
    const baseUrl = getGetraApiBaseUrl();
    const params = new URLSearchParams({ limit: "50" });
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }
    authenticatedFetch(`${baseUrl}/api/profiles?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data pengguna GETRA.");
        return res.json();
      })
      .then((json) => {
        const list = (json.data?.profiles || json.data || []) as PublicProfile[];
        setProfiles(list);
      })
      .catch((err) => {
        setProfilesError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      })
      .finally(() => {
        setProfilesLoading(false);
      });
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (activeTab !== "EXPLORE") {
      return;
    }

    let ignore = false;
    const timer = setTimeout(() => {
      setProfilesLoading(true);
      setProfilesError(null);

      const baseUrl = getGetraApiBaseUrl();
      const params = new URLSearchParams({ limit: "50" });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      authenticatedFetch(`${baseUrl}/api/profiles?${params.toString()}`)
        .then((res) => {
          if (!res.ok) throw new Error("Gagal mengambil data pengguna GETRA.");
          return res.json();
        })
        .then((json) => {
          if (!ignore) {
            const list = (json.data?.profiles || json.data || []) as PublicProfile[];
            setProfiles(list);
          }
        })
        .catch((err) => {
          if (!ignore) {
            setProfilesError(err instanceof Error ? err.message : "Terjadi kesalahan.");
          }
        })
        .finally(() => {
          if (!ignore) {
            setProfilesLoading(false);
          }
        });
    }, 150);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [activeTab, searchQuery]);

  async function handleSendFriendRequest(userId: string) {
    setSentRequests((prev) => ({ ...prev, [userId]: true }));
    setActionFeedback(null);
    try {
      await sendCommunityFriendRequest(userId);
      setActionFeedback("Permintaan pertemanan berhasil dikirim!");
      friends.reload();
    } catch (err) {
      setActionFeedback(
        err instanceof Error
          ? err.message
          : "Gagal mengirim permintaan pertemanan.",
      );
    }
  }

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
              aria-selected={activeTab === tab.value}
              className={
                activeTab === tab.value
                  ? styles.segmentedButtonActive
                  : styles.segmentedButton
              }
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "EXPLORE" ? (
          <section className="space-y-4">
            {/* Search Input Box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-sky-600" size={18} />
                <h3 className="font-bold text-slate-900 text-base">
                  Cari & Tambah Teman di GETRA
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Temukan seluruh pengguna yang terdaftar di GETRA untuk menjalin
                komunikasi, melihat kontribusi, dan berbagi rute komuter.
              </p>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama atau username pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 outline-hidden transition"
                />
              </div>

              {actionFeedback && (
                <div className="mt-3 rounded-lg bg-sky-50 border border-sky-200 p-2.5 text-xs font-semibold text-sky-800">
                  {actionFeedback}
                </div>
              )}
            </div>

            {/* Profile Results */}
            {profilesLoading ? (
              <section className={styles.feedState}>
                <span className={styles.eyebrow}>Cari Pengguna</span>
                <h2>Memuat daftar pengguna GETRA...</h2>
              </section>
            ) : profilesError ? (
              <section className={styles.feedState} role="alert">
                <span className={styles.eyebrow}>Gagal</span>
                <h2>Data pengguna belum dapat dimuat.</h2>
                <p>{profilesError}</p>
                <button
                  className={styles.secondaryButton}
                  onClick={reloadProfiles}
                  type="button"
                >
                  Coba lagi
                </button>
              </section>
            ) : profiles.length === 0 ? (
              <section className={styles.feedState}>
                <span className={styles.eyebrow}>Hasil Pencarian</span>
                <h2>Tidak ada pengguna ditemukan.</h2>
                <p className="text-xs text-slate-500">
                  Coba kata kunci nama atau username lain.
                </p>
              </section>
            ) : (
              <div className={styles.friendList}>
                {profiles.map((user) => {
                  const isSent = sentRequests[user.id];

                  return (
                    <article className={styles.friendCard} key={user.id}>
                      <CommunityAvatar
                        avatarUrl={user.avatar_url}
                        displayName={user.display_name}
                      />
                      <div>
                        <strong className="text-slate-900 font-bold text-sm">
                          {user.display_name}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {user.username ? `@${user.username}` : "Pengguna GETRA"}
                        </span>
                        {user.bio && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                            {user.bio}
                          </p>
                        )}
                        {user.stakeholder_modes && user.stakeholder_modes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {user.stakeholder_modes.map((mode) => (
                              <span
                                key={mode}
                                className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                              >
                                {mode}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={styles.friendCardActions}>
                        <Link
                          className={styles.locationLinkButton}
                          href={`/community/users/${user.id}`}
                        >
                          Profil
                        </Link>
                        {isSent ? (
                          <button
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 cursor-default"
                            disabled
                            type="button"
                          >
                            <Check size={14} /> Terkirim
                          </button>
                        ) : (
                          <button
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700 transition"
                            onClick={() => void handleSendFriendRequest(user.id)}
                            type="button"
                          >
                            <UserPlus size={14} /> Tambah Teman
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : friends.loading ? (
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
            <p className="text-xs text-slate-500 mb-3">
              Anda dapat mencari pengguna GETRA dan menambahkan teman baru.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("EXPLORE")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 transition"
            >
              <UserPlus size={14} /> Cari & Tambah Teman Sekarang
            </button>
          </section>
        ) : (
          <section className={styles.friendList}>
            {friends.items.map((item) => (
              <FriendCard
                acting={friends.actingId === item.friendshipId}
                item={item}
                key={item.friendshipId}
                view={friendsView}
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
