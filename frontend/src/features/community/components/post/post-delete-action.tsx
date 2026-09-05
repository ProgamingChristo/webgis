"use client";

import { MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "../community.module.css";

export function PostDeleteAction({ deleting = false, onDelete }: { deleting?: boolean; onDelete(): Promise<boolean> }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirming && !dialog.current?.open) {
      dialog.current?.showModal();
      cancel.current?.focus();
    } else if (!confirming && dialog.current?.open) dialog.current.close();
  }, [confirming]);
  return <div className={styles.postDelete}>
    <button type="button" className={styles.iconButton} aria-label="Opsi postingan" aria-expanded={menuOpen}
      onClick={() => setMenuOpen((value) => !value)}><MoreVertical size={18} /></button>
    {menuOpen ? <button type="button" className={styles.deleteMenuAction} onClick={() => { setMenuOpen(false); setConfirming(true); }}>
      <Trash2 size={16} />Hapus postingan
    </button> : null}
    <dialog ref={dialog} className={styles.deleteDialog} onCancel={(event) => { event.preventDefault(); setConfirming(false); }}>
      <h3>Hapus postingan ini?</h3>
      <p>Postingan akan dihapus dari Community. Tindakan moderasi tetap dicatat dengan aman.</p>
      <div className={styles.deleteDialogActions}>
        <button ref={cancel} type="button" disabled={deleting} onClick={() => setConfirming(false)}>Batal</button>
        <button type="button" disabled={deleting} className={styles.dangerButton} onClick={async () => {
          if (await onDelete()) setConfirming(false);
        }}>{deleting ? "Menghapus..." : "Hapus"}</button>
      </div>
    </dialog>
  </div>;
}
