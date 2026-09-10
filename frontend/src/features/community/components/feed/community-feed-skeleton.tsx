import styles from "../community.module.css";

export function CommunityFeedSkeleton() {
  return (
    <div className={styles.feedSkeleton} aria-label="Memuat kabar komunitas">
      <span />
      <span />
      <span />
    </div>
  );
}
