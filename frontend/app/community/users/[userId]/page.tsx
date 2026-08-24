import { CommunityUserProfilePage } from "@/src/features/community/components/profile/community-user-profile-page";

export default async function Page({
  params,
}: {
  params: Promise<{
    userId: string;
  }>;
}) {
  const { userId } = await params;

  return <CommunityUserProfilePage userId={userId} />;
}
