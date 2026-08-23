"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createCommunityComment,
  getCommunityComments,
  getCommunityPost,
  setCommunityReaction,
} from "../api/community.api";
import type {
  CommunityComment,
  CommunityFeedItem,
  CommunityFeedMeta,
  CommunityReactionType,
} from "../types/community.types";

const INITIAL_META: CommunityFeedMeta = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 1,
};

export function useCommunityPostDetail(postId: string) {
  const [post, setPost] = useState<CommunityFeedItem | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [meta, setMeta] = useState<CommunityFeedMeta>(INITIAL_META);
  const [loading, setLoading] = useState(true);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [pendingReaction, setPendingReaction] =
    useState<CommunityReactionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [postResult, commentResult] = await Promise.all([
        getCommunityPost(postId),
        getCommunityComments(postId, 1, INITIAL_META.limit),
      ]);

      setPost(postResult);
      setComments(commentResult.items);
      setMeta(commentResult.meta);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Thread Community gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDetail]);

  const submitComment = useCallback(
    async (content: string, parentCommentId?: string): Promise<boolean> => {
      setCommentSubmitting(true);
      setCommentError(null);

      try {
        const comment = await createCommunityComment(postId, {
          content,
          parentCommentId,
        });

        setComments((current) => [
          ...current.filter((item) => item.id !== comment.id),
          comment,
        ]);
        setPost((current) =>
          current
            ? {
                ...current,
                replyCount: current.replyCount + 1,
              }
            : current,
        );
        setMeta((current) => ({
          ...current,
          total: parentCommentId ? current.total : current.total + 1,
        }));
        return true;
      } catch (caught) {
        setCommentError(
          caught instanceof Error
            ? caught.message
            : "Balasan Community gagal dikirim.",
        );
        return false;
      } finally {
        setCommentSubmitting(false);
      }
    },
    [postId],
  );

  const toggleReaction = useCallback(
    async (reactionType: CommunityReactionType) => {
      if (!post) {
        return;
      }

      const active = post.reactions.viewerReactions.includes(reactionType);
      setPendingReaction(reactionType);

      try {
        const reactions = await setCommunityReaction(
          post.id,
          reactionType,
          !active,
        );

        setPost((current) =>
          current
            ? {
                ...current,
                reactions,
              }
            : current,
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Reaction Community gagal diperbarui.",
        );
      } finally {
        setPendingReaction(null);
      }
    },
    [post],
  );

  return {
    post,
    comments,
    meta,
    loading,
    commentSubmitting,
    pendingReaction,
    error,
    commentError,
    reload: loadDetail,
    submitComment,
    toggleReaction,
  };
}
