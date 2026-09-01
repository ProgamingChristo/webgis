# GETRA Community Handoff

Dokumentasi final fitur Community untuk tim produk, frontend, backend, QA, dan maintainer.

Tanggal handoff: 23 Agustus 2026  
Repository: `D:\Getra_Production`  
Output PDF: `docs/handoff_community.pdf`

## 1. Ringkasan Eksekutif

GETRA Community adalah fitur sosial berbasis lokasi untuk pengguna GETRA. Fitur ini menggabungkan feed diskusi bergaya thread, temuan komuter, cultural map, permintaan kebutuhan lokal, sinyal demand teragregasi, respons UMKM, notifikasi, moderasi, reputasi, friendship, foto profil canonical, dan upload foto post yang aman.

Community dibangun dengan pola full stack yang sudah ada di GETRA:

- Frontend Next.js App Router di workspace `frontend`.
- Backend Next.js API route di workspace `backend`.
- Domain layer di `backend/src/features/community`.
- Supabase sebagai database, storage, RLS, RPC, dan realtime event source.
- Auth menggunakan authenticated GETRA/Supabase user.
- Semua response API memakai envelope GETRA standar melalui helper `createSuccessResponse` dan `createListResponse`.

Status handoff:

- Implementasi Community utama sudah tersedia dari sisi file, route, service, repository, UI, storage, dan migration.
- Backend unit test terakhir yang dijalankan lulus: 75 test file passed, 511 test passed, 1 skipped.
- Gate global project belum sepenuhnya hijau karena error typecheck/build/lint di modul lain seperti UMKM workspace, merchant submission, dan UMKM advertising. Detail ada di bagian "Known Blockers".

## 2. Tujuan Produk

Community dibuat untuk:

- Memberi ruang berbagi informasi antar komuter.
- Mengumpulkan temuan lokal seperti makanan, landmark, pusat kerajinan, sejarah lokal, dan aktivitas komunitas.
- Membuat peta budaya yang dapat dilihat berdasarkan bounding box peta.
- Memungkinkan komuter mengirim permintaan kebutuhan sekitar lokasi.
- Mengubah permintaan yang berulang menjadi demand signal agregat untuk pelaku UMKM.
- Memungkinkan UMKM merespons sinyal permintaan.
- Membangun trust melalui reaksi, reputasi, laporan, moderasi, notifikasi, dan pertemanan.

## 3. Struktur File Utama

### Backend API Route

Semua endpoint Community berada di:

```text
backend/app/api/community/
backend/app/api/admin/community/
```

Struktur route:

```text
backend/app/api/community/
  cultural-map/route.ts
  feed/route.ts
  posts/route.ts
  posts/[postId]/route.ts
  posts/[postId]/comments/route.ts
  posts/[postId]/reactions/[reactionType]/route.ts
  requests/route.ts
  requests/[requestId]/route.ts
  requests/signals/route.ts
  requests/signals/[signalId]/route.ts
  requests/signals/[signalId]/responses/route.ts
  notifications/route.ts
  notifications/[notificationId]/read/route.ts
  notifications/read-all/route.ts
  reports/route.ts
  reputation/[userId]/route.ts
  users/[userId]/route.ts
  friends/route.ts
  friends/requests/route.ts
  friends/[friendshipId]/route.ts

backend/app/api/admin/community/
  analytics/route.ts
  reports/route.ts
  reports/[reportId]/route.ts
```

### Backend Domain Layer

```text
backend/src/features/community/
  constants/community.constants.ts
  index.ts
  mappers/community.mapper.ts
  repositories/community.repository.ts
  schemas/community.schema.ts
  services/community.service.ts
  services/community-media.service.ts
  types/community.types.ts
```

Tanggung jawab:

- `constants`: limit, enum, bucket, ukuran file, rule kategori, dan rule request.
- `schemas`: validasi input Zod untuk route dan service.
- `types`: contract domain TypeScript.
- `mappers`: mapping row database/RPC ke DTO frontend.
- `repository`: adapter Supabase RPC dan storage signed URL.
- `service`: validasi, orchestration, error mapping.
- `community-media.service`: validasi dan normalisasi foto post dengan Sharp.

### Frontend Route

```text
frontend/app/community/
  page.tsx
  loading.tsx
  error.tsx
  [id]/page.tsx
  requests/[requestId]/page.tsx
  requests/signals/[signalId]/page.tsx
  users/[userId]/page.tsx
  friends/page.tsx
```

