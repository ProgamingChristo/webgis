"use client";

import Link from "next/link";

import type { CommunityDemandSignal } from "../../types/community.types";
import {
  formatCommuterRequestCategory,
  formatIdr,
  formatRadiusMeters,
} from "../../utils/community-format";
import styles from "../community.module.css";

type DemandSignalCardProps = {
  signal: CommunityDemandSignal;
};

export function DemandSignalCard({ signal }: DemandSignalCardProps) {
  return (
    <article className={styles.signalCard}>
      <header className={styles.signalCardHeader}>
        <div>
          <span className={styles.eyebrow}>Community Demand Signal</span>
          <h3>{formatCommuterRequestCategory(signal.category)}</h3>
        </div>
        <strong>{signal.requestCount} permintaan</strong>
      </header>
      <dl className={styles.requestFacts}>
        <div>
          <dt>Median</dt>
          <dd>{formatIdr(signal.budgetMedian)}</dd>
        </div>
        <div>
          <dt>Range</dt>
          <dd>
            {formatIdr(signal.budgetMin)} - {formatIdr(signal.budgetMax)}
          </dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>+/- {formatRadiusMeters(signal.clusterRadiusMeters)}</dd>
        </div>
      </dl>
      <div className={styles.signalFooter}>
        <span>7 hari terakhir</span>
        <Link
          className={styles.locationLinkButton}
          href={`/community/requests/signals/${signal.id}`}
        >
          Lihat detail
        </Link>
      </div>
    </article>
  );
}
