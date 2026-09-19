import type {
  TransitHub,
  AccessibilityCorridor,
  EcoCommuteTrip,
  SafetyCorridor,
  DirectoryMerchant,
  FlashDeal,
  CulinaryTrail,
  B2BSupplier,
  FoodDesertArea,
  SidewalkAssetSegment,
  RoadClosureScenario,
  InclusivityMetric,
  FootTrafficPoint,
  TodIndexStation,
  MarketGapItem,
  MerchantInsightSummary,
  CommunityQuest,
  PedestrianHazardReport,
  SystemServiceStatus,
  OpenGeoDataset,
} from "./types";

// 1. TRANSIT HUBS DATA
export const TRANSIT_HUBS: TransitHub[] = [
  {
    id: "hub-dukuh-atas",
    name: "Kawasan Berorientasi Transit (TOD) Dukuh Atas",
    category: "INTEGRATED",
    coordinates: [106.8227, -6.2008],
    lines: ["MRT Jakarta (Lin Utara-Selatan)", "KRL Commuter Line (Lin Cikarang/Bogor)", "LRT Jabodebek (Lin Cibubur/Bekasi)", "Kereta Bandara Soekarno-Hatta", "TransJakarta Koridor 1"],
    description: "Hub integrasi antarmoda tersibuk di Jakarta Pusat dengan jembatan penyeberangan multiguna (JPM) bebas hambatan bagi pejalan kaki.",
    dailyPassengers: 145000,
    accessibleElevator: true,
    connectedMerchantsCount: 38,
    nearbyMerchants: [
      { id: "m-da-1", name: "Soto Betawi H. Ma'ruf Dukuh Atas", category: "Kuliner Tradisional", distanceMeters: 180, walkingMinutes: 2, address: "Jl. Galunggung No. 12", coordinates: [106.8235, -6.2012] },
      { id: "m-da-2", name: "Kopi Tuku Terowongan Kendal", category: "Kopi & Minuman", distanceMeters: 80, walkingMinutes: 1, address: "Terowongan Kendal", coordinates: [106.8225, -6.2005] },
      { id: "m-da-3", name: "Warung Nasi Uduk Bu Sum", category: "Kuliner", distanceMeters: 320, walkingMinutes: 4, address: "Jl. Blora No. 8", coordinates: [106.8242, -6.2025] },
      { id: "m-da-4", name: "Roti Maryam & Martabak Kendal", category: "Jajanan", distanceMeters: 120, walkingMinutes: 2, address: "Jl. Kendal No. 4", coordinates: [106.823, -6.2002] }
    ]
  },
  {
    id: "hub-bundaran-hi",
    name: "Stasiun MRT Bundaran HI Astra",
    category: "MRT",
    coordinates: [106.8231, -6.1928],
    lines: ["MRT Jakarta", "TransJakarta Koridor 1 (Halte Bundaran HI Astra)"],
    description: "Pusat transit koridor protokol Jakarta dengan akses langsung ke trotoar lebar Jl. M.H. Thamrin dan kawasan perbelanjaan ramah pejalan kaki.",
    dailyPassengers: 52000,
    accessibleElevator: true,
    connectedMerchantsCount: 26,
    nearbyMerchants: [
      { id: "m-bhi-1", name: "Gado-Gado Bon-Bin Thamrin", category: "Kuliner", distanceMeters: 250, walkingMinutes: 3, address: "Pusat Jajanan Thamrin 10", coordinates: [106.8245, -6.1915] },
      { id: "m-bhi-2", name: "Es Cendol Durian Sabang", category: "Minuman", distanceMeters: 450, walkingMinutes: 6, address: "Kawasan Sabang Kuliner", coordinates: [106.8258, -6.1895] }
    ]
  },
  {
    id: "hub-sudirman",
    name: "Stasiun KRL Sudirman",
    category: "KRL",
    coordinates: [106.8229, -6.2022],
    lines: ["KRL Commuter Line Lin Lingkar", "Koneksi MRT Dukuh Atas"],
    description: "Titik gerbang utama pekerja komuter menuju kawasan bisnis Sudirman-Thamrin dengan akses trotoar aktif sepanjang Jl. Kendal dan Jl. Blora.",
    dailyPassengers: 98000,
    accessibleElevator: true,
    connectedMerchantsCount: 42,
    nearbyMerchants: [
      { id: "m-sud-1", name: "Bubur Ayam Barito Sudirman", category: "Sarapan", distanceMeters: 140, walkingMinutes: 2, address: "Jl. Blora Samping Stasiun", coordinates: [106.8238, -6.2028] },
      { id: "m-sud-2", name: "Bakso Malang Subur Kendal", category: "Kuliner", distanceMeters: 210, walkingMinutes: 3, address: "Jl. Kendal Pintu Barat", coordinates: [106.8221, -6.2018] }
    ]
  },
  {
    id: "hub-manggarai",
    name: "Stasiun Sentral Manggarai",
    category: "KRL",
    coordinates: [106.8502, -6.2104],
    lines: ["KRL Lin Bogor", "KRL Lin Cikarang", "KRL Lin Bandara", "TransJakarta Koridor 4"],
    description: "Stasiun transit kereta api relasi komuter terbesar di Asia Tenggara yang menghubungkan ribuan penumpang antarkota setiap hari.",
    dailyPassengers: 180000,
    accessibleElevator: true,
    connectedMerchantsCount: 55,
    nearbyMerchants: [
      { id: "m-mgr-1", name: "Nasi Uduk Manggarai Bang Ali", category: "Kuliner Tradisional", distanceMeters: 190, walkingMinutes: 3, address: "Jl. Manggarai Utara No. 15", coordinates: [106.8512, -6.2098] },
      { id: "m-mgr-2", name: "Kopi Susu Kampung Stasiun", category: "Kopi", distanceMeters: 90, walkingMinutes: 1, address: "Pintu Timur Manggarai", coordinates: [106.8505, -6.2109] }
    ]
  },
  {
    id: "hub-blok-m",
    name: "Kawasan Transit Terpadu Blok M Hub",
    category: "INTEGRATED",
    coordinates: [106.7984, -6.2435],
    lines: ["MRT Lin Utara-Selatan", "Terminal Bus Blok M", "TransJakarta Koridor 1, 13"],
    description: "Kawasan transit legendaris Jakarta Selatan yang terintegrasi dengan Taman Literasi Martha Christina Tiahahu dan sentra kuliner UMKM Melawai.",
    dailyPassengers: 88000,
    accessibleElevator: true,
    connectedMerchantsCount: 64,
    nearbyMerchants: [
      { id: "m-blm-1", name: "Gultik (Gulai Tikungan) Blok M", category: "Kuliner Malam", distanceMeters: 130, walkingMinutes: 2, address: "Tikungan Jl. Mahakam", coordinates: [106.7978, -6.2442] },
      { id: "m-blm-2", name: "Kopi Tuku Taman Literasi", category: "Kopi & Minuman", distanceMeters: 75, walkingMinutes: 1, address: "Taman Literasi Blok M", coordinates: [106.7989, -6.2431] }
    ]
  }
];