### Frontend Feature Layer

```text
frontend/src/features/community/
  api/community.api.ts
  constants/community.constants.ts
  hooks/
    use-community-feed.ts
    use-community-post-detail.ts
    use-commuter-requests.ts
    use-demand-signals.ts
    use-demand-signal-detail.ts
    use-community-user-profile.ts
    use-community-friends.ts
  services/community-realtime.service.ts
  types/community.types.ts
  utils/community-format.ts
  components/
    community-shell.tsx
    community-navigation.tsx
    community-page.tsx
    community-empty-state.tsx
    common/community-avatar.tsx
    post/
    comments/
    feed/
    media/
    location/
    map/
    request/
    demand/
    response/
    notifications/
    moderation/
    profile/
    friends/
    community.module.css
```

## 4. Modul dan Flow Fitur

### 4.1 Beranda Community

Halaman utama berada di `frontend/app/community/page.tsx` dan memakai `CommunityPage`.

Fungsi:

- Menampilkan composer post.
- Menampilkan feed post umum dan finding.
- Mendukung foto profil canonical dari `profiles.avatar_url`.
- Mendukung upload foto opsional untuk post.
- Mendukung lokasi opsional dan privacy `APPROXIMATE` atau `EXACT`.
- Mendukung filter "Beranda" dan "Temuan Komuter".
- Mendukung navigasi ke detail post/thread.

Komponen utama:

- `CommunityShell`
- `CommunityNavigation`
- `PostComposer`
- `CommunityFeed`
- `PostCard`
- `ReactionBar`
- `CommunityAvatar`
- `CommunityNotificationsMenu`

### 4.2 Temuan Komuter

Temuan adalah post bertipe `FINDING`. Aturan penting:

- `type` harus `FINDING`.
- `category` wajib.
- `location` wajib.
- Kategori yang valid:
  - `LEGENDARY_EATERY`
  - `LOCAL_FOOD`
  - `CRAFT_CENTER`
  - `LANDMARK`
  - `LOCAL_HISTORY`
  - `COMMUNITY_ACTIVITY`

Temuan muncul di feed dan juga dapat muncul di Cultural Map jika memiliki lokasi.

### 4.3 Cultural Map

Cultural Map berada di tab "Cultural Map" dan komponen `CulturalMap`.

Fungsi:

- Mengambil finding berdasarkan bounding box peta.
- Mendukung filter kategori.
- Menampilkan marker/list temuan.
- Menampilkan avatar author, nama author, kategori, jumlah konfirmasi, jumlah reply, dan waktu.

API memakai bounding box:

```text
GET /api/community/cultural-map?west=...&south=...&east=...&north=...&categories=...&limit=...
```

### 4.4 Permintaan Komuter

Permintaan komuter berada di tab "Permintaan".

Fungsi:

- Membuat demand/request berbasis lokasi.
- Menampilkan daftar request terbaru.
- Mendukung kategori, budget maksimum, radius, masa berlaku, dan lokasi.
- Mendukung detail request.

Kategori:

- `FOOD`
- `DRINK`
- `DAILY_NEEDS`
- `SERVICE`
- `OTHER_LOCAL_NEED`

Rule:

- Title maksimal 120 karakter.
- Description maksimal 500 karakter.
- Budget maksimal Rp10.000.000.
- Radius minimal 100 meter dan maksimal 5.000 meter.
- Opsi umum radius: 500, 1000, 2000, 3000 meter.
- Expiry: 1, 3, atau 7 hari.

### 4.5 Demand Signal

Demand signal adalah agregasi permintaan komuter yang mirip secara kategori, lokasi, budget, dan waktu.

Konstanta penting:

- Window agregasi: 7 hari.
- Radius cluster: 1000 meter.
- Minimal request untuk signal: 3.
- Bucket budget: Rp25.000.

UI:

- Tab Permintaan memiliki segment "Permintaan Terbaru" dan "Sinyal Community".
- Detail signal berada di `frontend/app/community/requests/signals/[signalId]/page.tsx`.

### 4.6 Respons UMKM

UMKM dapat merespons demand signal dengan status:

- `AVAILABLE`
- `WILL_TRY`
- `PREPARING`
- `UNAVAILABLE`

