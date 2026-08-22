import fs from "node:fs";

const sourcePath =
  "d:/downloadnew/BRAND COFFEE SHOP DI KOTA ADM JAKARTA BARAT 2026.geojson";

const outPath =
  "D:/Getra_Production/data/coffee-shops-jakarta-barat.ts";

const geojson =
  JSON.parse(
    fs.readFileSync(
      sourcePath,
      "utf8",
    ),
  );

const shops =
  [];

const seenIds =
  new Map();

function text(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function slug(value) {
  return (
    text(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    "coffee-shop"
  );
}

function distanceMeters(a, b) {
  const earthRadiusMeters =
    6371008.8;

  const toRad =
    (value) =>
      (value * Math.PI) /
      180;

  const dLat =
    toRad(
      b.latitude -
        a.latitude,
    );

  const dLng =
    toRad(
      b.longitude -
        a.longitude,
    );

  const lat1 =
    toRad(
      a.latitude,
    );

  const lat2 =
    toRad(
      b.latitude,
    );

  const h =
    Math.sin(
      dLat / 2,
    ) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(
        dLng / 2,
      ) ** 2;

  return Math.round(
    earthRadiusMeters *
      2 *
      Math.atan2(
        Math.sqrt(h),
        Math.sqrt(
          1 - h,
        ),
      ),
  );
}

for (const [
  index,
  feature,
] of geojson.features.entries()) {
  const coordinates =
    feature?.geometry
      ?.coordinates;

  if (
    !Array.isArray(
      coordinates,
    ) ||
    coordinates.length <
      2
  ) {
    continue;
  }

  const longitude =
    Number(
      coordinates[0],
    );

  const latitude =
    Number(
      coordinates[1],
    );

  if (
    !Number.isFinite(
      longitude,
    ) ||
    !Number.isFinite(
      latitude,
    )
  ) {
    continue;
  }

  const properties =
    feature.properties ||
    {};

  const name =
    text(
      properties.NAMA,
    ) ||
    `Coffee Shop ${
      index + 1
    }`;

  const brand =
    text(
      properties.TIPE_3,
    ) ||
    "COFFEE SHOP";

  const baseId =
    `${slug(brand)}-${slug(name)}-${longitude.toFixed(6)}-${latitude.toFixed(6)}`;

  const count =
    seenIds.get(
      baseId,
    ) || 0;

  seenIds.set(
    baseId,
    count + 1,
  );

  const id =
    count > 0
      ? `${baseId}-${count + 1}`
      : baseId;

  shops.push({
    id,
    name,
    category:
      "Kopi",
    brand,
    longitude,
    latitude,
    walkingMinutes:
      0,
    distanceMeters:
      0,
    accessibilityScore:
      0,
    priceLabel:
      "Sedang",
    openNow:
      text(
        properties.STATUS,
      ).toUpperCase() ===
      "BUKA",
    source:
      "GeoJSON coffee shop Jakarta Barat 2026",
    status:
      "verified",
    updatedAt:
      text(
        properties[
          "TANGGAL UPDATE"
        ],
      ) ||
      text(
        properties[
          "TANGGAL PENGUMPULAN"
        ],
      ) ||
      "Q2 2026",
    limitation:
      "Titik mengikuti koordinat asli GeoJSON. Walking time dan skor akses belum dihitung dengan pedestrian network.",
    address:
      text(
        properties.ALAMAT,
      ),
    phone:
      text(
        properties.TELEPON,
      ),
    district:
      text(
        properties.KECAMATAN,
      ),
    village:
      text(
        properties.DESA,
      ),
    city:
      text(
        properties.KABKOT,
      ),
    province:
      text(
        properties.PROVINSI,
      ),
    collectedAt:
      text(
        properties[
          "TANGGAL PENGUMPULAN"
        ],
      ),
  });
}

const west =
  Math.min(
    ...shops.map(
      (shop) =>
        shop.longitude,
    ),
  );

const south =
  Math.min(
    ...shops.map(
      (shop) =>
        shop.latitude,
    ),
  );

const east =
  Math.max(
    ...shops.map(
      (shop) =>
        shop.longitude,
    ),
  );

const north =
  Math.max(
    ...shops.map(
      (shop) =>
        shop.latitude,
    ),
  );

const origin = {
  longitude:
    (west + east) /
    2,
  latitude:
    (south + north) /
    2,
};

for (const shop of shops) {
  shop.distanceMeters =
    distanceMeters(
      origin,
      shop,
    );

  shop.walkingMinutes =
    Math.max(
      1,
      Math.round(
        shop.distanceMeters /
          80,
      ),
    );

  shop.accessibilityScore =
    Math.max(
      45,
      Math.min(
        95,
        95 -
          Math.round(
            shop.distanceMeters /
              1200,
          ),
      ),
    );
}

shops.sort(
  (a, b) =>
    a.name.localeCompare(
      b.name,
      "id",
    ) ||
    a.longitude -
      b.longitude ||
    a.latitude -
      b.latitude,
);

const brands =
  [
    ...new Set(
      shops.map(
        (shop) =>
          shop.brand,
      ),
    ),
  ].sort(
    (a, b) =>
      a.localeCompare(
        b,
        "id",
      ),
  );

const content =
  `import type { Merchant } from "@/types/getra";\n\n` +
  `export const COFFEE_SHOP_SOURCE_NAME =\n` +
  `  "Brand Coffee Shop Kota Adm. Jakarta Barat 2026";\n\n` +
  `export const COFFEE_SHOP_BOUNDS = ${JSON.stringify(
    {
      west,
      south,
      east,
      north,
    },
    null,
    2,
  )} as const;\n\n` +
  `export const COFFEE_SHOP_ORIGIN = ${JSON.stringify(
    {
      id: "jakarta-barat-coffee-dataset-center",
      name: "Pusat sebaran coffee shop Jakarta Barat",
      longitude:
        Number(
          origin.longitude.toFixed(
            9,
          ),
        ),
      latitude:
        Number(
          origin.latitude.toFixed(
            9,
          ),
        ),
    },
    null,
    2,
  )} as const;\n\n` +
  `export const COFFEE_SHOP_BRANDS = ${JSON.stringify(
    brands,
    null,
    2,
  )} as const;\n\n` +
  `export const COFFEE_SHOPS: Merchant[] = ${JSON.stringify(
    shops,
    null,
    2,
  )};\n`;

fs.writeFileSync(
  outPath,
  content,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      outPath,
      count:
        shops.length,
      bounds: {
        west,
        south,
        east,
        north,
      },
      brandCount:
        brands.length,
    },
    null,
    2,
  ),
);
