"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { useAuth } from "@/src/components/providers/AuthProvider";
import {
  getCommunityNotifications,
  markAllCommunityNotificationsRead,
  markCommunityNotificationRead,
} from "../../api/community.api";
import { subscribeToCommunityRealtimeEvents } from "../../services/community-realtime.service";
import type { CommunityNotification } from "../../types/community.types";
import { CommunityAvatar } from "../common/community-avatar";
import styles from "../community.module.css";

function labelNotification(notification: CommunityNotification): string {
  const actor = notification.actorDisplayName || "Pengguna GETRA";

  switch (notification.type) {
    case "POST_REPLY":
      return `${actor} membalas postingan kamu`;
    case "COMMENT_REPLY":
      return `${actor} membalas komentarmu`;
    case "POST_CONFIRMED":
      return `${actor} mengonfirmasi postingan kamu`;
    case "UMKM_RESPONSE":
      return `${actor} memberi respons UMKM`;
    case "FRIEND_REQUEST":
      return `${actor} mengirim permintaan teman`;
    case "FRIEND_ACCEPTED":
      return `${actor} menerima permintaan teman`;
  }
}

export function CommunityNotificationsMenu() {
  const { context } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CommunityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!context?.user.id) {
      return;
    }

    setLoading(true);

    try {
      const result = await getCommunityNotifications(1, 10);
      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [context?.user.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadNotifications]);

  useEffect(() => {
    if (!context?.user.id) {
      return;
    }

    let mounted = true;
    let subscription: { unsubscribe(): void } | null = null;

    void subscribeToCommunityRealtimeEvents(
      {
        recipientUserId: context.user.id,
      },
      () => {
        if (mounted) {
          void loadNotifications();
        }
      },
    ).then((nextSubscription) => {
      if (mounted) {
        subscription = nextSubscription;
      } else {
        nextSubscription.unsubscribe();
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [context?.user.id, loadNotifications]);

  async function handleMarkAllRead() {
    await markAllCommunityNotificationsRead();
    await loadNotifications();
  }

  async function handleNotificationClick(notification: CommunityNotification) {
    await markCommunityNotificationRead(notification.id);
    await loadNotifications();
  }

  return (
    <div className={styles.notificationMenu}>
      <button
        aria-label="Notifikasi Community"
        className={styles.notificationButton}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className={styles.notificationBadge}>{unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className={styles.notificationPanel}>
          <header className={styles.notificationHeader}>
            <strong>Community</strong>
            <button
              className={styles.locationLinkButton}
              disabled={unreadCount === 0}
              onClick={handleMarkAllRead}
              type="button"
            >
              Tandai dibaca
            </button>
          </header>

          {loading ? (
            <p className={styles.notificationEmpty}>Memuat...</p>
          ) : items.length === 0 ? (
            <p className={styles.notificationEmpty}>Belum ada notifikasi.</p>
          ) : (
            <div className={styles.notificationList}>
              {items.map((notification) => (
                <button
                  className={[
                    styles.notificationItem,
                    notification.readAt ? "" : styles.notificationItemUnread,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={notification.id}
                  onClick={() => void handleNotificationClick(notification)}
                  type="button"
                >
                  <CommunityAvatar
                    avatarUrl={notification.actorAvatarUrl}
                    displayName={
                      notification.actorDisplayName || "Pengguna GETRA"
                    }
                  />
                  <span>{labelNotification(notification)}</span>
                  <time dateTime={notification.createdAt}>
                    {new Date(notification.createdAt).toLocaleDateString("id-ID")}
                  </time>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
