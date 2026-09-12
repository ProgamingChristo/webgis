"use client";

import Link from "next/link";
import { useEffect } from "react";

import styles from "./umkm-empty-state.module.css";

const benefits = [
  "Tampil di pencarian GETRA",
  "Lihat permintaan di sekitar",
  "Dapatkan insight area",
  "Buat promosi usaha",
];

export function UmkmEmptyState() {
  useEffect(() => {
    const shell = document.querySelector(".getra-app-shell--umkm");
    shell?.classList.add("umkm-empty-mode");
    return () => shell?.classList.remove("umkm-empty-mode");
  }, []);

  return (
    <section className={styles.emptyState} aria-labelledby="umkm-empty-title">
      <div className={styles.card}>
        <span className={styles.status}>Belum Ada Usaha Terdaftar</span>
        <span className={styles.icon} aria-hidden="true"><img src="/images/umkm/getra-mark.png" alt="" /></span>
        <h1 id="umkm-empty-title">Mulai Kelola Usaha di GETRA</h1>
        <p className={styles.description}>Daftarkan usaha kamu agar lebih mudah ditemukan dan mendapatkan insight dari area sekitar.</p>
        <section className={styles.benefits} aria-labelledby="umkm-benefits-title">
          <h2 id="umkm-benefits-title">Yang bisa kamu dapatkan</h2>
          <ul>{benefits.map((benefit) => <li key={benefit}><img src="/images/umkm/check.png" alt="" />{benefit}</li>)}</ul>
        </section>
        <Link className={styles.cta} href="/umkm/merchants/new">Daftarkan Usaha <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}
