# GETRA Backend — Docker API Catalog & Testing Guide

Dokumen ini memuat **daftar lengkap seluruh API endpoint** yang berjalan di dalam container Docker GETRA Backend, termasuk base URL container, format header, rate limit, request body JSON, response payload, dan contoh perintah `curl` yang dapat langsung diuji.

---

## 1. Docker Runtime & Base URL

Container GETRA berjalan sebagai **Next.js Standalone Production Server** dengan spesifikasi port:
* **Container Internal Port:** `3000`
* **Host Default Mapped Port:** `3002` (Dapat diubah via `GETRA_DOCKER_PORT` di `.env.local`)
* **Docker Base URL (Host):** `http://localhost:3002` (atau `http://127.0.0.1:3002`)

### Menjalankan Container Docker:
```bash
# Start container di background
npm run docker:start

# Periksa status container & health
npm run docker:status
```

---

## 2. Global Headers & Response Envelope

### Standard Request Headers
* `Content-Type: application/json` (Wajib untuk POST & PATCH)
* `Authorization: Bearer <supabase_jwt_access_token>` (Wajib untuk endpoint Authenticated)
* `x-request-id: <uuid>` (Opsional; jika tidak disertakan, server akan men-generate otomatis)

### Standard Response Envelope (JSON)
* **Success (200 / 201):**
  ```json
  {
    "success": true,
    "data": { ... },
    "request_id": "uuid-v4"
  }
  ```
* **Error (4xx / 5xx):**
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "Pesan error",
      "retryable": false
    },
    "request_id": "uuid-v4"
  }
  ```

---

## 3. Daftar Lengkap API Endpoint

| No | Method | Endpoint Path | Klasifikasi | Auth | Rate Limit (Default) | Deskripsi Singkat |
| :-: | :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | `GET` | `/api/health` | `PUBLIC` | Tidak | Unlimited | Probe kesiapan container & konektivitas database |
| 2 | `POST` | `/api/auth/login` | `PUBLIC` | Tidak | 5 req / menit | Login via email/password, mengembalikan Bearer JWT |
| 3 | `POST` | `/api/auth/register` | `PUBLIC` | Tidak | 5 req / menit | Registrasi user baru (`COMMUTER`, `UMKM`, `COMMUNITY`) |
| 4 | `POST` | `/api/auth/logout` | `AUTHENTICATED` | Bearer | 20 req / menit | Acknowledgment logout stateless |
| 5 | `GET` | `/api/auth/me` | `AUTHENTICATED` | Bearer | 60 req / menit | Mengambil data user & profile yang sedang login |
| 6 | `GET` | `/api/profile` | `AUTHENTICATED` | Bearer | 60 req / menit | Mengambil profil pengguna sendiri |
| 7 | `PATCH` | `/api/profile` | `AUTHENTICATED` | Bearer | 20 req / menit | Update profil (`display_name`, `avatar_url`) |
| 8 | `POST` | `/api/spatial/distance` | `AUTHENTICATED` | Bearer | 30 req / menit | Menghitung jarak geodesic WGS84 (meter) via PostGIS |
| 9 | `GET` | `/api/spatial/nearby` | `AUTHENTICATED` | Bearer | 30 req / menit | Query fasilitas/UMKM terdekat dalam radius (ST_DWithin) |
| 10 | `GET` | `/api/spatial/bbox` | `AUTHENTICATED` | Bearer | 30 req / menit | Query fitur spasial di dalam Bounding Box |

---

## 4. Rincian & Contoh Request / Response Setiap Endpoint

---

### 1. Health & Database Connectivity Check
* **Endpoint:** `GET http://localhost:3002/api/health`
* **Klasifikasi:** `PUBLIC`
* **Auth Required:** Tidak

#### Contoh cURL:
```bash
curl -i -X GET http://localhost:3002/api/health
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "service": "getra-api",
    "status": "ok",
    "database": "connected"
  },
  "request_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
```

---

### 2. Login Pengguna
* **Endpoint:** `POST http://localhost:3002/api/auth/login`
* **Klasifikasi:** `PUBLIC`
* **Auth Required:** Tidak
* **Max Body Size:** 8 KB

#### Contoh cURL:
```bash
curl -i -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "commuter.test@example.com",
    "password": "ExamplePassword123!"
  }'
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "user": {
      "id": "e8d0e512-1823-455b-8025-a1312384a601",
      "email": "commuter.test@example.com"
    },
    "profile": {
      "display_name": "Budi Commuter",
      "role": "COMMUTER"
    }
  },
  "request_id": "4d983e20-7ad1-49b8-bc88-34827fb70588"
}
```

---

### 3. Registrasi Pengguna
* **Endpoint:** `POST http://localhost:3002/api/auth/register`
* **Klasifikasi:** `PUBLIC`
* **Auth Required:** Tidak
* **Role Diizinkan:** `COMMUTER`, `UMKM`, `COMMUNITY` (Role `ADMIN` ditolak)
* **Max Body Size:** 8 KB

