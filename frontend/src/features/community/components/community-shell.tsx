import type { ReactNode } from "react";
import { GetraAppShell } from "@/src/components/getra-ui";

import {
  CommunityNavigation,
  type CommunityView,
} from "./community-navigation";
import type { CommunityShellState } from "../types/community.types";
import styles from "./community.module.css";

const defaultShellState: CommunityShellState = {
  contributionCount: 0,
  statusLabel: "Development scaffold",
};

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
  state = defaultShellState,
}: CommunityShellProps) {
  return (
    <GetraAppShell
      description="Berbagi temuan, kondisi sekitar, dan informasi berbasis lokasi bersama komunitas."
      eyebrow="GETRA"
      title="Komunitas GETRA"
      tone="community"
      actions={
        <dl className={styles.status} aria-label="Status komunitas">
          <div>
            <dt>Kontribusi</dt>
            <dd>{state.contributionCount}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{state.statusLabel}</dd>
          </div>
        </dl>
      }
    >

      <CommunityNavigation
        activeView={activeView}
        onChangeView={onChangeView ?? (() => undefined)}
      />

      <section className={styles.content}>{children}</section>
    </GetraAppShell>
  );
}