Payload respons:

```json
{
  "merchant_id": "uuid",
  "status": "AVAILABLE",
  "message": "Opsional, maksimal 500 karakter"
}
```

Respons disimpan/upsert per signal dan merchant.

### 4.7 Thread, Reply, dan Reaksi

Community mendukung:

- Detail post.
- Komentar root.
- Nested reply terbatas sampai depth 2.
- Reaction:
  - `HELPFUL`
  - `INTERESTING`
  - `CONFIRMED`

Reaction `CONFIRMED` berperan dalam reputasi dan trust signal.

### 4.8 Notifikasi

Notifikasi mendukung tipe:

- `POST_REPLY`
- `COMMENT_REPLY`
- `POST_CONFIRMED`
- `UMKM_RESPONSE`
- `FRIEND_REQUEST`
- `FRIEND_ACCEPTED`

Notifikasi ditampilkan melalui `CommunityNotificationsMenu`.

Data actor memakai:

- `actorUserId`
- `actorDisplayName`
- `actorAvatarUrl`

`actorAvatarUrl` berasal dari canonical profile photo `profiles.avatar_url`.

### 4.9 Report dan Moderasi

User dapat membuat laporan untuk:

- `POST`
- `COMMENT`
- `UMKM_RESPONSE`

Reason:

- `SPAM`
- `INCORRECT_INFORMATION`
- `INVALID_PRICE`
- `INAPPROPRIATE_CONTENT`
- `WRONG_LOCATION`
- `DUPLICATE`

Admin dapat melihat report dan melakukan action:

- `HIDE`
- `REMOVE`
- `RESTORE`
- `DISMISS`

### 4.10 Reputasi

Reputasi user tersedia melalui endpoint:

```text
GET /api/community/reputation/[userId]
```

Data:

- `confirmedContributions`
- `helpfulReceived`
- `findingsCount`
- `reputationLabel`

### 4.11 Friendship

Friendship mendukung:

- Lihat daftar teman.
- Lihat incoming request.
- Lihat outgoing request.
- Kirim friend request.
- Accept, decline, cancel, dan unfriend.
- State relation pada profil user:
  - `SELF`
  - `NONE`
  - `PENDING_OUTGOING`
  - `PENDING_INCOMING`
  - `FRIENDS`

Tab "Teman" sudah aktif di header Community.

### 4.12 Foto Profil Canonical

Community tidak menyimpan avatar sendiri. Sumber canonical adalah:

```text
profiles.avatar_url
```

Upload avatar profile berada di:

```text
backend/app/api/profile/avatar/route.ts
```

Bucket:

```text
avatars
```

Community memakai avatar canonical pada:

- Composer post.
- Feed/post card.
- Detail post.
- Comments/replies.
- User profile.
- Friends list.
- Incoming/outgoing friend request.
- Notifications.
- Request card.
- Cultural map.

Fallback avatar memakai initials dari display name jika URL kosong atau image gagal dimuat.

## 5. Daftar API

Base path backend sesuai konfigurasi canonical `NEXT_PUBLIC_GETRA_API_URL`.

### 5.1 Public Authenticated Community API

| Method | Endpoint | Fungsi | Auth |
|---|---|---|---|
| GET | `/api/community/feed` | List feed post | Authenticated |
| POST | `/api/community/posts` | Buat post/finding, JSON atau multipart photo | Authenticated |
| GET | `/api/community/posts/[postId]` | Detail post | Authenticated |
| GET | `/api/community/posts/[postId]/comments` | List comment/reply | Authenticated |
| POST | `/api/community/posts/[postId]/comments` | Buat comment/reply | Authenticated |
| PUT | `/api/community/posts/[postId]/reactions/[reactionType]` | Tambah reaction | Authenticated |
| DELETE | `/api/community/posts/[postId]/reactions/[reactionType]` | Hapus reaction | Authenticated |
| GET | `/api/community/cultural-map` | List finding dalam bounding box | Authenticated |
| GET | `/api/community/requests` | List commuter request | Authenticated |
| POST | `/api/community/requests` | Buat commuter request | Authenticated |
| GET | `/api/community/requests/[requestId]` | Detail commuter request | Authenticated |
| GET | `/api/community/requests/signals` | List demand signal | Authenticated |
| GET | `/api/community/requests/signals/[signalId]` | Detail demand signal | Authenticated |
| GET | `/api/community/requests/signals/[signalId]/responses` | List respons UMKM dan merchant milik user | Authenticated |
| POST | `/api/community/requests/signals/[signalId]/responses` | Upsert respons UMKM | Authenticated |
| GET | `/api/community/notifications` | List notifikasi | Authenticated |
| PATCH | `/api/community/notifications/[notificationId]/read` | Tandai satu notifikasi dibaca | Authenticated |
| PATCH | `/api/community/notifications/read-all` | Tandai semua notifikasi dibaca | Authenticated |
| POST | `/api/community/reports` | Buat report | Authenticated |
| GET | `/api/community/reputation/[userId]` | Ambil reputasi user | Authenticated |
| GET | `/api/community/users/[userId]` | Profil Community dan relationship state | Authenticated |
| GET | `/api/community/friends` | List friends/incoming/outgoing | Authenticated |
| POST | `/api/community/friends/requests` | Kirim friend request | Authenticated |
| PATCH | `/api/community/friends/[friendshipId]` | Action friendship | Authenticated |

