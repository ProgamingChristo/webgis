import styles from "@/src/features/community/components/community.module.css";

export default function Loading() {
  return (
    <main className={styles.feature}>
      <section className={styles.empty} aria-live="polite">
        <span className={styles.eyebrow}>Komunitas GETRA</span>
        <h1>Memuat komunitas...</h1>
      </section>
    </main>
  );
}
