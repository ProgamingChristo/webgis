"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  Loader2,
  Plus,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { MenuItem } from "../../types/merchant-profile.types";
import { OwnerMerchantProfileService } from "../../services/merchant-profile.service";

function MenuItemImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
        <UtensilsCrossed size={32} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 400px"
      onError={() => setFailedSrc(src)}
    />
  );
}

function MenuPreviewThumb({ src }: { src: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return <UtensilsCrossed size={20} className="text-slate-400" />;
  }

  return (
    <Image
      src={src}
      alt="Preview menu"
      fill
      unoptimized
      className="object-cover"
      onError={() => setFailedSrc(src)}
    />
  );
}

export interface ProfileMenuCatalogCardProps {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
  disabled?: boolean;
}

export function ProfileMenuCatalogCard({
  items,
  onChange,
  disabled = false,
}: ProfileMenuCatalogCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form state
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemTag, setItemTag] = useState("");
  const [itemPhotoUrl, setItemPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openAddModal = () => {
    setEditingItem(null);
    setItemName("");
    setItemPrice("");
    setItemCategory("");
    setItemDesc("");
    setItemTag("");
    setItemPhotoUrl("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(String(item.price));
    setItemCategory(item.category || "");
    setItemDesc(item.description || "");
    setItemTag(item.tag || "");
    setItemPhotoUrl(item.photo_url || "");
    setFormError(null);
    setModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setFormError(null);
    try {
      const res = await OwnerMerchantProfileService.uploadPhoto(file);
      setItemPhotoUrl(res.image_url);
    } catch (err: any) {
      setFormError(err.message || "Gagal mengunggah foto menu.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setFormError("Nama menu wajib diisi.");
      return;
    }
    const priceNum = Number(itemPrice.replace(/[^0-9]/g, ""));
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError("Harga menu harus angka valid.");
      return;
    }

    if (editingItem) {
      const updated = items.map((it) =>
        it.id === editingItem.id
          ? {
              ...it,
              name: itemName.trim(),
              price: priceNum,
              category: itemCategory.trim() || undefined,
              description: itemDesc.trim() || undefined,
              tag: itemTag.trim() || undefined,
              photo_url: itemPhotoUrl || undefined,
            }
          : it
      );
      onChange(updated);
    } else {
      const newItem: MenuItem = {
        id: `menu-${Date.now()}`,
        name: itemName.trim(),
        price: priceNum,
        category: itemCategory.trim() || undefined,
        description: itemDesc.trim() || undefined,
        tag: itemTag.trim() || undefined,
        photo_url: itemPhotoUrl || undefined,
        is_available: true,
      };
      onChange([...items, newItem]);
    }
    setModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
  };

  const toggleAvailability = (id: string) => {
    onChange(
      items.map((it) =>
        it.id === id ? { ...it, is_available: !it.is_available } : it
      )
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Katalog Cepat Publik
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Menu Unggulan di Peta GETRA
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-500 disabled:opacity-50"
        >
          <Plus size={14} />
          Tambah Menu
        </button>
      </div>

      {/* Menu Grid or Empty State */}
      <div className="mt-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 shadow-xs">
              <UtensilsCrossed size={24} />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              Belum ada menu yang ditampilkan
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
              Tambahkan menu unggulan atau andalan usaha Anda agar calon pembeli di sekitar rute transit dapat melihat pilihan produk Anda di peta GETRA.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              disabled={disabled}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-500 disabled:opacity-50"
            >
              <Plus size={13} />
              Tambah Menu Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition hover:border-slate-300 hover:shadow-xs"
              >
                {/* Image & Price Header */}
                <div className="relative h-32 w-full bg-slate-100">
                  {item.photo_url ? (
                    <MenuItemImage src={item.photo_url} alt={item.name} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
                      <UtensilsCrossed size={32} />
                    </div>
                  )}

                  {/* Tag badge */}
                  {item.tag ? (
                    <span className="absolute top-2.5 left-2.5 rounded-md bg-sky-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                      {item.tag}
                    </span>
                  ) : null}

                  {/* Price */}
                  <span className="absolute top-2.5 right-2.5 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-bold text-white shadow-xs backdrop-blur-xs">
                    Rp {item.price.toLocaleString("id-ID")}
                  </span>
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col p-4">
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {item.name}
                  </h4>
                  {item.description ? (
                    <p className="mt-1 text-xs leading-5 text-slate-500 line-clamp-2">
                      {item.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400 italic">
                      Tidak ada deskripsi
                    </p>
                  )}

                  {/* Footer Action & Stock Toggle */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-500">
                        Status Persediaan
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleAvailability(item.id)}
                        disabled={disabled}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          item.is_available ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        role="switch"
                        aria-checked={item.is_available}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            item.is_available ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        disabled={disabled}
                        className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={disabled}
                        aria-label={`Hapus menu ${item.name}`}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Menu Modal */}
      {modalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="menu-dialog-title" className="text-base font-bold text-slate-900">
                {editingItem ? "Edit Menu Usaha" : "Tambah Menu Unggulan"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-3.5">
              {formError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                  {formError}
                </div>
              ) : null}

              {/* Photo Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Foto Menu
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 overflow-hidden">
                    {itemPhotoUrl ? (
                      <MenuPreviewThumb src={itemPhotoUrl} />
                    ) : (
                      <UtensilsCrossed size={20} className="text-slate-400" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <Loader2 size={13} className="animate-spin text-sky-600" />
                    ) : (
                      <Camera size={13} />
                    )}
                    <span>{uploadingPhoto ? "Mengunggah..." : "Unggah Foto"}</span>
                  </button>
                </div>
              </div>

              {/* Menu Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Menu *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Contoh: Es Kopi Susu Gula Aren"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Price & Tag */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Harga (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={500}
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="25000"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tag / Sorotan
                  </label>
                  <input
                    type="text"
                    value={itemTag}
                    onChange={(e) => setItemTag(e.target.value)}
                    placeholder="Contoh: Terlaris / Signature"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Deskripsi rasa, porsi, atau keunggulan menu..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-500"
                >
                  {editingItem ? "Perbarui Menu" : "Simpan Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