// 2. ACCESSIBILITY CORRIDORS DATA
export const ACCESSIBILITY_CORRIDORS: AccessibilityCorridor[] = [
  {
    id: "acc-sudirman-thamrin",
    name: "Koridor Sudirman - M.H. Thamrin",
    subdistrict: "Menteng & Tanah Abang",
    overallScore: 94,
    tactilePavingQuality: "Lengkap",
    curbRampsQuality: "Standar PUPR",
    sidewalkWidthMeters: 4.8,
    obstacleLevel: "Rendah",
    wheelchairRecommended: true,
    activeBarriersCount: 0
  },
  {
    id: "acc-dukuh-atas-jpm",
    name: "Kawasan Jembatan Penyeberangan Multiguna Dukuh Atas",
    subdistrict: "Setiabudi",
    overallScore: 96,
    tactilePavingQuality: "Lengkap",
    curbRampsQuality: "Standar PUPR",
    sidewalkWidthMeters: 3.5,
    obstacleLevel: "Rendah",
    wheelchairRecommended: true,
    activeBarriersCount: 0
  },
  {
    id: "acc-cikini-raden-saleh",
    name: "Koridor Jl. Cikini Raya - Jl. Raden Saleh",
    subdistrict: "Menteng",
    overallScore: 82,
    tactilePavingQuality: "Lengkap",
    curbRampsQuality: "Sebagian",
    sidewalkWidthMeters: 2.4,
    obstacleLevel: "Sedang",
    wheelchairRecommended: true,
    activeBarriersCount: 2
  },
  {
    id: "acc-blora-kendal",
    name: "Kawasan Pedestrian Jl. Kendal & Jl. Blora",
    subdistrict: "Menteng",
    overallScore: 91,
    tactilePavingQuality: "Lengkap",
    curbRampsQuality: "Standar PUPR",
    sidewalkWidthMeters: 3.2,
    obstacleLevel: "Rendah",
    wheelchairRecommended: true,
    activeBarriersCount: 1
  },
  {
    id: "acc-manggarai-utara",
    name: "Akses Pedestrian Stasiun Manggarai - Tambak",
    subdistrict: "Tebet",
    overallScore: 68,
    tactilePavingQuality: "Sebagian",
    curbRampsQuality: "Curam",
    sidewalkWidthMeters: 1.6,
    obstacleLevel: "Tinggi",
    wheelchairRecommended: false,
    activeBarriersCount: 5
  }
];

// 3. ECO COMMUTE FORMULAS & SAMPLE TRIPS
export const ECO_FACTORS = {
  carCo2PerKm: 192, // grams CO2 per km for average passenger car in urban stop-and-go
  motorCo2PerKm: 103, // grams CO2 per km for average urban motorcycle
  caloriesBurnedPerKmWalk: 55, // kcal per km walked for 65kg person at 4.5 km/h
  urbanTreeYearAbsorptionKg: 22, // 1 mature urban tree absorbs ~22 kg CO2 per year (~60 grams/day)
};

