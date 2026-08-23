import styles from "@/src/features/community/components/community.module.css";

export default function Loading() {
  return (
    <main className={styles.feature}>
      <section className={styles.empty} aria-live="polite">
        <span className={styles.eyebrow}>GETRA Community</span>
        <h1>Memuat Community...</h1>
      </section>
    </main>
  );
}