#### Contoh cURL:
```bash
curl -i -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "umkm.baru@example.com",
    "password": "ExamplePassword123!",
    "display_name": "Warung Kopi Transit",
    "role": "UMKM"
  }'
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "f9a1b2c3-d4e5-6789-0123-456789abcdef",
      "email": "umkm.baru@example.com"
    },
    "profile": {
      "display_name": "Warung Kopi Transit",
      "role": "UMKM"
    }
  },
  "request_id": "5e183e20-7ad1-49b8-bc88-34827fb70599"
}
```

---

### 4. Logout Pengguna
* **Endpoint:** `POST http://localhost:3002/api/auth/logout`
* **Klasifikasi:** `AUTHENTICATED`
* **Auth Required:** `Authorization: Bearer <access_token>`

#### Contoh cURL:
```bash
curl -i -X POST http://localhost:3002/api/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Authenticated logout acknowledged",
    "token_disposition": "client_discard_required"
  },
  "request_id": "6f283e20-7ad1-49b8-bc88-34827fb70500"
}
```

---

### 5. Get Current User Info (`/api/auth/me`)
* **Endpoint:** `GET http://localhost:3002/api/auth/me`
* **Klasifikasi:** `AUTHENTICATED`
* **Auth Required:** `Authorization: Bearer <access_token>`

#### Contoh cURL:
```bash
curl -i -X GET http://localhost:3002/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e8d0e512-1823-455b-8025-a1312384a601",
      "email": "commuter.test@example.com"
    },
    "profile": {
      "display_name": "Budi Commuter",
      "role": "COMMUTER"
    }
  },
  "request_id": "7a383e20-7ad1-49b8-bc88-34827fb70511"
}
```

---

### 6. Get User Profile
* **Endpoint:** `GET http://localhost:3002/api/profile`
* **Klasifikasi:** `AUTHENTICATED`
* **Auth Required:** `Authorization: Bearer <access_token>`

#### Contoh cURL:
```bash
curl -i -X GET http://localhost:3002/api/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "id": "e8d0e512-1823-455b-8025-a1312384a601",
    "display_name": "Budi Commuter",
    "avatar_url": null,
    "role": "COMMUTER",
    "created_at": "2026-08-15T20:30:14.000Z",
    "updated_at": "2026-08-15T20:30:14.000Z"
  },
  "request_id": "8b483e20-7ad1-49b8-bc88-34827fb70522"
}
```

---

### 7. Update User Profile
* **Endpoint:** `PATCH http://localhost:3002/api/profile`
* **Klasifikasi:** `AUTHENTICATED`
* **Auth Required:** `Authorization: Bearer <access_token>`
* **Field yang Dapat Diupdate:** `display_name` (2–50 karakter), `avatar_url` (URL valid atau null)

#### Contoh cURL:
```bash
curl -i -X PATCH http://localhost:3002/api/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Budi Pratama",
    "avatar_url": "https://example.com/avatar.jpg"
  }'
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "id": "e8d0e512-1823-455b-8025-a1312384a601",
    "display_name": "Budi Pratama",
    "avatar_url": "https://example.com/avatar.jpg",
    "role": "COMMUTER",
    "created_at": "2026-08-15T20:30:14.000Z",
    "updated_at": "2026-08-17T20:25:00.000Z"
  },
  "request_id": "9c583e20-7ad1-49b8-bc88-34827fb70533"
}
```

---

### 8. Hitung Jarak Geodesic Spasial (`/api/spatial/distance`)
* **Endpoint:** `POST http://localhost:3002/api/spatial/distance`
* **Klasifikasi:** `AUTHENTICATED`
* **Auth Required:** `Authorization: Bearer <access_token>`
* **Deskripsi:** Menghitung jarak permukaan bumi (meter) antar dua titik koordinat WGS84 menggunakan fungsi `public.wgs84_distance_meters` di PostGIS.

#### Contoh cURL:
```bash
curl -i -X POST http://localhost:3002/api/spatial/distance \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "longitude": 107.60981,
      "latitude": -6.914744
    },
    "destination": {
      "longitude": 107.61861,
      "latitude": -6.90389
    }
  }'
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "distance_meters": 1542.85,
    "origin": {
      "longitude": 107.60981,
      "latitude": -6.914744
    },
    "destination": {
      "longitude": 107.61861,
      "latitude": -6.90389
    },
    "analysis_method": "postgis_geography_distance",
    "source": "postgis_st_distance",
    "srid": 4326
  },
  "request_id": "0d683e20-7ad1-49b8-bc88-34827fb70544"
}
```

---