export function calculateEcoSavings(distanceMeters: number) {
  const km = Math.max(0, distanceMeters / 1000);
  const co2VsCar = Math.round(km * ECO_FACTORS.carCo2PerKm);
  const co2VsMotor = Math.round(km * ECO_FACTORS.motorCo2PerKm);
  const calories = Math.round(km * ECO_FACTORS.caloriesBurnedPerKmWalk);
  const treeDaysEquivalent = Number((co2VsCar / 60).toFixed(1));
  const stepsCount = Math.round(km * 1350); // ~1350 steps per km
  return {
    distanceKm: Number(km.toFixed(2)),
    co2VsCarGrams: co2VsCar,
    co2VsMotorGrams: co2VsMotor,
    caloriesBurnedKcal: calories,
    treeDaysEquivalent,
    stepsCount,
  };
}

export const SAMPLE_ECO_TRIPS: EcoCommuteTrip[] = [
  {
    id: "trip-1",
    label: "Stasiun Sudirman ke Grand Indonesia",
    origin: "Stasiun Sudirman",
    destination: "Grand Indonesia Mall",
    distanceMeters: 950,
    walkingMinutes: 12,
    co2SavedGramsVsCar: 182,
    co2SavedGramsVsMotor: 98,
    caloriesBurnedKcal: 52
  },
  {
    id: "trip-2",
    label: "Dukuh Atas TOD ke Kawasan Kuliner Blora",
    origin: "Stasiun MRT Dukuh Atas",
    destination: "Sentra Kuliner Blora",
    distanceMeters: 450,
    walkingMinutes: 6,
    co2SavedGramsVsCar: 86,
    co2SavedGramsVsMotor: 46,
    caloriesBurnedKcal: 25
  },
  {
    id: "trip-3",
    label: "MRT Bundaran HI ke Wisata Kuliner Sabang",
    origin: "Stasiun MRT Bundaran HI",
    destination: "Jl. H. Agus Salim (Sabang)",
    distanceMeters: 1200,
    walkingMinutes: 15,
    co2SavedGramsVsCar: 230,
    co2SavedGramsVsMotor: 124,
    caloriesBurnedKcal: 66
  }
];

// 4. SAFETY CORRIDORS DATA
export const SAFETY_CORRIDORS: SafetyCorridor[] = [
  {
    id: "safe-sudirman",
    name: "Trotoar Arterial Jl. Jend. Sudirman",
    zone: "Jakarta Pusat - Selatan",
    safetyScore: 97,
    lightingIndex: "Sangat Terang",
    nightCommerceActive: true,
    policePostDistanceMeters: 250,
    cctvCoverage: true,
    recommendation: "Sangat aman dilintasi kapan saja termasuk malam hari setelah pukul 22:00."
  },
  {
    id: "safe-kendal",
    name: "Terowongan Kendal & Taman Dukuh Atas",
    zone: "Jakarta Pusat",
    safetyScore: 94,
    lightingIndex: "Sangat Terang",
    nightCommerceActive: true,
    policePostDistanceMeters: 120,
    cctvCoverage: true,
    recommendation: "Pencahayaan tematik ramah pejalan kaki dengan pos keamanan transit 24 jam."
  },
  {
    id: "safe-sabang",
    name: "Koridor Kuliner Jl. H. Agus Salim (Sabang)",
    zone: "Menteng, Jakarta Pusat",
    safetyScore: 89,
    lightingIndex: "Terang",
    nightCommerceActive: true,
    policePostDistanceMeters: 380,
    cctvCoverage: true,
    recommendation: "Aktivitas kuliner malam hidup, ramai pejalan kaki hingga pukul 24:00."
  },
  {
    id: "safe-raden-saleh",
    name: "Jl. Raden Saleh Raya (Cikini)",
    zone: "Menteng, Jakarta Pusat",
    safetyScore: 78,
    lightingIndex: "Cukup",
    nightCommerceActive: false,
    policePostDistanceMeters: 620,
    cctvCoverage: false,
    recommendation: "Pencahayaan cukup baik, disarankan melintas sebelum pukul 22:00."
  }
];