### 5.2 Admin Community API

| Method | Endpoint | Fungsi | Auth |
|---|---|---|---|
| GET | `/api/admin/community/analytics` | Statistik operasional Community | Admin |
| GET | `/api/admin/community/reports` | List report untuk moderasi | Admin |
| PATCH | `/api/admin/community/reports/[reportId]` | Moderasi target report | Admin |

## 6. Kontrak Query dan Payload

### Feed

```text
GET /api/community/feed?page=1&limit=20&type=GENERAL&category=LOCAL_FOOD
```

Query:

- `page`: integer, default 1.
- `limit`: integer, 1 sampai 50, default 20.
- `type`: `GENERAL` atau `FINDING`, opsional.
- `category`: finding category, opsional.

### Create Post

JSON:

```json
{
  "type": "GENERAL",
  "content": "Apa yang kamu temukan di sekitar kamu?",
  "location": {
    "longitude": 106.8,
    "latitude": -6.2,
    "visibility": "APPROXIMATE",
    "accuracy_m": 50
  }
}
```

Finding:

```json
{
  "type": "FINDING",
  "content": "Warung legendaris dekat stasiun.",
  "category": "LEGENDARY_EATERY",
  "location": {
    "longitude": 106.8,
    "latitude": -6.2,
    "visibility": "APPROXIMATE"
  }
}
```

Multipart:

- `payload`: JSON string seperti payload di atas.
- `photo`: file `jpeg`, `png`, atau `webp`.

### Comments

```json
{
  "content": "Setuju, tempat ini ramai pagi.",
  "parent_comment_id": "uuid opsional"
}
```

### Commuter Request

```json
{
  "title": "Butuh sarapan dekat halte",
  "description": "Ada rekomendasi bubur/roti pagi?",
  "category": "FOOD",
  "max_budget": 25000,
  "location": {
    "longitude": 106.8,
    "latitude": -6.2,
    "visibility": "APPROXIMATE"
  },
  "radius_meters": 1000,
  "expires_in_days": 7
}
```

### Demand Signal Response

```json
{
  "merchant_id": "uuid",
  "status": "AVAILABLE",
  "message": "Kami tersedia jam 06.00-10.00."
}
```

### Report

```json
{
  "target_type": "POST",
  "target_id": "uuid",
  "reason": "WRONG_LOCATION",
  "details": "Lokasinya seharusnya di sisi timur stasiun."
}
```

### Friendship Action

```json
{
  "action": "ACCEPT"
}
```

Action valid:

- `ACCEPT`
- `DECLINE`
- `CANCEL`
- `UNFRIEND`

## 7. Response Envelope

Single response memakai pola:

```json
{
  "success": true,
  "data": {}
}
```

