"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { getUserContext, persistAuthSession, type BrowserAuthSession } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";

import styles from "../auth.module.css";

type Preference = "commuter" | "business" | "investor";

interface RegisterResponse {
  success: boolean;
  data?: { session?: BrowserAuthSession | null };
  error?: { message?: string };
}

const preferences: Array<{ value: Preference; title: string; description: string; icon: string }> = [
  { value: "commuter", title: "Komuter & Warga", description: "Cari tempat, rute, transportasi, dan akses di sekitar.", icon: "/images/auth/signup-walk.png" },
  { value: "business", title: "Pelaku UMKM", description: "Kelola atau klaim usaha, tingkatkan visibilitas, dan lihat kondisi sekitar.", icon: "/images/auth/signup-store.png" },
  { value: "investor", title: "Investor", description: "Lihat potensi wilayah, aktivitas, demand, dan peluang usaha.", icon: "/images/auth/signup-investor.png" },
];

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [preference, setPreference] = useState<Preference>("commuter");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const response = await fetch(getGetraApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, display_name: displayName.trim() }),
      });
      const json = (await response.json()) as RegisterResponse;
      if (!response.ok || !json.success) throw new Error(json.error?.message || "Pendaftaran gagal.");
      const session = json.data?.session;
      if (!session?.access_token || !session.refresh_token) throw new Error("Registrasi belum mengembalikan session. Pastikan email verification Supabase sedang OFF untuk development.");
      setSuccessMessage("Akun berhasil dibuat. Menyiapkan onboarding GETRA...");
      await persistAuthSession(session);
      const userContext = await getUserContext();
      if (!userContext?.profile) throw new Error("Akun dibuat, tetapi konteks GETRA belum tersedia. Coba masuk ulang.");
      router.replace(userContext.profile.onboarding_complete ? "/app" : "/onboarding");
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Pendaftaran gagal.");
    } finally { setLoading(false); }
  }

  return (
    <main className={`${styles.page} ${styles.signupPage}`}>
      <section className={`${styles.shell} ${styles.signupShell}`} aria-label="Buat akun GETRA">
        <aside className={`${styles.hero} ${styles.signupHero}`} aria-label="GETRA overview"><div className={styles.heroContent}><h1>Mulai melihat kota dari cara Anda sendiri.</h1><p>Temukan tempat, rute, dan peluang di sekitar Anda dengan lebih mudah.</p></div></aside>
        <section className={`${styles.formSide} ${styles.signupFormSide}`} aria-labelledby="signup-title"><div className={`${styles.card} ${styles.signupCard}`}>
          <Link href="/" className={styles.backLink}><img src="/images/auth/signup-back-arrow.png" width="16" height="16" alt="" aria-hidden="true" />Kembali ke Beranda</Link>
          <header className={styles.signupHeader}><h1 id="signup-title">Buat Akun GETRA</h1><p>Daftar untuk mulai menggunakan GETRA.</p></header>
          <button className={styles.googleButton} type="button" aria-label="Daftar dengan Google"><img src="/images/auth/signup-google-g.png" width="20" height="20" alt="" aria-hidden="true" />Daftar dengan Google</button>
          <div className={styles.signupDivider}><span>atau daftar dengan email</span></div>
          <p className={styles.signupSwitch}>Sudah punya akun? <Link href="/login">Masuk</Link></p>
          <form className={styles.signupForm} onSubmit={handleSubmit}>
            <div className={styles.field}><label htmlFor="display-name">NAMA LENGKAP</label><div className={styles.inputWrap}><input id="display-name" type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nama lengkap Anda" autoComplete="name" required /></div></div>
            <div className={styles.field}><label htmlFor="email">ALAMAT EMAIL</label><div className={styles.inputWrap}><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" autoComplete="email" required /></div></div>
            <div className={styles.field}><label htmlFor="password">KATA SANDI</label><div className={styles.inputWrap}><input id="password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" minLength={8} autoComplete="new-password" required /><button className={styles.passwordToggle} type="button" onClick={() => setPasswordVisible((value) => !value)} aria-label={passwordVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}><img src="/images/auth/signup-eye.png" width="20" height="20" alt="" /></button></div></div>
            <fieldset className={styles.preferenceField}><legend>GETRA AKAN ANDA GUNAKAN SEBAGAI?</legend><p>Pilihan ini dapat diubah kapan saja.</p><div>{preferences.map((option) => <label className={`${styles.preferenceCard} ${preference === option.value ? styles.preferenceSelected : ""}`} key={option.value}><input type="radio" name="preference" value={option.value} checked={preference === option.value} onChange={() => setPreference(option.value)} /><span className={styles.radioMark} aria-hidden="true" /><span><b>{option.title}</b><small>{option.description}</small></span><img src={option.icon} width="24" height="24" alt="" aria-hidden="true" /></label>)}</div></fieldset>
            <label className={styles.terms}><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required /><span>Saya menyetujui <a href="/terms">Ketentuan Layanan</a> dan <a href="/privacy">Kebijakan Privasi</a>.</span></label>
            {errorMessage ? <p className={styles.error} role="alert">{errorMessage}</p> : null}{successMessage ? <p className={styles.success}>{successMessage}</p> : null}
            <button className={styles.submitButton} type="submit" disabled={loading}>{loading ? "Membuat akun..." : "Buat Akun"}</button>
          </form>
        </div></section>
      </section>
    </main>
  );
}
