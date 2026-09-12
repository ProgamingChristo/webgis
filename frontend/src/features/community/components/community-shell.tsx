import type { ReactNode } from "react";
import { GetraAppShell } from "@/src/components/getra-ui";

import {
  CommunityNavigation,
  type CommunityView,
} from "./community-navigation";
import styles from "./community.module.css";
import { CommunityNotificationsMenu } from "./notifications/community-notifications-menu";
import type { CommunityShellState } from "../types/community.types";

type CommunityShellProps = {
  children?: ReactNode;
  activeView?: CommunityView;
  onChangeView?(view: CommunityView): void;
  state?: CommunityShellState;
};

export function CommunityShell({
  activeView = "home",
  children,
  onChangeView,
}: CommunityShellProps) {
  return (
    <GetraAppShell
      description="Cerita dan info dari sekitar Jakarta."
      eyebrow="GETRA"
      title="Komunitas"
      tone="community"
      utilities={<CommunityNotificationsMenu variant="light" />}
    >

      <CommunityNavigation
        activeView={activeView}
        onChangeView={onChangeView ?? (() => undefined)}
      />

      <section className={styles.content}>{children}</section>
    </GetraAppShell>
  );
}