List response memakai pola:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Notification response khusus berisi:

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "limit": 20,
    "total": 0,
    "unreadCount": 0
  }
}
```

Error memakai envelope standar GETRA:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

## 8. Database dan Migration

Migration Community utama:

```text
backend/supabase/migrations/20260823010000_create_community_posts.sql
backend/supabase/migrations/20260823113000_add_community_post_location.sql
backend/supabase/migrations/20260823143000_add_community_media.sql
backend/supabase/migrations/20260823170000_add_public_profile_fields.sql
backend/supabase/migrations/20260823171000_add_community_discussion_reactions.sql
backend/supabase/migrations/20260823173000_add_community_findings_cultural_map.sql
backend/supabase/migrations/20260823190000_add_commuter_requests.sql
backend/supabase/migrations/20260823193000_create_profile_avatars_bucket.sql
backend/supabase/migrations/20260823200000_add_community_demand_signals.sql
backend/supabase/migrations/20260823210000_add_community_operational_layer.sql
backend/supabase/migrations/20260823230000_add_community_friendship.sql
backend/supabase/migrations/20260824020000_community_final_avatar_projection.sql
```

### Tabel Community

| Tabel | Fungsi |
|---|---|
| `community_posts` | Post umum dan finding |
| `community_media` | Metadata foto post |
| `community_comments` | Comment dan nested reply |
| `community_reactions` | Reaction user terhadap post |
| `commuter_requests` | Permintaan kebutuhan berbasis lokasi |
| `community_demand_signals` | Cluster/agregasi demand |
| `community_demand_signal_members` | Relasi request ke signal |
| `community_umkm_responses` | Respons merchant terhadap signal |
| `community_notifications` | Notifikasi user |
| `community_reports` | Laporan konten |
| `community_realtime_events` | Event insert untuk realtime client |
| `community_friendships` | Relasi pertemanan |

### Storage Bucket

| Bucket | Fungsi | Akses |
|---|---|---|
| `community-media` | Foto post Community | Signed URL 10 menit |
| `avatars` | Foto profil canonical | Public read, owner write via profile flow |

### RPC Utama

Repository memakai Supabase RPC berikut:

| RPC | Fungsi |
|---|---|
| `create_community_post_v4` | Buat post/finding dan metadata media |
| `list_community_feed_v4` | List feed |
| `get_community_post_detail_v2` | Detail post |
| `list_community_comments_v1` | List comment/reply |
| `create_community_comment_v1` | Buat comment/reply |
| `add_community_reaction_v1` | Tambah reaction |
| `remove_community_reaction_v1` | Hapus reaction |
| `list_community_cultural_map_v1` | List finding untuk peta |
| `create_commuter_request_v1` | Buat commuter request |
| `list_commuter_requests_v1` | List commuter request |
| `get_commuter_request_detail_v1` | Detail commuter request |
| `list_community_demand_signals_v1` | List demand signal |
| `get_community_demand_signal_detail_v1` | Detail demand signal |
| `list_community_demand_signal_responses_v1` | List respons UMKM |
| `list_community_response_merchants_v1` | Merchant milik user yang boleh merespons |
| `upsert_community_demand_signal_response_v1` | Upsert respons UMKM |
| `list_community_notifications_v1` | List notifikasi dengan actor avatar |
| `count_community_unread_notifications_v1` | Hitung unread |
| `mark_community_notification_read_v1` | Mark single read |
| `mark_all_community_notifications_read_v1` | Mark all read |
| `create_community_report_v1` | Buat report |
| `list_admin_community_reports_v1` | Admin list report |
| `moderate_community_target_v1` | Admin moderation action |
| `get_community_reputation_v1` | Ambil reputasi |
| `get_community_analytics_v1` | Admin analytics |
| `get_community_friendship_profile_v1` | Profil Community plus relation state |
| `create_community_friend_request_v1` | Buat friend request |
| `act_on_community_friendship_v1` | Accept/decline/cancel/unfriend |
| `list_community_friendships_v1` | List friends/incoming/outgoing |

## 9. Privacy dan Location Safety

Community mendukung dua mode lokasi:

- `EXACT`: koordinat asli.
- `APPROXIMATE`: koordinat dibulatkan atau digrid pada layer database/RPC.

Konstanta frontend/backend:

```text
COMMUNITY_LOCATION_APPROXIMATE_GRID_DEGREES = 0.001
COMMUNITY_LOCATION_MAX_ACCURACY_M = 100000
```

Catatan handoff:

- Untuk tampilan publik, gunakan lokasi dari DTO yang sudah diproses oleh RPC, bukan raw input.
- Jangan expose `location_accuracy_m` kecuali untuk kebutuhan internal/debug.
- Demand signal memakai center agregat, bukan lokasi personal satu user.

## 10. Media Upload

Foto post Community:

- Input format: JPEG, PNG, WEBP.
- Animated image ditolak.
- Maksimal input: 10 MB.
- Maksimal pixel input: 25.000.000.
- Output dinormalisasi menjadi WEBP.
- Maksimal dimensi output: 2048 px.
- Output disimpan di bucket `community-media`.
- Path:

```text
{userId}/{postId}/{mediaId}.webp
```

Jika pembuatan post gagal setelah upload, service mencoba menghapus file yang sudah terupload.

Foto profil:

- Tidak memakai `community-media`.
- Source canonical tetap `profiles.avatar_url`.
- Bucket profile avatar adalah `avatars`.

## 11. Realtime

Frontend service:

```text
frontend/src/features/community/services/community-realtime.service.ts
```

Source event:

```text
public.community_realtime_events
```

Filter yang didukung:

- `post_id=eq.{postId}`
- `signal_id=eq.{signalId}`
- `recipient_user_id=eq.{recipientUserId}`

Channel:

- `community-post-{postId}`
- `community-signal-{signalId}`
- `community-notifications-{recipientUserId}`

Service mengambil access token browser dan menjalankan `supabase.realtime.setAuth(token)` sebelum subscribe.

## 12. UI dan Tampilan

### Navigasi Community

Tab aktif:

- Beranda
- Temuan Komuter
- Cultural Map
- Permintaan
- Teman

Komponen:

```text
frontend/src/features/community/components/community-navigation.tsx
```

### Beranda

Elemen tampilan:

- Composer dengan avatar user.
- Textarea konten.
- Emoji picker.
- Tambah lokasi.
- Kamera/Galeri.
- Counter 0/500.
- Tombol posting.
- Feed dengan post card.
- Reaksi dan jumlah reply.

### Cultural Map

Elemen tampilan:

- Panel peta/list finding.
- Filter kategori.
- Author row dengan avatar.
- Badge kategori.
- Count confirmed dan reply.

### Permintaan

Elemen tampilan:

- Composer request.
- Segmented control "Permintaan Terbaru" dan "Sinyal Community".
- Request card dengan author, lokasi, budget, radius, expiry.
- Demand signal card dengan kategori, jumlah request, median budget, cluster radius, status.

### Detail Post

Elemen tampilan:

- Detail post.
- Media preview.
- Location map jika ada.
- Reaction bar.
- Comment thread depth terbatas.
- Report button.

### Friends

Elemen tampilan:

- Tab friends, incoming, outgoing.
- Avatar dan nama user.
- Relationship action button.
- Link ke profil user.

## 13. Frontend API Client

File:

```text
frontend/src/features/community/api/community.api.ts
```

Client memakai:

```text
authenticatedFetch
NEXT_PUBLIC_GETRA_API_URL
```

Jika `NEXT_PUBLIC_GETRA_API_URL` dan alias deprecated-nya kosong, client melempar error:

```text
NEXT_PUBLIC_GETRA_API_URL belum dikonfigurasi dengan URL backend GETRA yang valid.
```

Fungsi client utama:

- `getCommunityFeed`
- `createCommunityPost`
- `getCommunityPost`
- `getCommunityComments`
- `createCommunityComment`
- `setCommunityReaction`
- `getCommunityCulturalMap`
- `getCommuterRequests`
- `createCommuterRequest`
- `getCommuterRequest`
- `getCommunityDemandSignals`
- `getCommunityDemandSignal`
- `getCommunityDemandSignalResponses`
- `upsertCommunityDemandSignalResponse`
- `getCommunityNotifications`
- `markCommunityNotificationRead`
- `markAllCommunityNotificationsRead`
- `createCommunityReport`
- `getCommunityReputation`
- `getCommunityAnalytics`
- `getCommunityUserProfile`
- `sendCommunityFriendRequest`
- `actOnCommunityFriendship`
- `getCommunityFriends`

## 14. Security Model

Security layer:

- API route memakai authenticated guard untuk user Community.
- Admin API memakai admin policy/check.
- Supabase RLS aktif pada tabel Community.
- Direct table grants dibatasi; operasi utama lewat RPC.
- Storage Community post memakai signed URL, bukan public URL.
- Avatar profile public karena bucket `avatars` memang untuk profile display.
- Service memvalidasi input dengan Zod sebelum masuk repository.
- Repository memetakan error database ke error aplikasi.

RLS/high-level policy:

- `community_posts`: authenticated read, own insert/update sesuai rule migration.
- `community_media`: authenticated read, insert untuk owner post.
- `community_comments`: authenticated read/insert.
- `community_reactions`: authenticated read/insert/delete sesuai user.
- `commuter_requests`: authenticated select, insert/update own.
- `community_notifications`: recipient select/update read state.
- `community_reports`: reporter select, create via RPC.
- `community_friendships`: participant select; mutation via RPC.
- `community_realtime_events`: scoped select berdasarkan recipient/post/signal.

## 15. Testing dan Verifikasi

Test backend yang berhasil dijalankan:

```text
npm test
```

Hasil terakhir:

```text
Test Files: 75 passed, 1 skipped
Tests: 511 passed, 1 skipped
```

File test Community yang relevan:

```text
backend/tests/unit/community/community.repository.test.ts
backend/tests/unit/community/community.schema.test.ts
backend/tests/unit/community/community.service.test.ts
backend/tests/integration/community-demand-signals-route.test.ts
frontend/tests/community-page.test.ts
```

Checklist QA manual:

1. Login sebagai user biasa.
2. Buka `/community`.
3. Buat post general tanpa foto.
4. Buat finding dengan kategori dan lokasi.
5. Tambahkan emoji.
6. Upload foto via kamera/galeri.
7. Pastikan foto tampil dan signed URL valid.
8. Buka detail post.
9. Tambah comment root.
10. Tambah reply sampai depth 2.
11. Coba reaction helpful, interesting, confirmed.
12. Buka Cultural Map dan cek finding muncul.
13. Buat commuter request.
14. Buka detail commuter request.
15. Buka tab Sinyal Community.
16. Login sebagai merchant/owner yang punya merchant.
17. Buat respons UMKM untuk demand signal.
18. Cek notifikasi user target.
19. Tandai notifikasi read dan read all.
20. Laporkan post/comment.
21. Login admin dan cek report.
22. Jalankan action moderation.
23. Buka profil user lain.
24. Kirim friend request.
25. Accept/decline/cancel/unfriend sesuai role.
26. Cek avatar profile tampil di semua surface.

## 16. Environment dan Cara Menjalankan

Install dependency:

```text
npm install
```

Menjalankan frontend:

```text
npm run dev -w frontend
```

Menjalankan backend:

```text
npm run dev -w backend
```

Menjalankan semua service dev:

```text
npm run dev
```

Environment penting:

```text
NEXT_PUBLIC_GETRA_API_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Backend berjalan default di port 8080 melalui script:

