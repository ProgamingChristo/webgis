"use client";

import Link from "next/link";

import type { CommuterRequestItem } from "../../types/community.types";
import {
  formatCommuterRequestCategory,
  formatCommunityTime,
  formatExpiry,
  formatIdr,
  formatLocationCoordinate,
  formatRadiusMeters,
} from "../../utils/community-format";
import styles from "../community.module.css";

type RequestCardProps = {
  request: CommuterRequestItem;
};

export function RequestCard({ request }: RequestCardProps) {
  return (
    <article className={styles.requestCard}>
      <header className={styles.requestCardHeader}>
        <div>
          <span className={styles.categoryBadge}>
            {formatCommuterRequestCategory(request.category)}
          </span>
          <Link className={styles.postLink} href={`/community/requests/${request.id}`}>
            <h3>{request.title}</h3>
          </Link>
        </div>
        <time dateTime={request.createdAt}>
          {formatCommunityTime(request.createdAt)}
        </time>
      </header>
      <p>{request.description}</p>
      <dl className={styles.requestFacts}>
        <div>
          <dt>Budget maksimal</dt>
          <dd>{formatIdr(request.maxBudget)}</dd>
        </div>
        <div>
          <dt>Radius</dt>
          <dd>{formatRadiusMeters(request.radiusMeters)}</dd>
        </div>
        <div>
          <dt>Aktif sampai</dt>
          <dd>{formatExpiry(request.expiresAt)}</dd>
        </div>
      </dl>
      <div className={styles.postLocation}>
        <strong>
          {request.location.visibility === "EXACT"
            ? "Titik presisi dibagikan"
            : "Sekitar lokasi ini"}
        </strong>
        <span>
          {formatLocationCoordinate(
            request.location.latitude,
            request.location.longitude,
          )}
        </span>
      </div>
    </article>
  );
}
