type LandingMapArtworkProps = {
  className?: string;
};

/**
 * A local, data-safe map fallback used while the interactive MapLibre surface
 * is loading. It deliberately contains no captured UI or production location
 * data, so the landing page still reads as a map rather than a page screenshot.
 */
export function LandingMapArtwork({ className = "" }: LandingMapArtworkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 720 520"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="720" height="520" fill="#eff7f7" />
      <path d="M0 0H203C194 55 218 92 198 142C179 191 142 203 152 253C162 302 204 326 181 378C163 419 111 443 102 520H0V0Z" fill="#bfe8ef" />
      <path d="M720 0H581C563 42 567 85 544 120C518 159 476 178 490 226C504 274 572 285 576 336C580 390 533 416 527 520H720V0Z" fill="#caebdb" />
      <path d="M242 18L337 42L317 116L220 94Z" fill="#d9efcc" />
      <path d="M470 85L558 106L548 177L450 156Z" fill="#d9efcc" />
      <path d="M302 304L382 327L363 402L282 380Z" fill="#d9efcc" />
      <path d="M74 352L150 377L132 449L54 427Z" fill="#d9efcc" />

      <g stroke="#ffffff" strokeWidth="17" strokeLinecap="round">
        <path d="M42 112C152 130 194 184 288 168C380 152 437 77 624 102" />
        <path d="M62 460C166 391 234 352 317 371C421 394 492 465 668 425" />
        <path d="M173 24C158 134 243 201 235 300C229 371 188 428 216 505" />
        <path d="M504 9C458 89 448 173 490 258C531 340 574 369 605 505" />
        <path d="M25 262C145 231 237 225 335 259C446 297 555 282 700 230" />
      </g>
      <g stroke="#d6e0e2" strokeWidth="5" strokeLinecap="round">
        <path d="M6 170C124 192 208 158 308 98C408 38 513 61 714 40" />
        <path d="M11 329C106 311 175 276 270 282C376 288 458 366 705 354" />
        <path d="M100 4C101 95 72 138 100 213C127 287 198 308 183 514" />
        <path d="M363 3C333 110 357 150 389 214C431 297 390 367 414 516" />
        <path d="M640 33C588 110 608 172 634 238C659 302 632 386 648 495" />
      </g>

      <path d="M275 118C344 76 438 113 458 185C476 250 435 311 364 318C294 324 238 286 228 220C219 171 238 140 275 118Z" fill="#62d6c8" fillOpacity="0.2" stroke="#42b9ac" strokeWidth="3" strokeDasharray="8 8" />
      <path d="M80 206C176 209 264 221 340 251C414 280 501 283 648 163" stroke="#f3bd3b" strokeWidth="9" strokeLinecap="round" />
      <path d="M181 134C245 160 311 206 373 255C427 298 479 338 568 408" stroke="#118ab2" strokeWidth="10" strokeLinecap="round" />
      <path d="M181 134C245 160 311 206 373 255C427 298 479 338 568 408" stroke="#ffffff" strokeOpacity="0.72" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 12" />

      <g>
        <circle cx="181" cy="134" r="15" fill="#ffffff" />
        <circle cx="181" cy="134" r="10" fill="#118ab2" />
        <circle cx="373" cy="255" r="13" fill="#ffffff" />
        <circle cx="373" cy="255" r="8" fill="#118ab2" />
        <circle cx="568" cy="408" r="15" fill="#ffffff" />
        <circle cx="568" cy="408" r="10" fill="#367e77" />
        <circle cx="454" cy="179" r="12" fill="#ffffff" />
        <circle cx="454" cy="179" r="7" fill="#d8a519" />
      </g>

      <g fill="#66708d" fontFamily="Inter, Arial, sans-serif" fontSize="12" fontWeight="700">
        <text x="196" y="118">Titik transit</text>
        <text x="387" y="241">Rute pejalan kaki</text>
        <text x="583" y="394">Usaha lokal</text>
      </g>
    </svg>
  );
}
