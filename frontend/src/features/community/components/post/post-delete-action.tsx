"use client";

import { MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import styles from "../community.module.css";

export function PostDeleteAction({ deleting = false, moderation = false, onDelete }: {
  deleting?: boolean;
  moderation?: boolean;
  onDelete(): Promise<boolean>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [menuOpen]);
  useEffect(() => {
    if (confirming && !dialog.current?.open) {
      dialog.current?.showModal();
      cancel.current?.focus();
    } else if (!confirming && dialog.current?.open) {
      dialog.current.close();
      trigger.current?.focus();
    }
  }, [confirming]);
  return <div ref={menu} className={styles.postDelete} onKeyDown={(event) => {
    if (event.key === "Escape" && menuOpen) { setMenuOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} type="button" title="Opsi postingan" className={styles.iconButton} aria-label="Opsi postingan" aria-expanded={menuOpen}
      onClick={() => setMenuOpen((value) => !value)}><MoreVertical size={18} /></button>
    {menuOpen ? <button type="button" className={styles.deleteMenuAction} onClick={() => { setMenuOpen(false); setConfirming(true); }}>
      <Trash2 size={16} />Hapus postingan
    </button> : null}
    <dialog ref={dialog} aria-labelledby={titleId} className={styles.deleteDialog} onCancel={(event) => { event.preventDefault(); setConfirming(false); }}>
      <h3 id={titleId}>Hapus postingan ini?</h3>
      <p>{moderation
        ? "Postingan pengguna ini akan dihapus dari Community sebagai tindakan moderasi."
        : "Postingan ini akan dihapus dari Community."}</p>
      <div className={styles.deleteDialogActions}>
        <button ref={cancel} type="button" disabled={deleting} onClick={() => setConfirming(false)}>Batal</button>
        <button type="button" disabled={deleting} className={styles.dangerButton} onClick={async () => {
          if (await onDelete()) setConfirming(false);
        }}>{deleting ? "Menghapus..." : "Hapus"}</button>
      </div>
    </dialog>
  </div>;
}
