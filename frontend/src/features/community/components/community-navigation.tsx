import type { CommunityNavigationItem } from "../types/community.types";
import styles from "./community.module.css";

export type CommunityView = "home" | "findings" | "map" | "requests" | "friends";

type ActiveCommunityNavigationItem = CommunityNavigationItem & {
  value: CommunityView;
  status: "available";
};

type PlannedCommunityNavigationItem = CommunityNavigationItem & {
  status: "planned";
};

type CommunityNavigationEntry =
  | ActiveCommunityNavigationItem
  | PlannedCommunityNavigationItem;

const communityNavigationItems: readonly CommunityNavigationEntry[] = [
  { label: "Beranda", status: "available", value: "home" },
  { label: "Temuan Komuter", status: "available", value: "findings" },
  { label: "Cultural Map", status: "available", value: "map" },
  { label: "Permintaan", status: "available", value: "requests" },
  { label: "Teman", status: "available", value: "friends" },
];

type CommunityNavigationProps = {
  activeView: CommunityView;
  onChangeView(view: CommunityView): void;
};

export function CommunityNavigation({
  activeView,
  onChangeView,
}: CommunityNavigationProps) {
  return (
    <nav
      aria-label="Navigasi Community"
      className={styles.navigation}
    >
      {communityNavigationItems.map((item) =>
        item.status === "available" ? (
          <button
            aria-current={activeView === item.value ? "page" : undefined}
            className={`${styles.navItem} ${
              activeView === item.value ? styles.navItemActive : ""
            }`}
            key={item.label}
            onClick={() => onChangeView(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ) : (
          <button
            className={styles.navItem}
            disabled
            key={item.label}
            type="button"
          >
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}