// 5. DIRECTORY MERCHANTS DATA
export const DIRECTORY_MERCHANTS: DirectoryMerchant[] = [
  {
    id: "dir-1",
    name: "Soto Betawi H. Ma'ruf Galunggung",
    category: "Kuliner",
    cuisine: "Khas Betawi",
    priceTier: "RpRp",
    rating: 4.8,
    reviewCount: 342,
    isOpen: true,
    openingHours: "09:00 - 21:00 WIB",
    paymentMethods: ["QRIS", "Tunai", "Debit"],
    address: "Jl. Galunggung No. 12, Setiabudi",
    nearestStation: "Dukuh Atas TOD",
    distanceFromStationMeters: 180,
    verified: true,
    coordinates: [106.8235, -6.2012]
  },
  {
    id: "dir-2",
    name: "Kopi Tuku Terowongan Kendal",
    category: "Kopi & Minuman",
    cuisine: "Kopi Lokal",
    priceTier: "Rp",
    rating: 4.9,
    reviewCount: 1280,
    isOpen: true,
    openingHours: "06:30 - 21:30 WIB",
    paymentMethods: ["QRIS", "Tunai"],
    address: "Terowongan Kendal Pintu B Stasiun Sudirman",
    nearestStation: "Stasiun Sudirman",
    distanceFromStationMeters: 80,
    verified: true,
    coordinates: [106.8225, -6.2005]
  },
  {
    id: "dir-3",
    name: "Nasi Uduk Betawi Bu Sum Blora",
    category: "Kuliner",
    cuisine: "Sarapan & Makan Siang",
    priceTier: "Rp",
    rating: 4.6,
    reviewCount: 195,
    isOpen: true,
    openingHours: "07:00 - 15:00 WIB",
    paymentMethods: ["QRIS", "Tunai"],
    address: "Jl. Blora No. 8, Dukuh Atas",
    nearestStation: "Stasiun Sudirman",
    distanceFromStationMeters: 220,
    verified: true,
    coordinates: [106.8242, -6.2025]
  },
  {
    id: "dir-4",
    name: "Bakmi Ayam Jamur Sabang",
    category: "Kuliner",
    cuisine: "Bakmi",
    priceTier: "RpRp",
    rating: 4.7,
    reviewCount: 512,
    isOpen: true,
    openingHours: "08:00 - 22:00 WIB",
    paymentMethods: ["QRIS", "Tunai"],
    address: "Jl. H. Agus Salim No. 34, Sabang",
    nearestStation: "MRT Bundaran HI",
    distanceFromStationMeters: 450,
    verified: true,
    coordinates: [106.8258, -6.1895]
  },
  {
    id: "dir-5",
    name: "Toko Kelontong Berkah Kendal",
    category: "Kebutuhan Harian",
    cuisine: "Minuman Dingin & Snack",
    priceTier: "Rp",
    rating: 4.5,
    reviewCount: 78,
    isOpen: true,
    openingHours: "06:00 - 23:00 WIB",
    paymentMethods: ["Tunai", "QRIS"],
    address: "Jl. Kendal No. 18",
    nearestStation: "Stasiun Sudirman",
    distanceFromStationMeters: 140,
    verified: true,
    coordinates: [106.8231, -6.2015]
  },
  {
    id: "dir-6",
    name: "Gulai Tikungan Mahakam Mas Anto",
    category: "Kuliner",
    cuisine: "Kuliner Malam",
    priceTier: "Rp",
    rating: 4.8,
    reviewCount: 890,
    isOpen: true,
    openingHours: "17:00 - 02:00 WIB",
    paymentMethods: ["QRIS", "Tunai"],
    address: "Tikungan Jl. Mahakam, Blok M",
    nearestStation: "MRT Blok M BCA",
    distanceFromStationMeters: 130,
    verified: true,
    coordinates: [106.7978, -6.2442]
  }
];

// 6. FLASH DEALS DATA
export const FLASH_DEALS: FlashDeal[] = [
  {
    id: "deal-1",
    merchantId: "dir-2",
    merchantName: "Kopi Tuku Terowongan Kendal",
    title: "Voucher Semangat Pagi Komuter",
    discountDescription: "Potongan Rp 5.000 untuk pembelian Kopi Tetangga + Donat",
    code: "KOMUTERPAGI",
    minSpend: 25000,
    expiresInHours: 4,
    remainingVouchers: 18,
    stationNear: "Stasiun Sudirman",
    distanceMeters: 80
  },
  {
    id: "deal-2",
    merchantId: "dir-1",
    merchantName: "Soto Betawi H. Ma'ruf",
    title: "Diskon Makan Siang Bersama",
    discountDescription: "Diskon 15% untuk menu Soto Daging Kuah Santan/Bening",
    code: "MAKSIDUKUH",
    minSpend: 45000,
    expiresInHours: 6,
    remainingVouchers: 35,
    stationNear: "Dukuh Atas TOD",
    distanceMeters: 180
  },
  {
    id: "deal-3",
    merchantId: "dir-4",
    merchantName: "Bakmi Ayam Jamur Sabang",
    title: "Promo Pejalan Kaki Sabang",
    discountDescription: "Gratis Es Teh Manis Jumbo untuk setiap porsi Bakmi Spesial",
    code: "SABANGPEDESTRIAN",
    minSpend: 30000,
    expiresInHours: 8,
    remainingVouchers: 24,
    stationNear: "MRT Bundaran HI",
    distanceMeters: 450
  }
];

