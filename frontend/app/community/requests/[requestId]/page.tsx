import { RequestDetail } from "@/src/features/community/components/request/request-detail";

type CommunityRequestPageProps = {
  params: Promise<{
    requestId: string;
  }>;
};

export default async function CommunityRequestPage({
  params,
}: CommunityRequestPageProps) {
  const { requestId } = await params;

  return <RequestDetail requestId={requestId} />;
}
