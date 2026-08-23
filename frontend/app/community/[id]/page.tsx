import { CommunityPostDetail } from "@/src/features/community/components/post/community-post-detail";

export default async function CommunityPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CommunityPostDetail postId={id} />;
}
