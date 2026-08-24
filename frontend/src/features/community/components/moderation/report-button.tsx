"use client";

import { useState } from "react";

import { createCommunityReport } from "../../api/community.api";
import type {
  CommunityReportReason,
  CommunityReportTargetType,
} from "../../types/community.types";
import styles from "../community.module.css";

const REPORT_REASONS: Array<{
  value: CommunityReportReason;
  label: string;
}> = [
  { value: "SPAM", label: "Spam" },
  { value: "INCORRECT_INFORMATION", label: "Informasi tidak tepat" },
  { value: "INVALID_PRICE", label: "Harga tidak valid" },
  { value: "INAPPROPRIATE_CONTENT", label: "Konten tidak pantas" },
  { value: "WRONG_LOCATION", label: "Lokasi salah" },
  { value: "DUPLICATE", label: "Duplikat" },
];

type ReportButtonProps = {
  targetType: CommunityReportTargetType;
  targetId: string;
};

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CommunityReportReason>("SPAM");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitReport() {
    setSubmitting(true);
    setMessage(null);

    try {
      await createCommunityReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim() || null,
      });
      setMessage("Laporan terkirim.");
      setOpen(false);
      setDetails("");
      setReason("SPAM");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Laporan gagal dikirim.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.reportAction}>
      <button
        className={styles.reportButton}
        onClick={() => setOpen(true)}
        type="button"
      >
        Laporkan
      </button>
      {message ? <span className={styles.reportMessage}>{message}</span> : null}

      {open ? (
        <div className={styles.reportDialog} role="dialog" aria-modal="true">
          <div className={styles.reportDialogPanel}>
            <header>
              <strong>Laporkan konten</strong>
              <button
                className={styles.locationLinkButton}
                onClick={() => setOpen(false)}
                type="button"
              >
                Tutup
              </button>
            </header>
            <label>
              <span>Alasan</span>
              <select
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as CommunityReportReason)
                }
              >
                {REPORT_REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Catatan</span>
              <textarea
                maxLength={500}
                onChange={(event) => setDetails(event.target.value)}
                value={details}
              />
            </label>
            <button
              className={styles.primaryButton}
              disabled={submitting}
              onClick={submitReport}
              type="button"
            >
              {submitting ? "Mengirim..." : "Kirim laporan"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
