"use client";

import { useCallback, useEffect, useState } from "react";

import {
  actOnCommunityFriendship,
  getCommunityFriends,
} from "../api/community.api";
import { subscribeToCommunityRealtimeEvents } from "../services/community-realtime.service";
import { useAuth } from "@/src/components/providers/AuthProvider";
import type {
  CommunityFeedMeta,
  CommunityFriendListItem,
  CommunityFriendshipAction,
  CommunityFriendshipView,
} from "../types/community.types";

const INITIAL_META: CommunityFeedMeta = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 1,
};

export function useCommunityFriends(view: CommunityFriendshipView) {
  const { context } = useAuth();
  const [items, setItems] = useState<CommunityFriendListItem[]>([]);
  const [meta, setMeta] = useState<CommunityFeedMeta>(INITIAL_META);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getCommunityFriends(view, 1, INITIAL_META.limit);
      setItems(result.items);
      setMeta({
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.max(1, Math.ceil(result.total / result.limit)),
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Daftar teman gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void reload();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [reload]);

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
          void reload();
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
  }, [context?.user.id, reload]);

  const act = useCallback(
    async (friendshipId: string, action: CommunityFriendshipAction) => {
      setActingId(friendshipId);

      try {
        await actOnCommunityFriendship(friendshipId, action);
        await reload();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Status pertemanan gagal diperbarui.",
        );
      } finally {
        setActingId(null);
      }
    },
    [reload],
  );

  return {
    items,
    meta,
    loading,
    actingId,
    error,
    reload,
    act,
  };
}
