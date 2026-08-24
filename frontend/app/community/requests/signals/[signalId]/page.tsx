import { DemandSignalDetail } from "@/src/features/community/components/demand/demand-signal-detail";

type CommunityDemandSignalPageProps = {
  params: Promise<{
    signalId: string;
  }>;
};

export default async function CommunityDemandSignalPage({
  params,
}: CommunityDemandSignalPageProps) {
  const { signalId } = await params;

  return <DemandSignalDetail signalId={signalId} />;
}
