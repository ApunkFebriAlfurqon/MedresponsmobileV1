# Rancangan Data Model MedRespons

Dokumen ini memuat rancangan data untuk aplikasi MedRespons, dengan fokus pada permintaan bantuan ambulans dan riwayat layanan.

## Resource aplikasi

1. **Pengguna** — identitas, kontak, alamat tersimpan, dan kontak darurat.
2. **Permintaan darurat** — pasien, kondisi, lokasi penjemputan, catatan, status, dan waktu permintaan.
3. **Ambulans** — identitas unit, status kesiapan, lokasi, dan permintaan yang sedang ditangani.
4. **Fasilitas kesehatan** — nama rumah sakit, alamat, nomor telepon, dan layanan darurat.

## Contoh JSON

### `emergencyRequest.json`

```json
{
  "id": "MR-240812",
  "userId": "USR-1001",
  "patient": {
    "name": "Rani Putri",
    "condition": "Sesak napas"
  },
  "pickup": {
    "address": "Jl. Diponegoro, Surabaya",
    "latitude": -7.2756,
    "longitude": 112.7590
  },
  "notes": "Pintu masuk melalui gerbang samping",
  "status": "searching_ambulance",
  "ambulanceId": null,
  "createdAt": "2026-08-12T07:32:00Z",
  "updatedAt": "2026-08-12T07:32:00Z"
}
```

### `user.json`

```json
{
  "id": "USR-1001",
  "fullName": "Rani Putri",
  "phone": "+6281234567890",
  "email": "rani@example.com",
  "savedAddresses": [
    {
      "label": "Rumah",
      "address": "Jl. Diponegoro, Surabaya"
    }
  ],
  "emergencyContacts": [
    {
      "name": "Budi Putra",
      "relationship": "Keluarga",
      "phone": "+6281234567891"
    }
  ]
}
```

### `ambulance.json`

```json
{
  "id": "AMB-SBY-024",
  "registrationNumber": "L 1234 XX",
  "status": "available",
  "location": {
    "latitude": -7.2800,
    "longitude": 112.7500
  },
  "activeRequestId": null
}
```

### `healthcareFacility.json`

```json
{
  "id": "FAC-SBY-001",
  "name": "Rumah Sakit Contoh",
  "address": "Surabaya, Jawa Timur",
  "phone": "+62315550000",
  "location": {
    "latitude": -7.2650,
    "longitude": 112.7450
  },
  "emergencyServices": ["IGD", "Ambulans"]
}
```

## Tipe dan aturan data

- ID disimpan sebagai `string`; awalan permintaan MedRespons adalah `MR-`.
- Waktu `createdAt` dan `updatedAt` menggunakan format ISO 8601.
- Koordinat lokasi bertipe `number`; jika izin lokasi tidak tersedia, alamat tetap dapat diisi manual.
- `status` permintaan: `submitted`, `searching_ambulance`, `assigned`, `in_transit`, `completed`, atau `cancelled`.
- `GET /api/emergency-requests` mengembalikan `{ "data": [...], "count": 0 }`; setiap item mengikuti model `emergencyRequest` di atas. Opsional, query `?status=completed` memfilter status.
- `POST /emergency-requests` menerima objek pasien, lokasi jemput, catatan, dan status. Server sebaiknya mengisi ID serta `createdAt`/`updatedAt`, lalu mengembalikan record yang dibuat (langsung atau dalam properti `data`).
- Semua path backend menggunakan awalan `/api`. POST permintaan darurat mengembalikan HTTP 201 dan JSON `{ "data": record }`.
- `GET /api/healthcare-facilities` mengembalikan `{ "data": [...], "count": 0, "notice": "..." }`. Query opsional `?q=tlogomas` mencari nama fasilitas, alamat, dan layanan. Endpoint direktori ini bersifat publik dan dibaca oleh shortcut **Fasilitas medis** di Beranda.
- Data fasilitas demo berada di `backend/data/healthcare-facilities.json` dan setiap record memiliki `isSample: true`. Nama serta alamat dalam file tersebut hanyalah contoh; ganti dengan data resmi yang telah diverifikasi sebelum penggunaan nyata.
- Backend memantau penyimpanan file fasilitas dan permintaan darurat, lalu menerapkan JSON valid ke memori tanpa restart. Aplikasi menyegarkan daftar yang sedang dibuka kira-kira setiap 5 detik; akun di `users.json` tidak termasuk pemantauan otomatis.
- Endpoint autentikasi: `POST /api/auth/register` menerima `{ "fullName", "email", "password" }`; `POST /api/auth/login` menerima `{ "email", "password" }`. Keduanya mengembalikan `{ "data": { "token", "expiresAt", "user" } }`.
- `GET /api/auth/me` membaca profil sesi aktif dan `POST /api/auth/logout` mencabut sesi. Keduanya serta seluruh endpoint permintaan darurat memerlukan header `Authorization: Bearer <token>`.
- `GET /api/health` menyediakan health check; `GET /api/emergency-requests/:id` mengambil permintaan milik pengguna yang sedang login.
- Email dinormalisasi menjadi huruf kecil; password minimal 8 karakter. Rate limit sementara membatasi endpoint register/login hingga 10 percobaan per alamat IP dalam 15 menit.
- Aplikasi memetakan record API ke tampilan aktivitas: `id`, `createdAt`, `status`, dan `pickup.address`.
- Base URL API ditentukan melalui `EXPO_PUBLIC_API_URL` di `.env`, misalnya `http://192.168.1.10:3000/api`; aplikasi menambahkan path endpoint di atas.
- Backend contoh ada di folder `backend/`; akun dan permintaan dipersistenkan ke file JSON, sedangkan sesi aktif hanya ada di memori sampai server restart atau sesi dicabut. Password disimpan dengan scrypt + salt dan respons profil tidak menyertakan hash. Data permintaan belum dienkripsi dan sistem belum diaudit untuk produksi; gunakan data contoh saja.
- Pelacakan lokasi otomatis dan dispatch ambulans belum terhubung; koordinat lokasi masih opsional dan formulir saat ini mengirim alamat manual.
