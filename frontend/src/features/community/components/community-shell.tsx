import type { ReactNode } from "react";

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
    <main className={styles.feature}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>GETRA WebGIS</span>
          <h1>GETRA Community</h1>
        </div>
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
      </header>

      <CommunityNavigation
        activeView={activeView}
        onChangeView={onChangeView ?? (() => undefined)}
      />

      <section className={styles.content}>{children}</section>
    </main>
  );
}
