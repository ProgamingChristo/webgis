"use client";

import { getAccessToken } from "@/src/lib/auth-client";
import { getBrowserSupabaseClient } from "@/src/lib/supabase/browser";

type CommunityRealtimeSubscription = {
  unsubscribe(): void;
};

type CommunityRealtimeFilter =
  | {
      postId: string;
    }
  | {
      signalId: string;
    }
  | {
      recipientUserId: string;
    };

function resolveRealtimeFilter(filter: CommunityRealtimeFilter): string {
  if ("postId" in filter) {
    return `post_id=eq.${filter.postId}`;
  }

  if ("signalId" in filter) {
    return `signal_id=eq.${filter.signalId}`;
  }

  return `recipient_user_id=eq.${filter.recipientUserId}`;
}

function resolveChannelName(filter: CommunityRealtimeFilter): string {
  if ("postId" in filter) {
    return `community-post-${filter.postId}`;
  }

  if ("signalId" in filter) {
    return `community-signal-${filter.signalId}`;
  }

  return `community-notifications-${filter.recipientUserId}`;
}

export async function subscribeToCommunityRealtimeEvents(
  filter: CommunityRealtimeFilter,
  onChange: () => void,
): Promise<CommunityRealtimeSubscription> {
  const supabase = getBrowserSupabaseClient();
  const token = await getAccessToken();

  if (token) {
    supabase.realtime.setAuth(token);
  }

  const channel = supabase
    .channel(resolveChannelName(filter))
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "community_realtime_events",
        filter: resolveRealtimeFilter(filter),
      },
      () => onChange(),
    )
    .subscribe();

  return {
    unsubscribe() {
      void supabase.removeChannel(channel);
    },
  };
}
