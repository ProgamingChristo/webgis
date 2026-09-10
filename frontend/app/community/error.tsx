"use client";

import styles from "@/src/features/community/components/community.module.css";

export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className={styles.feature}>
      <section className={styles.empty}>
        <span className={styles.eyebrow}>Komunitas GETRA</span>
        <h1>Komunitas belum dapat dimuat.</h1>
        <p>Coba muat ulang halaman tanpa mengubah sesi aktif.</p>
        <button
          className={`${styles.navItem} ${styles.navItemActive}`}
          onClick={() => retry()}
          type="button"
        >
          Coba lagi
        </button>
      </section>
    </main>
  );
}
