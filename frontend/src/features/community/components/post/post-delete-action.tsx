"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import styles from "../community.module.css";

export function PostDeleteAction({ authorName, deleting = false, moderation = false, onDelete }: {
  authorName: string;
  deleting?: boolean;
  moderation?: boolean;
  onDelete(): Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirming && !dialog.current?.open) {
      dialog.current?.showModal();
      cancel.current?.focus();
    } else if (!confirming && dialog.current?.open) {
      dialog.current.close();
      trigger.current?.focus();
    }
  }, [confirming]);
  return <div className={styles.postDelete}>
    <button ref={trigger} type="button" title="Hapus postingan" className={styles.deleteTrigger}
      onClick={() => setConfirming(true)}><Trash2 size={16} aria-hidden="true" /><span>Hapus</span></button>
    <dialog ref={dialog} aria-labelledby={titleId} className={styles.deleteDialog} onCancel={(event) => { event.preventDefault(); setConfirming(false); }}>
      <h3 id={titleId}>{moderation ? "Hapus postingan sebagai admin?" : "Hapus postingan?"}</h3>
      <p>{moderation
        ? `Postingan milik ${authorName} akan dihapus dari Community.`
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
