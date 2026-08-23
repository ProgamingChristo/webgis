import styles from "./community.module.css";

export function CommunityEmptyState() {
  return (
    <section
      aria-labelledby="community-empty-title"
      className={styles.empty}
    >
      <span className={styles.eyebrow}>Feed foundation</span>
      <h2 id="community-empty-title">Belum ada postingan Community.</h2>
      <p>
        Jadilah yang pertama membagikan informasi lokal. Postingan akan
        tersimpan sebagai teks biasa yang aman dan tetap tampil setelah halaman
        dimuat ulang.
      </p>
    </section>
  );
}