// 7. CULINARY TRAILS DATA
export const CULINARY_TRAILS: CulinaryTrail[] = [
  {
    id: "trail-sabang-heritage",
    title: "Jejak Rasa Bersejarah Sabang & Thamrin",
    theme: "Kuliner Legendaris & Heritage",
    totalDistanceKm: 1.4,
    estimatedMinutes: 20,
    stopsCount: 3,
    highlightFood: ["Kopi Legendaris", "Sate Sabang", "Bakmi Sabang"],
    description: "Menelusuri sejarah kuliner jalanan tertua di jantung Jakarta dengan trotoar rindang dari stasiun MRT Bundaran HI hingga Jalan Sabang.",
    stops: [
      { step: 1, merchantName: "Kopi Oey Sabang", dishName: "Kopi Indochina & Roti Bakar Prantjis", distanceFromPrevMeters: 350, description: "Kedai kopi bernuansa peranakan dengan suasana santai." },
      { step: 2, merchantName: "Bakmi Roxy Sabang", dishName: "Bakmi Ayam Jamur Pangsit", distanceFromPrevMeters: 420, description: "Bakmi legendaris bertekstur kenyal dengan kuah kaldu gurih." },
      { step: 3, merchantName: "Sate Jaya Agung Sabang", dishName: "Sate Kambing Bumbu Kacang", distanceFromPrevMeters: 280, description: "Pelopor sate kambing khas Jakarta sejak tahun 1970-an." }
    ]
  },
  {
    id: "trail-dukuh-atas-coffee",
    title: "Jelajah Kopi & Kudapan TOD Dukuh Atas",
    theme: "Kopi Gelombang Tiga & Komuter",
    totalDistanceKm: 0.9,
    estimatedMinutes: 14,
    stopsCount: 3,
    highlightFood: ["Es Kopi Susu Tetangga", "Soto Betawi Kuah Susu", "Roti Gambang Tradisional"],
    description: "Rute santai antarmoda di sekitar Terowongan Kendal, Jl. Blora, dan taman Dukuh Atas.",
    stops: [
      { step: 1, merchantName: "Kopi Tuku Kendal", dishName: "Es Kopi Susu Tetangga", distanceFromPrevMeters: 80, description: "Pemberhentian pertama tepat di samping tangga stasiun." },
      { step: 2, merchantName: "Soto Betawi H. Ma'ruf", dishName: "Soto Betawi Daging Sapi", distanceFromPrevMeters: 240, description: "Soto Betawi otentik kuah santan gurih tanpa MSG berlebih." },
      { step: 3, merchantName: "Kedai Roti Blora", dishName: "Roti Gambang Wijen", distanceFromPrevMeters: 220, description: "Kudapan nostalgia kayu manis pengganjal rasa lapar pejalan kaki." }
    ]
  }
];

// 8. B2B SUPPLIERS DATA
export const B2B_SUPPLIERS: B2BSupplier[] = [
  {
    id: "sup-tanah-abang",
    marketName: "Pasar Grosir Tanah Abang Blok G & A",
    location: "Kecamatan Tanah Abang, Jakarta Pusat",
    specialty: ["Kain Seragam Usaha", "Bahan Kemasan Kertas", "Peralatan Dapur Logam"],
    distanceToStudyCenterMeters: 1400,
    ecoDeliveryAvailable: true,
    bulkDiscountAvailable: true,
    contactPerson: "Koperasi Pedagang Blok G"
  },
  {
    id: "sup-gondangdia",
    marketName: "Pasar Tradisional Gondangdia",
    location: "Menteng, Jakarta Pusat",
    specialty: ["Sayuran Segar Organik", "Daging Ayam & Sapi Segar", "Bumbu Rempah Basah"],
    distanceToStudyCenterMeters: 1200,
    ecoDeliveryAvailable: true,
    bulkDiscountAvailable: true,
    contactPerson: "Paguyuban Pasar Gondangdia"
  },
  {
    id: "sup-senen",
    marketName: "Pasar Senen Sentra Bahan Kue & Roti",
    location: "Senen, Jakarta Pusat",
    specialty: ["Tepung Terigu & Mentega Grosir", "Kemasan Makanan Biodegradable", "Cokelat & Topping"],
    distanceToStudyCenterMeters: 2600,
    ecoDeliveryAvailable: true,
    bulkDiscountAvailable: true,
    contactPerson: "Distributor Senen Kuliner"
  }
];

// 9. FOOD DESERT & SPATIAL EQUITY DATA
export const FOOD_DESERT_AREAS: FoodDesertArea[] = [
  {
    subdistrict: "Kelurahan Karet Tengsin",
    residentialPopulation: 22400,
    within400mRatio: 88,
    within800mRatio: 98,
    foodAccessIndex: 92,
    riskLevel: "Rendah",
    priorityAction: "Pertahankan keragaman pedagang sayur segar dan pasar lingkungan."
  },
  {
    subdistrict: "Kelurahan Kebon Sirih",
    residentialPopulation: 16800,
    within400mRatio: 81,
    within800mRatio: 94,
    foodAccessIndex: 86,
    riskLevel: "Rendah",
    priorityAction: "Dukung pedagang makanan sehat di kantong perumahan padat."
  },
  {
    subdistrict: "Kelurahan Setiabudi (Kawasan Kantor)",
    residentialPopulation: 14200,
    within400mRatio: 64,
    within800mRatio: 83,
    foodAccessIndex: 72,
    riskLevel: "Sedang",
    priorityAction: "Tingkatkan kios sembako terjangkau di antara gedung perkantoran tinggi."
  },
  {
    subdistrict: "Kelurahan Menteng Atas Selatan",
    residentialPopulation: 29500,
    within400mRatio: 58,
    within800mRatio: 77,
    foodAccessIndex: 65,
    riskLevel: "Tinggi",
    priorityAction: "Rekomendasi penambahan titik micro-market komoditas pangan pokok murah."
  }
];

