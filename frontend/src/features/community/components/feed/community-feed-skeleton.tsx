import styles from "../community.module.css";

export function CommunityFeedSkeleton() {
  return (
    <div className={styles.feedSkeleton} aria-label="Memuat feed Community">
      <span />
      <span />
      <span />
    </div>
  );
}
