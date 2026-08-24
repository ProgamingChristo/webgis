"use client";

import { useMemo, useState, type FormEvent } from "react";

import type {
  CommunityResponseMerchant,
  CommunityUmkmResponse,
  CommunityUmkmResponseStatus,
  CreateCommunityUmkmResponseInput,
} from "../../types/community.types";
import { formatCommunityTime } from "../../utils/community-format";
import styles from "../community.module.css";

const RESPONSE_STATUS_OPTIONS: {
  value: CommunityUmkmResponseStatus;
  label: string;
}[] = [
  { value: "AVAILABLE", label: "Sudah tersedia" },
  { value: "WILL_TRY", label: "Akan diuji" },
  { value: "PREPARING", label: "Sedang disiapkan" },
  { value: "UNAVAILABLE", label: "Belum dapat disediakan" },
];

type UmkmResponsePanelProps = {
  responses: CommunityUmkmResponse[];
  ownedMerchants: CommunityResponseMerchant[];
  submitting: boolean;
  error: string | null;
  onSubmit(input: CreateCommunityUmkmResponseInput): Promise<boolean>;
};

export function UmkmResponsePanel({
  responses,
  ownedMerchants,
  submitting,
  error,
  onSubmit,
}: UmkmResponsePanelProps) {
  const [merchantId, setMerchantId] = useState(ownedMerchants[0]?.id ?? "");
  const [status, setStatus] = useState<CommunityUmkmResponseStatus>("PREPARING");
  const [message, setMessage] = useState("");
  const canRespond = ownedMerchants.length > 0;
  const selectedMerchantId = merchantId || ownedMerchants[0]?.id || "";
  const existingResponse = useMemo(
    () =>
      responses.find((response) => response.merchant.id === selectedMerchantId),
    [selectedMerchantId, responses],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedMerchantId) {
      return;
    }

    const success = await onSubmit({
      merchant_id: selectedMerchantId,
      status,
      message: message.trim() || null,
    });

    if (success) {
      setMessage("");
    }
  }

  return (
    <section className={styles.responsePanel}>
      <header>
        <span className={styles.eyebrow}>Respons UMKM</span>
        <h3>Respons untuk signal ini</h3>
      </header>

      {responses.length === 0 ? (
        <p className={styles.formHint}>Belum ada UMKM yang merespons signal ini.</p>
      ) : (
        <div className={styles.responseList}>
          {responses.map((response) => (
            <article className={styles.responseCard} key={response.id}>
              <header>
                <strong>{response.merchant.displayName}</strong>
                <time dateTime={response.updatedAt}>
                  {formatCommunityTime(response.updatedAt)}
                </time>
              </header>
              <span>{formatResponseStatus(response.status)}</span>
              {response.message ? <p>{response.message}</p> : null}
            </article>
          ))}
        </div>
      )}

      {canRespond ? (
        <form className={styles.responseForm} onSubmit={submit}>
          <label>
            <span>Merchant</span>
            <select
              value={selectedMerchantId}
              onChange={(event) => setMerchantId(event.target.value)}
            >
              {ownedMerchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.displayName}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={styles.statusOptions}>
            <legend>Status</legend>
            {RESPONSE_STATUS_OPTIONS.map((option) => (
              <label key={option.value}>
                <input
                  checked={status === option.value}
                  name="response-status"
                  onChange={() => setStatus(option.value)}
                  type="radio"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <label>
            <span>Pesan</span>
            <textarea
              maxLength={500}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                existingResponse
                  ? "Perbarui pesan respons..."
                  : "Kami sedang menyiapkan paket Rp18.000"
              }
              value={message}
            />
          </label>
          {error ? <p className={styles.formError}>{error}</p> : null}
          <button
            className={styles.primaryButton}
            disabled={submitting || !selectedMerchantId}
            type="submit"
          >
            {submitting ? "Mengirim..." : "Kirim Respons"}
          </button>
        </form>
      ) : (
        <p className={styles.formHint}>
          Respons sebagai UMKM memerlukan merchant yang terhubung ke akun ini.
        </p>
      )}
    </section>
  );
}

function formatResponseStatus(status: CommunityUmkmResponseStatus): string {
  return (
    RESPONSE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}