// 10. SIDEWALK ASSET SEGMENTS DATA
export const SIDEWALK_ASSET_SEGMENTS: SidewalkAssetSegment[] = [
  {
    segmentId: "SW-001-THAMRIN",
    streetName: "Jl. M.H. Thamrin Sisi Timur",
    lengthMeters: 1850,
    widthMeters: 5.2,
    condition: "Baik",
    tactilePaving: true,
    treeShadingRatio: 0.75,
    crosswalkCount: 6
  },
  {
    segmentId: "SW-002-SUDIRMAN",
    streetName: "Jl. Jend. Sudirman Sisi Barat",
    lengthMeters: 3200,
    widthMeters: 4.8,
    condition: "Baik",
    tactilePaving: true,
    treeShadingRatio: 0.82,
    crosswalkCount: 11
  },
  {
    segmentId: "SW-003-BLORA",
    streetName: "Jl. Blora Penghubung Sudirman-Kendal",
    lengthMeters: 380,
    widthMeters: 3.1,
    condition: "Baik",
    tactilePaving: true,
    treeShadingRatio: 0.45,
    crosswalkCount: 2
  },
  {
    segmentId: "SW-004-CIKINI",
    streetName: "Jl. Cikini Raya Koridor Budaya",
    lengthMeters: 1400,
    widthMeters: 2.4,
    condition: "Rusak Ringan",
    tactilePaving: true,
    treeShadingRatio: 0.68,
    crosswalkCount: 4
  },
  {
    segmentId: "SW-005-MANGGARAI",
    streetName: "Jl. Manggarai Utara Sisi Stasiun",
    lengthMeters: 620,
    widthMeters: 1.5,
    condition: "Rusak Berat",
    tactilePaving: false,
    treeShadingRatio: 0.2,
    crosswalkCount: 1
  }
];

// 11. ROAD CLOSURE SCENARIOS DATA
export const ROAD_CLOSURE_SCENARIOS: RoadClosureScenario[] = [
  {
    id: "scenario-cfd",
    title: "Hari Bebas Kendaraan Bermotor (Car-Free Day Jakarta)",
    cause: "Car-Free Day",
    affectedCorridor: "Jl. Jend. Sudirman & Jl. M.H. Thamrin (06:00 - 11:00 WIB)",
    pedestrianDetourAvgMeters: -120, // Negative means shortcut through opened main road!
    merchantFootfallImpact: "+340% lonjakan pejalan kaki bagi UMKM di sepanjang koridor dan jalan sirip.",
    recommendedAlleyRoutes: ["Jl. Kendal", "Jl. Blora", "Jl. Teluk Betung", "Jl. Sunda"]
  },
  {
    id: "scenario-mrt-phase2",
    title: "Rekayasa Lalu Lintas Pembangunan MRT Fase 2A Thamrin",
    cause: "Konstruksi MRT",
    affectedCorridor: "Persimpangan Kebon Sirih - Thamrin",
    pedestrianDetourAvgMeters: 180,
    merchantFootfallImpact: "-12% pada sisi proyek, namun +28% pada jembatan penyeberangan sementara.",
    recommendedAlleyRoutes: ["Jalur Pedestrian Terlindungi Barat", "Koridor Bank Indonesia"]
  }
];

// 12. INCLUSIVITY METRICS DATA (Permen PUPR 14/2017)
export const INCLUSIVITY_METRICS: InclusivityMetric[] = [
  { category: "Kemiringan Ramp Trotoar (<8%)", score: 92, pupCompliant: true, benchmarkTarget: 85, recommendation: "Pertahankan kelandaian ramp pada persimpangan baru." },
  { category: "Jalur Pemandu Difabel Netra (Guiding Block)", score: 88, pupCompliant: true, benchmarkTarget: 80, recommendation: "Lakukan audit berkala agar tidak terputus tiang atau pohon." },
  { category: "Lebar Efektif Bebas Rintangan (min. 1.5m)", score: 95, pupCompliant: true, benchmarkTarget: 90, recommendation: "Jaga zonasi pedagang agar tidak memakan ruang manuver kursi roda." },
  { category: "Fasilitas Penyeberangan Pelican & Audio Signal", score: 76, pupCompliant: false, benchmarkTarget: 80, recommendation: "Tambah sinyal audio penyeberangan di halte transit koridor sekunder." }
];

