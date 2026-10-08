#  MedRespons Mobile

## 1. Tentang Program

**MedRespons Mobile** adalah aplikasi mobile yang dibuat untuk membantu pengguna dalam mengakses layanan dan informasi yang berkaitan dengan keadaan darurat medis.

Aplikasi ini dikembangkan menggunakan **React Native dan Expo**, sehingga aplikasi dapat dijalankan pada perangkat Android maupun iPhone.

MedRespons dirancang sebagai aplikasi mobile untuk:

* meminta bantuan ambulans,
* mencatat aktivitas atau riwayat layanan,
* mencari informasi fasilitas kesehatan,
* mengakses informasi darurat,
* mengelola akun pengguna,
* serta berkomunikasi dengan backend melalui REST API.

Aplikasi menggunakan **komponen native React Native** dan tidak menggunakan halaman website maupun WebView.

---

# 2. Tujuan Program

MedRespons dibuat dengan tujuan untuk membantu proses layanan darurat medis secara digital.

Tujuan utama aplikasi adalah:

1. Memudahkan pengguna melakukan permintaan ambulans.
2. Menyediakan akses informasi fasilitas kesehatan.
3. Menyimpan riwayat permintaan layanan.
4. Menyediakan sistem akun pengguna.
5. Mengamankan sesi login pengguna.
6. Menghubungkan aplikasi mobile dengan backend menggunakan REST API.
7. Menampilkan status dan aktivitas layanan kepada pengguna.
8. Menyediakan akses cepat untuk melakukan panggilan darurat.
9. Menjadi prototype sistem layanan ambulans berbasis mobile.

---

# 3. Platform yang Digunakan

MedRespons merupakan aplikasi **mobile**, bukan website.

Teknologi utama yang digunakan:

```text
React Native
      │
      ▼
    Expo
      │
 ┌────┴────┐
 │         │
Android   iPhone
```

React Native digunakan untuk membangun tampilan dan interaksi aplikasi, sedangkan Expo digunakan untuk mempermudah proses pengembangan dan menjalankan aplikasi pada perangkat.

---

# 4. Gambaran Umum Sistem

MedRespons terdiri dari dua bagian utama:

```text
                MedRespons
                    │
          ┌─────────┴─────────┐
          │                   │
      MOBILE APP           BACKEND
          │                   │
 React Native + Expo       Node.js
          │                   │
          └─────────┬─────────┘
                    │
                 REST API
                    │
                    ▼
              Data JSON
```

### Mobile App

Digunakan langsung oleh pengguna melalui smartphone.

### Backend

Digunakan untuk:

* autentikasi,
* menyimpan data,
* menerima permintaan ambulans,
* menyediakan data fasilitas kesehatan,
* menyediakan REST API.

---

# 5. Alur Utama Aplikasi

Alur penggunaan MedRespons:

```text
Buka Aplikasi
      ↓
Masuk / Daftar
      ↓
Beranda
      ↓
┌─────┼─────────────┐
│     │             │
▼     ▼             ▼
SOS  Fasilitas    Aktivitas
│     Kesehatan      │
│                    │
▼                    ▼
Request Ambulans   Riwayat
│
▼
Backend API
│
▼
Permintaan Disimpan
```

---

# 6. Struktur Project

Secara umum project MedRespons terdiri dari bagian aplikasi mobile dan backend.

Contoh struktur:

```text
MedRespons/
│
├── app/
├── assets/
├── components/
├── services/
├── backend/
│   ├── data/
│   │   ├── users.json
│   │   ├── emergency-requests.json
│   │   └── healthcare-facilities.json
│   │
│   └── ...
│
├── .env.example
├── DATA_MODEL.md
├── package.json
└── README.md
```

Setiap bagian mempunyai fungsi masing-masing.

---

# 7. Bagian `app/`

Folder:

```text
app/
```

merupakan bagian utama aplikasi mobile.

Bagian ini berisi halaman atau screen yang ditampilkan kepada pengguna.

Contohnya dapat mencakup:

```text
Masuk
Daftar
Beranda
Aktivitas
Fasilitas Kesehatan
Permintaan Ambulans
Profil
```

Karena menggunakan React Native dan Expo, halaman aplikasi ditampilkan sebagai **native mobile screen**, bukan halaman HTML dari website.

---

# 8. Halaman Masuk

Halaman **Masuk** digunakan oleh pengguna yang sudah mempunyai akun.

Pengguna memasukkan:

```text
Email
Password
```

Data kemudian dikirim ke backend melalui:

```text
POST /api/auth/login
```

Jika login berhasil, backend memberikan token sesi.

Token tersebut kemudian disimpan secara aman menggunakan:

```text
expo-secure-store
```

---

# 9. Halaman Daftar

Halaman **Daftar** digunakan untuk membuat akun baru.

Data yang diperlukan:

```text
Nama Lengkap
Email
Password
Konfirmasi Password
```

Password harus memiliki minimal:

```text
8 karakter
```

Validasi dilakukan pada aplikasi dan server.

Data kemudian dikirim menggunakan:

```text
POST /api/auth/register
```

---

# 10. Sistem Autentikasi

MedRespons memiliki sistem autentikasi agar data pengguna tidak dapat diakses sembarang orang.

Alurnya:

```text
User
 │
 ▼
Login
 │
 ▼
Backend
 │
 ├── Validasi email
 ├── Validasi password
 └── Validasi akun
 │
 ▼
Bearer Token
 │
 ▼
Secure Storage
 │
 ▼
User dapat menggunakan aplikasi
```

---

# 11. Keamanan Password

Password pengguna **tidak disimpan dalam bentuk teks biasa**.

