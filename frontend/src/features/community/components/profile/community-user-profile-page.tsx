"use client";

import Link from "next/link";

import { CommunityShell } from "../community-shell";
import { CommunityAvatar } from "../common/community-avatar";
import { useCommunityUserProfile } from "../../hooks/use-community-user-profile";
import styles from "../community.module.css";

type CommunityUserProfilePageProps = {
  userId: string;
};

export function CommunityUserProfilePage({
  userId,
}: CommunityUserProfilePageProps) {
  const detail = useCommunityUserProfile(userId);
  const profile = detail.profile;

  function renderFriendAction() {
    if (!profile) {
      return null;
    }

    if (profile.relationshipState === "SELF") {
      return <span className={styles.friendState}>Profil Community kamu</span>;
    }

    if (profile.relationshipState === "NONE") {
      return (
        <button
          className={styles.primaryButton}
          disabled={detail.acting}
          onClick={detail.sendRequest}
          type="button"
        >
          {detail.acting ? "Mengirim..." : "Tambah Teman"}
        </button>
      );
    }

    if (profile.relationshipState === "PENDING_OUTGOING") {
      return (
        <div className={styles.friendActionRow}>
          <span className={styles.friendState}>Permintaan terkirim</span>
          <button
            className={styles.secondaryButton}
            disabled={detail.acting}
            onClick={() => void detail.act("CANCEL")}
            type="button"
          >
            Batalkan
          </button>
        </div>
      );
    }

    if (profile.relationshipState === "PENDING_INCOMING") {
      return (
        <div className={styles.friendActionRow}>
          <button
            className={styles.primaryButton}
            disabled={detail.acting}
            onClick={() => void detail.act("ACCEPT")}
            type="button"
          >
            Terima
          </button>
          <button
            className={styles.secondaryButton}
            disabled={detail.acting}
            onClick={() => void detail.act("DECLINE")}
            type="button"
          >
            Tolak
          </button>
        </div>
      );
    }

    return (
      <div className={styles.friendActionRow}>
        <span className={styles.friendState}>Teman</span>
        <button
          className={styles.secondaryButton}
          disabled={detail.acting}
          onClick={() => void detail.act("UNFRIEND")}
          type="button"
        >
          Hapus Teman
        </button>
      </div>
    );
  }

  return (
    <CommunityShell
      state={{
        contributionCount: profile?.friendCount ?? 0,
        statusLabel: "Community Profile",
      }}
    >
      <div className={styles.detailLayout}>
        <div className={styles.detailToolbar}>
          <Link className={styles.locationLinkButton} href="/community">
            Kembali ke Community
          </Link>
          <Link className={styles.locationLinkButton} href="/community/friends">
            Teman
          </Link>
        </div>

        {detail.loading ? (
          <section className={styles.feedState}>
            <span className={styles.eyebrow}>Profil</span>
            <h2>Memuat profil...</h2>
          </section>
        ) : detail.error || !profile ? (
          <section className={styles.feedState} role="alert">
            <span className={styles.eyebrow}>Profil error</span>
            <h2>Profil Community belum bisa dimuat.</h2>
            <p>{detail.error ?? "Profil tidak ditemukan."}</p>
            <button
              className={styles.secondaryButton}
              onClick={detail.reload}
              type="button"
            >
              Coba lagi
            </button>
          </section>
        ) : (
          <section className={styles.profilePanel}>
            <CommunityAvatar
              avatarUrl={profile.avatarUrl}
              displayName={profile.displayName}
              size="large"
            />
            <div className={styles.profileBody}>
              <h2>{profile.displayName}</h2>
              <p>{profile.reputationLabel}</p>
              <dl className={styles.profileStats}>
                <div>
                  <dt>Konfirmasi</dt>
                  <dd>{profile.confirmedContributions}</dd>
                </div>
                <div>
                  <dt>Helpful</dt>
                  <dd>{profile.helpfulReceived}</dd>
                </div>
                <div>
                  <dt>Temuan</dt>
                  <dd>{profile.findingsCount}</dd>
                </div>
                <div>
                  <dt>Teman</dt>
                  <dd>{profile.friendCount}</dd>
                </div>
              </dl>
              {renderFriendAction()}
              {detail.actionError ? (
                <p className={styles.formError}>{detail.actionError}</p>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </CommunityShell>
  );
}
