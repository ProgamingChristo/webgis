import { BusinessSpaceWorkspace } from "@/src/features/business-space";
import { GetraGlobalHeader } from "@/src/components/getra-ui";
import { CommunityNotificationsMenu } from "@/src/features/community/components/notifications/community-notifications-menu";

export default function BusinessSpacePage() {
  return (
    <div className="workspace workspace--figma workspace--investor" data-active-experience="INVESTOR">
      <GetraGlobalHeader utilities={<CommunityNotificationsMenu variant="light" />} />
      <BusinessSpaceWorkspace />
    </div>
  );
}
