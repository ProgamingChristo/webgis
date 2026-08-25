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
      description="Ruang kolaborasi berbasis lokasi untuk temuan warga, permintaan komuter, sinyal demand, dan peta budaya komunitas."
      eyebrow="GETRA WebGIS"
      title="GETRA Community"
      tone="community"
      actions={
        <dl className={styles.status} aria-label="Status Community">
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
