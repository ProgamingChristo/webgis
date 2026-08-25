"use client";

import { Search } from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import { searchContributionMerchants } from "../api/community-contributions.api";
import type {
  CommunityContributionMerchant,
} from "../types/community-contributions.types";
import styles from "./community-contributions.module.css";

type MerchantSearchFieldProps = {
  error?: string;
  value: CommunityContributionMerchant | null;
  onChange(value: CommunityContributionMerchant | null): void;
};

export function MerchantSearchField({
  error,
  onChange,
  value,
}: MerchantSearchFieldProps) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<CommunityContributionMerchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setSearchError(null);
      searchContributionMerchants(query.trim())
        .then((items) => {
          if (!cancelled) {
            setResults(items);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setSearchError("Tidak dapat memuat daftar usaha. Coba lagi.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className={styles.merchantSearch}>
      <label className={styles.field}>
        <span>Usaha</span>
        <input
          aria-describedby="merchant-search-help"
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim().length < 2) {
              setResults([]);
              setSearchError(null);
            }
            onChange(null);
          }}
          placeholder="Cari nama usaha canonical..."
          type="search"
          value={query}
        />
      </label>
      <p className={styles.help} id="merchant-search-help">
        Pilih usaha dari hasil pencarian. ID canonical dikirim ke backend.
      </p>
      {value ? (
        <p className={styles.statusText}>
          Dipilih: <strong>{value.name}</strong>
        </p>
      ) : null}
      {loading ? (
        <p className={styles.statusText} role="status">
          Memuat daftar usaha...
        </p>
      ) : null}
      {searchError ? <p className={styles.errorText}>{searchError}</p> : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}
      {results.length > 0 ? (
        <ul className={styles.merchantResultList}>
          {results.map((merchant) => (
            <li key={merchant.id}>
              <button
                className={
                  value?.id === merchant.id
                    ? styles.merchantResultButtonActive
                    : styles.merchantResultButton
                }
                onClick={() => {
                  onChange(merchant);
                  setQuery(merchant.name);
                }}
                type="button"
              >
                <strong>
                  <Search aria-hidden="true" size={13} /> {merchant.name}
                </strong>
                <span>{merchant.address || "Alamat belum tersedia"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