```text
node ../scripts/dev-next.mjs backend 8080
```

Frontend berjalan default di port 3000 melalui script:

```text
node ../scripts/dev-next.mjs frontend 3000
```

## 17. Build, Lint, dan Known Blockers

Pada audit terakhir, fitur Community tidak muncul sebagai sumber error typecheck baru. Namun gate global project belum hijau karena modul lain.

### Backend Typecheck Blocker

Command:

```text
npm run typecheck -w backend
```

Masih gagal pada area:

- `backend/app/api/admin/merchant-submissions/...`
- `backend/app/api/umkm/merchant-submissions/...`
- `backend/app/api/umkm/workspace/route.ts`
- `backend/app/api/umkm/advertising/campaigns/[id]/analytics/route.ts`

Pola error:

- `ZodError.errors` tidak tersedia.
- Helper response dipanggil dengan jumlah argumen salah.
- `string[]` diberikan ke parameter `string`.

### Frontend Typecheck Blocker

Command:

```text
npm run typecheck -w frontend
```

Masih gagal pada area:

- `frontend/src/features/merchant-submission/...`
- `frontend/src/features/umkm-workspace/...`
- `frontend/src/features/umkm-advertising/analytics/...`

Pola error:

- Client mengasumsikan envelope `{ success, data, error }` padahal type actual bukan envelope.
- `account_role` tidak ada di `UserContext`.
- Beberapa implicit any.

