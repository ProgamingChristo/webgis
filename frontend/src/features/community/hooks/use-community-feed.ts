"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createCommunityPost,
  getCommunityFeed,
  setCommunityReaction,
} from "../api/community.api";
import type {
  CommunityFeedItem,
  CommunityFeedMeta,
  CommunityFindingCategory,
  CommunityPostType,
  CommunityReactionType,
  CreateCommunityPostInput,
} from "../types/community.types";

const INITIAL_META: CommunityFeedMeta = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 1,
};

type CommunityFeedFilters = {
  type?: CommunityPostType;
  category?: CommunityFindingCategory | null;
};

const DEFAULT_FEED_FILTERS: CommunityFeedFilters = {};

export function useCommunityFeed(filters: CommunityFeedFilters = DEFAULT_FEED_FILTERS) {
  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [meta, setMeta] = useState<CommunityFeedMeta>(INITIAL_META);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [pendingReactionByPostId, setPendingReactionByPostId] =
    useState<Record<string, CommunityReactionType | null>>({});

  const loadPage = useCallback(
    async (page: number) => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      try {
        const result = await getCommunityFeed(page, meta.limit, filters);

        setMeta(result.meta);
        setItems((current) =>
          page === 1
            ? result.items
            : [...current, ...result.items],
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Feed Community gagal dimuat.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, meta.limit],
  );

  useEffect(() => {
    const requestId =
      window.setTimeout(
        () => {
          void loadPage(1);
        },
        0,
      );

    return () => {
      window.clearTimeout(
        requestId,
      );
    };
  }, [loadPage]);

  const publishPost = useCallback(
    async (input: CreateCommunityPostInput): Promise<boolean> => {
      setSubmitting(true);
      setPostError(null);

      try {
        const post = await createCommunityPost(input);

        const matchesFilter =
          (!filters.type || post.type === filters.type) &&
          (!filters.category || post.category === filters.category);

        if (matchesFilter) {
          setItems((current) => [
            post,
            ...current.filter((item) => item.id !== post.id),
          ]);
          setMeta((current) => ({
            ...current,
            total: current.total + 1,
            total_pages: Math.max(
              1,
              Math.ceil((current.total + 1) / current.limit),
            ),
          }));
        }
        return true;
      } catch (caught) {
        setPostError(
          caught instanceof Error
            ? caught.message
            : "Posting Community gagal.",
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [filters],
  );

  const toggleReaction = useCallback(
    async (
      postId: string,
      reactionType: CommunityReactionType,
    ): Promise<void> => {
      const target = items.find((item) => item.id === postId);

      if (!target) {
        return;
      }

      const nextActive = !target.reactions.viewerReactions.includes(
        reactionType,
      );
      setPendingReactionByPostId((current) => ({
        ...current,
        [postId]: reactionType,
      }));

      try {
        const reactions = await setCommunityReaction(
          postId,
          reactionType,
          nextActive,
        );

        setItems((current) =>
          current.map((item) =>
            item.id === postId
              ? {
                  ...item,
                  reactions,
                }
              : item,
          ),
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Reaction Community gagal diperbarui.",
        );
      } finally {
        setPendingReactionByPostId((current) => ({
          ...current,
          [postId]: null,
        }));
      }
    },
    [items],
  );

  return {
    items,
    meta,
    loading,
    loadingMore,
    submitting,
    error,
    postError,
    pendingReactionByPostId,
    reload: () => loadPage(1),
    loadMore: () => loadPage(meta.page + 1),
    publishPost,
    toggleReaction,
  };
}
