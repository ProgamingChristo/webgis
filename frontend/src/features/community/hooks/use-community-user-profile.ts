"use client";

import { useCallback, useEffect, useState } from "react";

import {
  actOnCommunityFriendship,
  getCommunityUserProfile,
  sendCommunityFriendRequest,
} from "../api/community.api";
import { subscribeToCommunityRealtimeEvents } from "../services/community-realtime.service";
import { useAuth } from "@/src/components/providers/AuthProvider";
import type {
  CommunityFriendshipAction,
  CommunityUserProfile,
} from "../types/community.types";

export function useCommunityUserProfile(userId: string) {
  const { context } = useAuth();
  const [profile, setProfile] = useState<CommunityUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setProfile(await getCommunityUserProfile(userId));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Profil Community gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

  const sendRequest = useCallback(async () => {
    setActing(true);
    setActionError(null);

    try {
      setProfile(await sendCommunityFriendRequest(userId));
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "Permintaan teman gagal dikirim.",
      );
    } finally {
      setActing(false);
    }
  }, [userId]);

  const act = useCallback(
    async (action: CommunityFriendshipAction) => {
      if (!profile?.friendshipId) {
        return;
      }

      setActing(true);
      setActionError(null);

      try {
        await actOnCommunityFriendship(profile.friendshipId, action);
        await reload();
      } catch (caught) {
        setActionError(
          caught instanceof Error
            ? caught.message
            : "Status pertemanan gagal diperbarui.",
        );
      } finally {
        setActing(false);
      }
    },
    [profile, reload],
  );

  return {
    profile,
    loading,
    acting,
    error,
    actionError,
    reload,
    sendRequest,
    act,
  };
}