### Frontend Build Blocker

Command:

```text
npm run build -w frontend
```

Masih gagal karena modul `umkm-advertising` mengimpor hook React (`useState`, `useEffect`) ke Server Component melalui barrel export.

Contoh area:

- `frontend/src/features/umkm-advertising/hooks/use-campaigns.ts`
- `frontend/src/features/umkm-advertising/hooks/use-advertising-eligibility.ts`
- `frontend/src/features/umkm-advertising/ad-serving/hooks/use-sponsored-pin-candidates.ts`
- `frontend/app/umkm/advertising/analytics/page.tsx`

### Backend Build Note

Backend build pernah terblokir karena Next mendeteksi proses build/dev lain masih berjalan dan mengunci `.next`.

Rekomendasi:

1. Matikan proses dev/build Next yang tidak dibutuhkan.
2. Bersihkan lock/cache jika aman.
3. Ulangi `npm run build -w backend`.

## 18. Handoff untuk Developer Selanjutnya

Prioritas sebelum release:

1. Selesaikan blocker typecheck/build/lint global di modul UMKM dan advertising.
2. Jalankan ulang:
   - `npm run typecheck -w backend`
   - `npm run typecheck -w frontend`
   - `npm run lint -w backend`
   - `npm run lint -w frontend`
   - `npm test -w backend`
   - `npm run build -w backend`
   - `npm run build -w frontend`