// 13. FOOT TRAFFIC POINTS DATA
export const FOOT_TRAFFIC_DATA: FootTrafficPoint[] = [
  { corridor: "Kawasan Transit Dukuh Atas", hour: "07:00", pedestrianVolumePerHour: 4800, crowdLevel: "Padat" },
  { corridor: "Kawasan Transit Dukuh Atas", hour: "08:00", pedestrianVolumePerHour: 8200, crowdLevel: "Puncak" },
  { corridor: "Kawasan Transit Dukuh Atas", hour: "12:00", pedestrianVolumePerHour: 5600, crowdLevel: "Padat" },
  { corridor: "Kawasan Transit Dukuh Atas", hour: "18:00", pedestrianVolumePerHour: 9100, crowdLevel: "Puncak" },
  { corridor: "Kawasan Transit Dukuh Atas", hour: "21:00", pedestrianVolumePerHour: 2200, crowdLevel: "Sedang" },
  { corridor: "Trotoar Bundaran HI", hour: "08:00", pedestrianVolumePerHour: 3900, crowdLevel: "Padat" },
  { corridor: "Trotoar Bundaran HI", hour: "12:00", pedestrianVolumePerHour: 4200, crowdLevel: "Padat" },
  { corridor: "Trotoar Bundaran HI", hour: "18:00", pedestrianVolumePerHour: 6800, crowdLevel: "Puncak" }
];

// 14. TOD INDEX STATIONS DATA
export const TOD_STATIONS: TodIndexStation[] = [
  { stationName: "Dukuh Atas TOD Intermodal", transitModesCount: 5, dailyBoardingAvg: 145000, walkabilityScore: 94, todScore: 96, rank: 1, investmentTier: "Sangat Tinggi", retailOccupancyRate: 97 },
  { stationName: "Blok M BCA Integrated Hub", transitModesCount: 3, dailyBoardingAvg: 88000, walkabilityScore: 91, todScore: 92, rank: 2, investmentTier: "Sangat Tinggi", retailOccupancyRate: 94 },
  { stationName: "Bundaran HI Astra MRT", transitModesCount: 2, dailyBoardingAvg: 52000, walkabilityScore: 95, todScore: 90, rank: 3, investmentTier: "Tinggi", retailOccupancyRate: 96 },
  { stationName: "Manggarai Sentral", transitModesCount: 4, dailyBoardingAvg: 180000, walkabilityScore: 78, todScore: 88, rank: 4, investmentTier: "Tinggi", retailOccupancyRate: 89 },
  { stationName: "Lebak Bulus Grab MRT", transitModesCount: 3, dailyBoardingAvg: 41000, walkabilityScore: 84, todScore: 84, rank: 5, investmentTier: "Menengah", retailOccupancyRate: 85 }
];

// 15. MARKET GAP DATA
export const MARKET_GAP_ITEMS: MarketGapItem[] = [
  { stationZone: "Dukuh Atas TOD Radius 300m", missingCategory: "Sarapan Cepat & Sehat (Healthy Bowls / Salad / Jus)", estimatedUnmetDemand: "Tinggi (~1.200 komuter/hari mencari opsi sarapan segar)", nearbyCompetitorCount: 1, viabilityScore: 94, recommendedAction: "Buka gerai grab-and-go sarapan pagi pukul 06:30 - 10:00." },
  { stationZone: "Stasiun Sudirman Pintu Timur", missingCategory: "Layanan Cetak Kilat & Servis Gadget Komuter", estimatedUnmetDemand: "Sedang-Tinggi (~450 permintaan kebutuhan mendadak kantor)", nearbyCompetitorCount: 0, viabilityScore: 88, recommendedAction: "Sewa booth mikro di area pedestrian Jl. Kendal." },
  { stationZone: "Stasiun MRT Bundaran HI", missingCategory: "Apotek & Toko Kebutuhan Esensial Siang Malam", estimatedUnmetDemand: "Tinggi (~800 komuter dan pejalan kaki)", nearbyCompetitorCount: 1, viabilityScore: 91, recommendedAction: "Optimalkan toko ritel kebutuhan darurat kesehatan." }
];

// 16. MERCHANT INSIGHT SUMMARY SAMPLE
export const SAMPLE_MERCHANT_INSIGHT: MerchantInsightSummary = {
  merchantId: "dir-1",
  weeklyCatchmentPedestrians: 28400,
  peakHour: "12:00 - 13:30 WIB & 18:30 - 20:00 WIB",
  avgCustomerWalkDistanceMeters: 320,
  competitorsIn500m: 4,
  marketShareEstimate: "32% dari segmen kuliner soto/makanan berkuah di radius 400m",
  growthOpportunity: "Tingkatkan promosi jam sepi (14:00 - 16:30) dengan paket kopi sore dan makanan ringan."
};

// 17. COMMUNITY QUESTS DATA
export const COMMUNITY_QUESTS: CommunityQuest[] = [
  {
    id: "quest-1",
    title: "Audit Jalur Kursi Roda Dukuh Atas",
    xpReward: 150,
    category: "Aksesibilitas",
    targetCount: 3,
    completedCount: 2,
    description: "Verifikasi kondisi ramp dan keleluasaan trotoar di 3 titik persimpangan Dukuh Atas.",
    badgeUnlock: "Pahlawan Aksesibilitas"
  },
  {
    id: "quest-2",
    title: "Verifikasi Jam Operasional UMKM Kendal",
    xpReward: 100,
    category: "Verifikasi UMKM",
    targetCount: 5,
    completedCount: 4,
    description: "Pastikan jam buka aktual dan opsi pembayaran QRIS di 5 warung sekitar Terowongan Kendal.",
    badgeUnlock: "Sahabat UMKM"
  },
  {
    id: "quest-3",
    title: "Foto Menu Baru & Bukti Kualitas",
    xpReward: 200,
    category: "Foto Menu",
    targetCount: 4,
    completedCount: 1,
    description: "Unggah foto daftar menu dan tempat usaha untuk membantu calon pembeli menemukan rekomendasi terbaik.",
    badgeUnlock: "Kurator Gastronomi"
  }
];

