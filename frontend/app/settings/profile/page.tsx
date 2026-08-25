"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ImageUp,
  LoaderCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/src/components/providers/AuthProvider";
import type { UserContext } from "@/src/lib/auth-client";
import {
  getExperienceBadges,
  getPrimaryExperienceLabel,
} from "@/src/lib/user-experience";
import { GetraAppShell } from "@/src/components/getra-ui";
import { profileService } from "@/src/services/profile.service";

interface ProfileForm {
  display_name: string;
  username: string;
  avatar_url: string;
  phone_number: string;
  bio: string;
}

interface AvatarCrop {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

const DEFAULT_CROP: AvatarCrop = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1.08,
};

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "G"
  );
}

function createProfileForm(
  profile: UserContext["profile"] | null | undefined,
): ProfileForm {
  return {
    avatar_url: profile?.avatar_url ?? "",
    bio: profile?.bio ?? "",
    display_name: profile?.display_name ?? "",
    phone_number: profile?.phone_number ?? "",
    username: profile?.username ?? "",
  };
}

async function createCroppedAvatarFile(
  file: File,
  crop: AvatarCrop,
): Promise<File> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    const size = 512;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Browser tidak dapat memproses crop avatar.");
    }

    canvas.width = size;
    canvas.height = size;
    context.fillStyle = "#061018";
    context.fillRect(0, 0, size, size);

    const baseScale =
      Math.max(size / image.naturalWidth, size / image.naturalHeight) *
      crop.zoom;
    const drawWidth = image.naturalWidth * baseScale;
    const drawHeight = image.naturalHeight * baseScale;
    const maxPanX = Math.max(0, (drawWidth - size) / 2);
    const maxPanY = Math.max(0, (drawHeight - size) / 2);
    const panX = (crop.offsetX / 100) * maxPanX;
    const panY = (crop.offsetY / 100) * maxPanY;

    context.drawImage(
      image,
      (size - drawWidth) / 2 + panX,
      (size - drawHeight) / 2 + panY,
      drawWidth,
      drawHeight,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9),
    );

    if (!blob) {
      throw new Error("Crop avatar gagal dibuat.");
    }

    return new File([blob], "getra-avatar.webp", {
      type: "image/webp",
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Foto profil tidak bisa dibaca."));
    image.src = src;
  });
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { context, refresh } = useAuth();

  const [form, setForm] = useState<ProfileForm>(() =>
    createProfileForm(context?.profile),
  );
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>(DEFAULT_CROP);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successAlertName, setSuccessAlertName] = useState<string | null>(null);

  const previewName =
    form.display_name.trim() || context?.user.email || "Akun GETRA";
  const previewInitials = useMemo(
    () => initials(previewName),
    [previewName],
  );

  const badges = context ? getExperienceBadges(context) : [];
  const primaryExperience = context
    ? getPrimaryExperienceLabel(context)
    : "General / Commuter";

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        setForm(createProfileForm(context?.profile));
      },
      0,
    );

    return () => window.clearTimeout(timeoutId);
  }, [context?.profile]);

  useEffect(() => {
    let objectUrl: string | null = null;
    const timeoutId = window.setTimeout(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }

      objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [avatarFile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      let avatarUrl = form.avatar_url.trim() || null;

      if (avatarFile) {
        const croppedFile = await createCroppedAvatarFile(avatarFile, crop);
        avatarUrl = await profileService.uploadAvatar(croppedFile);
      }

      await profileService.updateOwnProfile({
        avatar_url: avatarUrl,
        bio: form.bio.trim() || null,
        display_name: form.display_name.trim(),
        phone_number: form.phone_number.trim() || null,
        username: form.username.trim() || null,
      });

      await refresh();
      setAvatarFile(null);
      setCrop(DEFAULT_CROP);
      setMessage("Profil berhasil diperbarui.");
      setSuccessAlertName(form.display_name.trim() || "GETRA user");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Profil gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const avatarImage = avatarPreview || form.avatar_url || null;

  return (
    <GetraAppShell
      description="Kelola foto profil, nama tampilan, username, nomor HP, dan bio yang tampil pada profil publik GETRA."
      eyebrow="Account settings"
      title="Profil GETRA"
      tone="profile"
    >
    <div className="relative overflow-hidden text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(154,242,74,0.12),transparent_28%),linear-gradient(120deg,rgba(255,255,255,0.025),transparent_30%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-cyan-300/20 px-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/65 hover:bg-cyan-300/8"
            type="button"
            onClick={() => router.push("/app")}
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>

          <div className="mt-8 rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[0.045] p-5">
            <div className="relative mx-auto size-36">
              <div className="grid size-36 place-items-center overflow-hidden rounded-full border border-cyan-200/55 bg-slate-900 text-4xl font-black text-cyan-100 shadow-[0_0_60px_rgba(34,211,238,0.14)]">
                {avatarImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={avatarImage}
                  />
                ) : (
                  previewInitials
                )}
              </div>
              <span className="absolute bottom-2 right-2 grid size-10 place-items-center rounded-full border border-slate-950 bg-gradient-to-br from-lime-300 to-cyan-300 text-slate-950 shadow-lg">
                <BadgeCheck size={18} />
              </span>
            </div>

            <p className="mt-6 text-center text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
              Account settings
            </p>
            <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight">
              Profil GETRA
            </h1>
            <p className="mx-auto mt-3 max-w-64 text-center text-sm leading-6 text-slate-400">
              Identitas yang rapi bikin interaksi GETRA terasa lebih manusiawi,
              bukan cuma koordinat dingin di peta.
            </p>
          </div>

          <section className="mt-5 rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
              <ShieldCheck size={15} />
              Tipe akun
            </div>
            <strong className="mt-4 block text-2xl">
              {context?.profile?.account_role ?? "USER"}
            </strong>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Role otorisasi tetap USER/ADMIN. Jenis pengalaman user berasal
              dari mode: General, UMKM, Investor, atau Pemerintah.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  className={`user-type-badge user-type-badge--${badge.tone}`}
                  key={`${badge.tone}-${badge.label}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
            <p className="mt-4 rounded-2xl border border-cyan-300/10 bg-slate-950/70 px-4 py-3 text-xs text-slate-400">
              Pengalaman aktif utama:{" "}
              <span className="font-bold text-cyan-100">
                {primaryExperience}
              </span>
            </p>
          </section>
        </aside>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/72 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex flex-col gap-3 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                Personal identity
              </p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                Atur profil publik & akun
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-400">
              Foto akan dipotong square agar tampil sempurna dalam bingkai
              lingkaran di header, dashboard, dan profil publik.
            </p>
          </div>

          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-5">
                <ProfileField label="Nama tampilan">
                  <input
                    className="getra-input"
                    maxLength={50}
                    minLength={2}
                    required
                    value={form.display_name}
                    onChange={(event) =>
                      updateField("display_name", event.target.value)
                    }
                  />
                </ProfileField>

                <ProfileField label="Username">
                  <input
                    className="getra-input"
                    maxLength={30}
                    pattern="[a-z0-9_]{3,30}"
                    placeholder="contoh: chris_getra"
                    value={form.username}
                    onChange={(event) =>
                      updateField("username", event.target.value.toLowerCase())
                    }
                  />
                </ProfileField>

                <ProfileField label="Nomor HP">
                  <input
                    className="getra-input"
                    inputMode="tel"
                    maxLength={32}
                    placeholder="+62..."
                    value={form.phone_number}
                    onChange={(event) =>
                      updateField("phone_number", event.target.value)
                    }
                  />
                </ProfileField>

                <ProfileField label="Bio">
                  <textarea
                    className="getra-input min-h-36 resize-none py-3"
                    maxLength={240}
                    placeholder="Tulis ringkasan singkat tentang kamu."
                    value={form.bio}
                    onChange={(event) => updateField("bio", event.target.value)}
                  />
                  <span className="mt-2 block text-right text-xs text-slate-500">
                    {form.bio.length}/240
                  </span>
                </ProfileField>
              </div>

              <section className="rounded-[1.75rem] border border-cyan-300/12 bg-cyan-300/[0.035] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                      Foto profil
                    </p>
                    <h3 className="mt-1 font-semibold">Crop lingkaran</h3>
                  </div>
                  <span className="grid size-10 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200">
                    <ImageUp size={18} />
                  </span>
                </div>

                <div className="mt-5 grid place-items-center">
                  <div className="relative size-56 overflow-hidden rounded-full border border-cyan-200/55 bg-slate-900 shadow-[0_0_80px_rgba(34,211,238,0.14)]">
                    {avatarImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="Preview crop avatar"
                        className="h-full w-full object-cover"
                        src={avatarImage}
                        style={
                          avatarPreview
                            ? {
                                transform: `scale(${crop.zoom}) translate(${crop.offsetX / 6}%, ${crop.offsetY / 6}%)`,
                              }
                            : undefined
                        }
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-5xl font-black text-cyan-100">
                        {previewInitials}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-inset ring-white/10" />
                  </div>
                </div>

                <label className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/8 px-4 text-sm font-black text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-300/12">
                  <Camera size={16} />
                  Pilih foto dari perangkat
                  <input
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setAvatarFile(file);
                      setCrop(DEFAULT_CROP);
                      setError(null);
                      setMessage(null);
                    }}
                  />
                </label>

                <div className="mt-4 grid gap-4">
                  <CropSlider
                    disabled={!avatarPreview}
                    label="Zoom"
                    max={2}
                    min={1}
                    step={0.01}
                    value={crop.zoom}
                    onChange={(value) =>
                      setCrop((current) => ({ ...current, zoom: value }))
                    }
                  />
                  <CropSlider
                    disabled={!avatarPreview}
                    label="Geser horizontal"
                    max={100}
                    min={-100}
                    step={1}
                    value={crop.offsetX}
                    onChange={(value) =>
                      setCrop((current) => ({ ...current, offsetX: value }))
                    }
                  />
                  <CropSlider
                    disabled={!avatarPreview}
                    label="Geser vertikal"
                    max={100}
                    min={-100}
                    step={1}
                    value={crop.offsetY}
                    onChange={(value) =>
                      setCrop((current) => ({ ...current, offsetY: value }))
                    }
                  />
                </div>

                <button
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!avatarPreview}
                  type="button"
                  onClick={() => setCrop(DEFAULT_CROP)}
                >
                  <RotateCcw size={14} />
                  Reset crop
                </button>

                <div className="mt-5">
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Atau URL foto publik
                  </label>
                  <input
                    className="getra-input"
                    placeholder="https://..."
                    type="url"
                    value={form.avatar_url}
                    onChange={(event) => {
                      setAvatarFile(null);
                      updateField("avatar_url", event.target.value);
                    }}
                  />
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Format: JPG, PNG, WEBP, GIF. Maksimal 2 MB. Upload diproses
                  melalui backend GETRA lalu disimpan ke bucket avatar.
                </p>
              </section>
            </div>

            {message ? (
              <p className="flex items-center gap-2 rounded-2xl border border-lime-300/30 bg-lime-300/12 px-4 py-3 text-sm font-bold text-lime-100 shadow-[0_0_32px_rgba(154,242,74,0.08)]">
                <CheckCircle2 size={16} />
                {message}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-6">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-cyan-300/20 px-4 text-sm font-black text-cyan-100 transition hover:border-cyan-300/70 hover:bg-cyan-300/8"
                type="button"
                onClick={() => router.push(`/users/${context?.user.id ?? ""}`)}
              >
                <UserRound size={16} />
                Lihat profil publik
              </button>

              <button
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/25 bg-gradient-to-r from-lime-300 via-emerald-200 to-cyan-300 px-7 text-sm font-black uppercase tracking-[0.04em] text-slate-950 shadow-[0_14px_35px_rgba(34,211,238,0.22)] ring-1 ring-slate-950/10 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70"
                disabled={saving}
                type="submit"
              >
                {saving ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Simpan profil
              </button>
            </div>
          </form>
        </section>
      </div>

      {successAlertName ? (
        <SuccessAlert
          name={successAlertName}
          onClose={() => setSuccessAlertName(null)}
        />
      ) : null}
    </div>
    </GetraAppShell>
  );
}

function ProfileField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function SuccessAlert({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-success-title"
    >
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] border border-cyan-200/20 bg-slate-950 shadow-2xl shadow-cyan-950/40">
        <div className="bg-[radial-gradient(circle_at_top,rgba(154,242,74,0.2),transparent_42%),linear-gradient(135deg,rgba(34,211,238,0.12),rgba(154,242,74,0.08))] px-7 py-8 text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full border border-lime-200/70 bg-lime-300 text-slate-950 shadow-[0_0_45px_rgba(154,242,74,0.35)]">
            <CheckCircle2 size={40} strokeWidth={3} />
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
            Profile updated
          </p>

          <h2
            className="mt-2 text-3xl font-black tracking-tight text-white"
            id="profile-success-title"
          >
            Welcome to GETRA, {name}
          </h2>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-300">
            Profil kamu sudah tersimpan. Identitas ini akan tampil di header,
            profil publik, dan pengalaman GETRA lainnya.
          </p>
        </div>

        <div className="grid gap-3 border-t border-white/8 bg-white/[0.025] px-7 py-5">
          <button
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-lime-300 to-cyan-300 px-5 text-sm font-black uppercase tracking-[0.05em] text-slate-950 shadow-lg shadow-cyan-950/25 transition hover:brightness-110"
            type="button"
            onClick={onClose}
          >
            Lanjut ke GETRA
          </button>
        </div>
      </section>
    </div>
  );
}

function CropSlider({
  disabled,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  disabled: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
        {label}
        <span className="text-slate-500">
          {label === "Zoom" ? `${value.toFixed(2)}x` : value}
        </span>
      </span>
      <input
        className="h-2 w-full accent-cyan-300 disabled:opacity-35"
        disabled={disabled}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