3. Jalankan QA manual Community dari checklist.
4. Jalankan audit responsive untuk mobile dan desktop.
5. Verifikasi RLS dengan user berbeda:
   - user A tidak bisa mengubah notifikasi user B.
   - user A tidak bisa menerima friend request milik user B.
   - merchant hanya bisa merespons memakai merchant yang dimiliki/diotorisasi.
6. Verifikasi avatar canonical setelah user mengganti foto profile.
7. Verifikasi signed URL media post tidak stale saat feed refresh.

## 19. File yang Paling Sering Disentuh

Jika ingin mengubah kontrak API:

```text
backend/src/features/community/types/community.types.ts
backend/src/features/community/schemas/community.schema.ts
frontend/src/features/community/types/community.types.ts
frontend/src/features/community/api/community.api.ts
```

Jika ingin mengubah query database:

```text
backend/src/features/community/repositories/community.repository.ts
backend/supabase/migrations/
```

Jika ingin mengubah UI:

```text
frontend/src/features/community/components/
frontend/src/features/community/components/community.module.css
```

Jika ingin mengubah media upload:

```text
backend/src/features/community/services/community-media.service.ts
backend/src/features/community/constants/community.constants.ts
```

Jika ingin mengubah realtime:

```text
frontend/src/features/community/services/community-realtime.service.ts
backend/supabase/migrations/20260823210000_add_community_operational_layer.sql
```

## 20. Catatan Arsitektur

Keputusan penting:

- Business mutation Community dipusatkan pada Supabase RPC, bukan direct table mutation dari frontend.
- Frontend hanya berkomunikasi ke backend API route, bukan langsung ke table.
- Backend repository adalah satu-satunya adapter domain Community ke Supabase RPC.
- DTO frontend memakai camelCase.
- Payload API input tetap snake_case untuk beberapa field agar konsisten dengan existing backend contract.
- Avatar profile tidak digandakan di Community.
- Foto post dan foto profile dipisahkan:
  - Foto post: private-ish signed URL dari `community-media`.
  - Foto profile: canonical public avatar URL dari `profiles.avatar_url`.

## 21. Quick Reference

URL frontend:

```text
/community
/community/[id]
/community/requests/[requestId]
/community/requests/signals/[signalId]
/community/users/[userId]
/community/friends
```

Header tab:

```text
Beranda | Temuan Komuter | Cultural Map | Permintaan | Teman
```

Max content:

```text
Post: 500 karakter
Comment: 500 karakter
Request title: 120 karakter
Request description: 500 karakter
UMKM response message: 500 karakter
Report details: 500 karakter
```

Media:

```text
Input: jpeg/png/webp, max 10 MB
Output: image/webp, max 2048 px, max 10 MB
Signed URL: 10 menit
```

Demand:

```text
Window: 7 hari
Cluster radius: 1000 m
Minimal request: 3
Budget bucket: Rp25.000
```

## 22. Kesimpulan

Community sudah memiliki fondasi fitur yang lengkap untuk pengalaman sosial berbasis lokasi di GETRA. Handoff ini mencakup struktur file, API, kontrak data, database, UI, realtime, media, security, testing, dan blocker release.

Sebelum release production, tim perlu menyelesaikan blocker global project di luar modul Community, lalu menjalankan ulang semua gate quality dan QA manual Community.