// 18. PEDESTRIAN HAZARD REPORTS SAMPLE
export const INITIAL_HAZARD_REPORTS: PedestrianHazardReport[] = [
  {
    id: "rep-001",
    category: "Guiding Block Terputus",
    locationName: "Depan Halte Tosari Jl. Sudirman Sisi Timur",
    severity: "Sedang",
    description: "Ubin pemandu kuning terputus oleh pemasangan pot bunga dekoratif.",
    timestamp: "2026-09-19 14:20",
    status: "Dalam Pemeriksaan"
  },
  {
    id: "rep-002",
    category: "Parkir Liar di Trotoar",
    locationName: "Jl. Blora Samping Pintu Stasiun Sudirman",
    severity: "Sedang",
    description: "Deretan sepeda motor ojek online parkir memakan setengah lebar trotoar.",
    timestamp: "2026-09-19 11:05",
    status: "Diterima"
  },
  {
    id: "rep-003",
    category: "Trotoar Rusak",
    locationName: "Persimpangan Jl. Galunggung Setiabudi",
    severity: "Kritis",
    description: "Ubin trotoar amblas sedalam 10 cm berpotensi membuat pejalan kaki tersandung.",
    timestamp: "2026-09-18 17:45",
    status: "Selesai"
  }
];

// 19. SYSTEM SERVICE STATUS DATA
export const SYSTEM_SERVICES: SystemServiceStatus[] = [
  {
    name: "PostGIS Spatial Engine & Spatial Cache",
    serviceType: "DATABASE",
    status: "OPERATIONAL",
    latencyMs: 14,
    uptime90d: 99.98,
    description: "PostgreSQL 16 + PostGIS 3.4 menangani query geospasial isochrone, st_distance, dan buffer."
  },
  {
    name: "Valhalla Pedestrian Routing Gateway",
    serviceType: "ROUTING",
    status: "OPERATIONAL",
    latencyMs: 38,
    uptime90d: 99.95,
    description: "Engine routing multimodal internal berbasis jaringan pedestrian OpenStreetMap Jakarta terkini."
  },
  {
    name: "GETRA Multi-Task AI Orchestrator",
    serviceType: "AI",
    status: "OPERATIONAL",
    latencyMs: 165,
    uptime90d: 99.91,
    description: "Model reasoning intent spasial dan grounding entity dengan anti-hallucination guardrails."
  },
  {
    name: "Midtrans Payment Snap Gateway",
    serviceType: "PAYMENT",
    status: "OPERATIONAL",
    latencyMs: 82,
    uptime90d: 99.99,
    description: "Server-side token verification and webhook notification callback processor."
  },
  {
    name: "MapLibre Vector Tiles & GIS Layers",
    serviceType: "MAP_TILES",
    status: "OPERATIONAL",
    latencyMs: 22,
    uptime90d: 99.97,
    description: "Penyedia basemap dan layer vektor batas administrasi dan koridor transit."
  }
];

// 20. OPEN GEO DATASETS CATALOG
export const OPEN_GEO_DATASETS: OpenGeoDataset[] = [
  {
    id: "ds-pedestrian-network",
    title: "Jaringan Jalur Pejalan Kaki Jakarta Pusat & TOD",
    format: "GeoJSON",
    featuresCount: 1842,
    coverageArea: "Kawasan TOD Dukuh Atas, Thamrin, Sudirman, Senayan",
    lastUpdated: "2026-09-15",
    license: "Open Database License (ODbL)",
    downloadFilename: "getra_pedestrian_network_2026.geojson",
    schemaFields: ["segment_id", "surface_type", "width_m", "tactile_paving", "curb_ramp", "geometry"]
  },
  {
    id: "ds-transit-nodes",
    title: "Titik Simpul Halte & Stasiun Antarmoda Jabodetabek",
    format: "GeoJSON",
    featuresCount: 326,
    coverageArea: "DKI Jakarta & Kawasan Aglomerasi",
    lastUpdated: "2026-09-18",
    license: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    downloadFilename: "getra_transit_nodes_2026.geojson",
    schemaFields: ["station_id", "station_name", "operator", "lines", "accessible_lift", "coordinates"]
  },
  {
    id: "ds-canonical-merchants",
    title: "Sebaran UMKM Terverifikasi Dekat Titik Transit",
    format: "GeoJSON",
    featuresCount: 420,
    coverageArea: "Walkshed 500m Stasiun Jakarta Pusat & Selatan",
    lastUpdated: "2026-09-19",
    license: "Open Access for Urban Research",
    downloadFilename: "getra_umkm_transit_walkshed_2026.geojson",
    schemaFields: ["merchant_id", "name", "category", "price_tier", "nearest_station", "distance_m"]
  }
];