Backend menggunakan:

```text
scrypt
```

untuk menghasilkan:

```text
Salt + Password Hash
```

Dengan demikian, database tidak menyimpan password asli pengguna.

---

# 12. Sistem Token

Setelah login berhasil, backend membuat **bearer token** secara acak.

Token tersebut digunakan ketika aplikasi mengakses endpoint yang membutuhkan autentikasi.

Contohnya:

```text
Authorization:
Bearer <token>
```

Token berlaku selama:

```text
7 hari
```

Setelah masa berlaku habis, pengguna perlu melakukan login kembali.

---

# 13. Secure Storage

Token login disimpan menggunakan:

```text
expo-secure-store
```

Tujuannya agar token tidak disimpan sembarangan di penyimpanan aplikasi.

Saat pengguna logout:

```text
Token aplikasi dihapus
        +
Session token di server dihapus
```

---

# 14. Halaman Beranda

**Beranda** merupakan halaman utama setelah pengguna berhasil login.

Beranda dapat menampilkan:

* informasi pengguna,
* akses permintaan ambulans,
* tombol darurat,
* shortcut fasilitas kesehatan,
* aktivitas terbaru,
* informasi layanan.

Beranda menjadi pusat navigasi utama aplikasi.

---

# 15. Permintaan Ambulans

Fitur utama MedRespons adalah **permintaan bantuan ambulans**.

Pengguna dapat membuat permintaan ketika membutuhkan layanan ambulans.

Alurnya:

```text
User
 ↓
Request Ambulance
 ↓
Isi Data Permintaan
 ↓
Kirim
 ↓
REST API
 ↓
Backend
 ↓
Data Disimpan
 ↓
Request Berhasil
```

Endpoint yang digunakan:

```text
POST /api/emergency-requests
```

---

# 16. Data Permintaan Ambulans

Data permintaan ambulans disimpan oleh backend.

Data tersebut dapat berisi informasi seperti:

```text
ID Permintaan
Pemilik Permintaan
Informasi Darurat
Lokasi
Waktu Permintaan
Status
```

Data disimpan pada:

```text
backend/data/emergency-requests.json
```

---

# 17. Aktivitas / Riwayat

Halaman **Aktivitas** digunakan untuk melihat aktivitas layanan pengguna.

Data aktivitas diperoleh melalui:

```text
GET /api/emergency-requests
```

Karena server mengambil identitas pengguna dari session token, pengguna hanya dapat melihat permintaan miliknya sendiri.

Contohnya:

```text
Permintaan #001
Status: Pending

Permintaan #002
Status: Completed
```

---

# 18. Fasilitas Kesehatan

MedRespons juga menyediakan fitur untuk mencari fasilitas kesehatan.

Contohnya:

```text
Rumah Sakit
Klinik
Fasilitas Medis
```

Data fasilitas diperoleh dari backend melalui:

```text
GET /api/healthcare-facilities
```

Pengguna dapat melakukan pencarian menggunakan kolom pencarian.

Contoh:

```text
Cari:
"Rumah Sakit"
```

Aplikasi kemudian mengirim query ke backend dan menampilkan hasil yang sesuai.

---

# 19. Shortcut Fasilitas Medis

Pada halaman **Beranda** terdapat shortcut menuju daftar fasilitas medis.

Alurnya:

```text
Beranda
   ↓
Fasilitas Medis
   ↓
GET /healthcare-facilities
   ↓
Backend
   ↓
Data Fasilitas
```

Data bawaan yang terdapat pada backend merupakan **data demo**, sehingga belum dapat dianggap sebagai daftar rumah sakit resmi.

Untuk penggunaan nyata, data tersebut harus diganti dengan data fasilitas kesehatan yang resmi dan terverifikasi.

---

# 20. Tombol Darurat 119

MedRespons menyediakan akses cepat untuk melakukan panggilan darurat:

```text
119
```

Tombol tersebut dapat digunakan untuk menghubungi layanan darurat melalui fitur telepon perangkat.

Namun, tombol ini tidak berarti bahwa backend MedRespons telah terhubung langsung dengan sistem dispatch ambulans 119.

Pengguna tetap harus mengandalkan layanan darurat resmi.

---

# 21. REST API

Mobile app berkomunikasi dengan backend menggunakan **REST API**.

Secara umum:

```text
React Native
     │
     │ HTTP Request
     ▼
REST API
     │
     ▼
Backend
     │
     ▼
JSON Data
     │
     ▼
React Native
```

API digunakan untuk:

* autentikasi,
* mengambil data,
* membuat permintaan,
* mengambil fasilitas kesehatan,
* logout.

---

# 22. Endpoint Authentication

Backend menyediakan beberapa endpoint autentikasi.

### Register

```text
POST /api/auth/register
```

Digunakan untuk membuat akun baru.

### Login

```text
POST /api/auth/login
```

Digunakan untuk melakukan login.

### Me

```text
GET /api/auth/me
```

Digunakan untuk mendapatkan informasi pengguna yang sedang login.

### Logout

```text
POST /api/auth/logout
```

Digunakan untuk mengakhiri sesi.

---

# 23. Endpoint Emergency Request

### Mengambil permintaan

```text
GET /api/emergency-requests
```

Digunakan untuk mendapatkan daftar permintaan milik pengguna.

### Membuat permintaan

```text
POST /api/emergency-requests
```

Digunakan untuk membuat permintaan ambulans baru.

---

# 24. Endpoint Healthcare Facilities

```text
GET /api/healthcare-facilities
```

Digunakan untuk mengambil daftar fasilitas kesehatan.

Endpoint tersebut juga dapat meneri
