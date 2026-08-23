"use client";

import {
  BookUser,
  Megaphone,
  Settings,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  UserContext,
} from "@/src/lib/auth-client";
import {
  getExperienceBadges,
  getPrimaryExperienceLabel,
} from "@/src/lib/user-experience";

interface AccountMenuProps {
  context: UserContext | null;
}

function getInitials(
  name: string,
) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "G";
}

export function AccountMenu({
  context,
}: AccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] =
    useState(false);
  const menuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const displayName =
    context?.profile?.display_name?.trim() ||
    context?.user.email ||
    "Akun GETRA";

  const username =
    context?.profile?.username
      ? `@${context.profile.username}`
      : "Lengkapi username";

  const primaryExperience =
    getPrimaryExperienceLabel(
      context,
    );

  const experienceBadges =
    getExperienceBadges(
      context,
    );

  const initials =
    useMemo(
      () => getInitials(displayName),
      [displayName],
    );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(
      event: PointerEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    return () =>
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
  }, [open]);

  function navigate(
    href: string,
  ) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div
      className="account-menu"
      ref={menuRef}
    >
      <button
        className="account-menu__trigger"
        type="button"
        aria-expanded={open}
        onClick={() =>
          setOpen((current) => !current)
        }
      >
        <span className="account-menu__avatar">
          {context?.profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              src={context.profile.avatar_url}
            />
          ) : (
            initials
          )}
        </span>
        <span className="account-menu__identity">
          <strong>Profil</strong>
          <small>{displayName}</small>
          <em>{primaryExperience}</em>
        </span>
      </button>

      {open ? (
        <div className="account-menu__panel">
          <div className="account-menu__summary">
            <strong>{displayName}</strong>
            <span>{username}</span>
            <div className="account-menu__badges">
              {experienceBadges.map((badge) => (
                <span
                  className={`user-type-badge user-type-badge--${badge.tone}`}
                  key={`${badge.tone}-${badge.label}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/users/${context?.user.id ?? ""}`,
              )
            }
            disabled={!context}
          >
            <BookUser size={16} />
            Profil saya
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/settings/profile",
              )
            }
          >
            <Settings size={16} />
            Pengaturan profil
          </button>

          {context?.stakeholder_modes?.includes("UMKM") ? (
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/umkm/advertising",
                )
              }
              className="account-menu__advertising-link"
            >
              <Megaphone size={16} />
              Advertising UMKM
            </button>
          ) : null}

          <button
            type="button"
            onClick={() =>
              navigate(
                "/users",
              )
            }
          >
            <UsersRound size={16} />
            Lihat user lain
          </button>

          <div className="account-menu__username">
            {username}
          </div>
        </div>
      ) : null}
    </div>
  );
}
