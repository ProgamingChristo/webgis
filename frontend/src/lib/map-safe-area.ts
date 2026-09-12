/**
 * GETRA Map Safe-Area Model
 *
 * Centralized source of truth for map viewport padding that accounts
 * for all visible UI controls so that fitBounds, easeTo, and marker
 * label placement never place critical routing elements underneath
 * a panel or control.
 *
 * Phase 12A.2.8A — Map Overlay Collision + Safe-Area Polish
 */

export interface MapSafeArea {
  /** Top inset: NavigationControl height + any top-chrome */
  top: number;
  /** Right inset: basemap switcher panel width + gap */
  right: number;
  /** Bottom inset: ScaleControl + basemap panel bottom gap */
  bottom: number;
  /** Left inset: left panel presence (always 0 inside .map-panel) */
  left: number;
}

/** Baseline safe-area when no DOM measurement is possible yet */
export const MAP_SAFE_AREA_DEFAULTS: MapSafeArea = {
  top: 56,
  right: 48,
  bottom: 60,
  left: 40,
};

/** Gap added around the measured panel rectangle */
const PANEL_GAP = 24;

/** Minimum right inset even when panel is not found */
const MIN_RIGHT_INSET = 48;

/** Minimum bottom inset for ScaleControl */
const MIN_BOTTOM_INSET = 52;

/**
 * Measure current basemap switcher panel width from the DOM.
 *
 * Returns the element's rendered width + PANEL_GAP, or
 * MIN_RIGHT_INSET when the element is not yet mounted / has zero size.
 *
 * Safe to call from a ResizeObserver callback or a React effect.
 */
export function measureBasemapPanelRight(
  mapContainer: HTMLElement,
): number {
  // The basemap switcher is a sibling inside .map-shell
  const shell = mapContainer.closest(".map-shell") ?? mapContainer.parentElement;
  const panel = shell?.querySelector<HTMLElement>(".basemap-switcher");
  if (!panel) return MIN_RIGHT_INSET;

  const rect = panel.getBoundingClientRect();
  if (rect.width <= 0) return MIN_RIGHT_INSET;

  // Panel is anchored to the right edge — use its rendered width.
  return Math.round(rect.width) + PANEL_GAP;
}

/**
 * Measure current basemap switcher panel height from the DOM.
 *
 * Returns the element's rendered height + PANEL_GAP, or
 * MIN_BOTTOM_INSET when the element is not yet mounted / has zero size.
 */
export function measureBasemapPanelBottom(
  mapContainer: HTMLElement,
): number {
  const shell = mapContainer.closest(".map-shell") ?? mapContainer.parentElement;
  const panel = shell?.querySelector<HTMLElement>(".basemap-switcher");
  if (!panel) return MIN_BOTTOM_INSET;

  const rect = panel.getBoundingClientRect();
  if (rect.height <= 0) return MIN_BOTTOM_INSET;

  return Math.round(rect.height) + PANEL_GAP;
}

/**
 * Compute complete MapSafeArea for a given map container.
 *
 * @param mapContainer  The `.map-canvas` HTMLDivElement
 * @param compact       Whether the viewport is in compact/mobile mode (<600px wide)
 */
export function computeMapSafeArea(
  mapContainer: HTMLElement,
  compact: boolean,
): MapSafeArea {
  const right = compact
    ? MIN_RIGHT_INSET
    : measureBasemapPanelRight(mapContainer);

  const bottom = compact
    ? measureBasemapPanelBottom(mapContainer)
    : MIN_BOTTOM_INSET;

  return {
    top: MAP_SAFE_AREA_DEFAULTS.top,
    right,
    bottom,
    left: MAP_SAFE_AREA_DEFAULTS.left,
  };
}

/**
 * Returns true when a screen-space x coordinate is within the
 * right-side safe area (i.e., potentially behind a right-anchored panel).
 *
 * Used by marker label anchor switching: if the marker projects into
 * this zone, flip the badge label to the left side of the marker dot.
 *
 * @param screenX       Pixel x from map.project(lngLat).x
 * @param containerWidth Total width of the map container element
 * @param safeRight     Current right safe-area in pixels
 */
export function isInRightSafeZone(
  screenX: number,
  containerWidth: number,
  safeRight: number,
): boolean {
  return screenX > containerWidth - safeRight - 20;
}

/**
 * Returns true when a screen-space x coordinate is within the
 * left-side safe area (left panel or controls).
 */
export function isInLeftSafeZone(
  screenX: number,
  safeLeft: number,
): boolean {
  return screenX < safeLeft + 20;
}