### 9. Query Fitur Terdekat / Proximity (`/api/spatial/nearby`)
* **Endpoint:** `GET http://localhost:3002/api/spatial/nearby`
* **Klasifikasi:** `AUTHENTICATED`
* **Auth Required:** `Authorization: Bearer <access_token>`
* **Query Parameters:**
  * `lat` (number): Latitude titik pusat ($-90$ s.d. $90$)
  * `lng` (number): Longitude titik pusat ($-180$ s.d. $180$)
  * `radius` (number): Radius pencarian dalam meter (maks default: 50,000 meter)
  * `type` (string): Tipe entity (`transport_node` atau `umkm_profile`)
  * `limit` (number, opsional): Jumlah hasil maksimal (default: 20, maks: 100)

#### Contoh cURL:
```bash
curl -i -X GET "http://localhost:3002/api/spatial/nearby?lat=-6.914744&lng=107.60981&radius=1500&type=transport_node&limit=10" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "origin": {
      "longitude": 107.60981,
      "latitude": -6.914744
    },
    "radius_meters": 1500,
    "type": "transport_node",
    "features": [
      {
        "id": "10000000-0000-0000-0000-000000000004",
        "entity_type": "transport_node",
        "label": "Halte Alun-Alun Bandung",
        "geometry": {
          "type": "Point",
          "coordinates": [107.60985, -6.9148]
        },
        "provenance": {
          "source_id": "10000000-0000-0000-0000-000000000001",
          "source_name": "TEST MANUAL SOURCE",
          "source_type": "manual"
        }
      }
    ],
    "returned_count": 1,
    "analysis_method": "postgis_st_dwithin",
    "source": "postgis_rpc",
    "srid": 4326
  },
  "request_id": "1e783e20-7ad1-49b8-bc88-34827fb70555"
}
```

---

### 10. Query Spasial Bounding Box (`/api/spatial/bbox`)
* **Endpoint:** `GET http://localhost:3002/api/spatial/bbox`
* **Klasifikasi:** `AUTHENTICATED`
* **Auth Required:** `Authorization: Bearer <access_token>`
* **Query Parameters:**
  * `west` (number): Min Longitude
  * `south` (number): Min Latitude
  * `east` (number): Max Longitude
  * `north` (number): Max Latitude
  * `type` (string): `study_area`, `transport_corridor`, `transport_node`, atau `umkm_profile`
  * `limit` (number, opsional): Jumlah hasil maksimal (default: 20, maks: 100)

#### Contoh cURL:
```bash
curl -i -X GET "http://localhost:3002/api/spatial/bbox?west=107.60&south=-6.95&east=107.65&north=-6.90&type=umkm_profile&limit=20" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Response Sukses (HTTP 200 OK):
```json
{
  "success": true,
  "data": {
    "bbox": {
      "west": 107.6,
      "south": -6.95,
      "east": 107.65,
      "north": -6.9
    },
    "type": "umkm_profile",
    "features": [
      {
        "id": "10000000-0000-0000-0000-000000000005",
        "entity_type": "umkm_profile",
        "label": "Warung Kopi Braga",
        "geometry": {
          "type": "Point",
          "coordinates": [107.609, -6.917]
        },
        "provenance": {
          "source_id": "10000000-0000-0000-0000-000000000001",
          "source_name": "TEST MANUAL SOURCE",
          "source_type": "manual"
        }
      }
    ],
    "returned_count": 1,
    "analysis_method": "postgis_bbox_intersection",
    "source": "postgis_rpc",
    "srid": 4326
  },
  "request_id": "2f883e20-7ad1-49b8-bc88-34827fb70566"
}
```

---

## 5. Troubleshooting & Status Error Docker API

| HTTP Status | Error Code | Kemungkinan Penyebab | Solusi |
| :-: | :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | Header `Authorization: Bearer <token>` tidak ada / token invalid / expired | Login kembali di `/api/auth/login` dan kirim Bearer JWT yang valid |
| `403` | `CORS_ORIGIN_DENIED` | Origin browser tidak terdaftar di `FRONTEND_ALLOWED_ORIGINS` | Daftarkan origin frontend di `.env.local` (contoh: `http://localhost:3000`) |
| `403` | `FORBIDDEN` | Pengguna mencoba mendaftar sebagai `ADMIN` atau mengakses resource milik user lain | Gunakan role yang diizinkan (`COMMUTER`, `UMKM`, `COMMUNITY`) |
| `413` | `REQUEST_TOO_LARGE` | Ukuran body request melebihi kapasitas stream (Auth: 8KB, Profile/Spatial: 4KB) | Ringkas payload request dan pastikan tidak ada data biner besar |
| `429` | `RATE_LIMIT_EXCEEDED`| Request melebihi kuota batas rate per menit | Tunggu sesuai durasi detik yang ada di header response `Retry-After` |
| `503` | `DATABASE_UNAVAILABLE`| Container tidak dapat menjangkau remote database Supabase | Periksa koneksi internet host dan status project Supabase `sesakxnjaphrxqxllqjm` |

---
*GETRA Docker API Catalog — Dokumen Resmi Siap Pakai.*
