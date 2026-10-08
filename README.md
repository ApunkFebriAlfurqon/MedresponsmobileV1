# MedRespons Mobile

Aplikasi mobile MedRespons dibuat dengan React Native dan Expo untuk membantu pengguna meminta bantuan ambulans, mencatat aktivitas layanan, dan mengakses informasi darurat. UI menggunakan komponen native, tanpa halaman website atau WebView.

## Jalankan dengan Expo Go

1. Instal aplikasi **Expo Go** pada Android atau iPhone.
2. Dari folder proyek ini, jalankan `npm install` (cukup sekali).
3. Salin `.env.example` menjadi `.env`, lalu ganti `EXPO_PUBLIC_API_URL` dengan alamat backend MedRespons. Di HP fisik, gunakan IP LAN komputer, bukan `localhost`.
4. Jalankan `npm start` setelah konfigurasi API disiapkan.
5. Pindai QR code yang ditampilkan di terminal dengan Expo Go. Ponsel dan komputer perlu dapat saling terhubung melalui jaringan.

Jika koneksi LAN diblokir firewall/router, tunnel bisa dicoba dengan `npx expo start --tunnel` setelah dependency tunnel Expo berhasil dipasang.

## Integrasi REST API

Aplikasi membaca aktivitas dengan `GET /emergency-requests`, membuat permintaan dengan `POST /emergency-requests`, dan menampilkan direktori melalui `GET /healthcare-facilities`, ditambahkan ke base URL di `.env`. Path di backend diawali `/api`. Format request dan response dijelaskan di [DATA_MODEL.md](DATA_MODEL.md). Jika URL belum diatur atau server tidak dapat dijangkau, aplikasi menampilkan pesan error dan tombol coba lagi.

### Jalankan backend lokal

1. Buka terminal pada folder `rapidaid` dan jalankan `npm --prefix backend install`.
2. Di terminal pertama, jalankan backend dengan `npm run backend` (atau `npm run backend:dev` untuk restart otomatis saat file berubah). API mendengarkan pada port 3000.
3. Di terminal kedua, salin `.env.example` menjadi `.env`, lalu ganti alamat IP contoh dengan IP LAN komputer, misalnya `EXPO_PUBLIC_API_URL=http://192.168.1.25:3000/api`. Restart Expo setelah mengubah `.env`.
4. Jalankan Expo dengan `npm start`. Komputer dan HP harus berada pada jaringan yang saling terhubung; izinkan Node.js melalui firewall bila diminta.
5. Cek `http://localhost:3000/api/health` di browser komputer. Dari HP fisik, `localhost` menunjuk ke HP itu sendiri, bukan komputer.

Backend menyimpan permintaan di `backend/data/emergency-requests.json`, sehingga data tetap ada setelah server dimulai ulang. Endpoint tersedia di [DATA_MODEL.md](DATA_MODEL.md).

Shortcut **Fasilitas medis** pada Beranda membuka daftar fasilitas dari API. Kolom pencarian mengirim query ke backend. Isi bawaan pada `backend/data/healthcare-facilities.json` hanya data demo dan bukan daftar rumah sakit terverifikasi; ganti dengan data resmi sebelum digunakan di lapangan.

Backend memantau perubahan pada `backend/data/healthcare-facilities.json` dan `backend/data/emergency-requests.json`, lalu memuat JSON valid yang disimpan tanpa perlu restart manual. Aplikasi juga menyegarkan daftar fasilitas saat layarnya terbuka dan riwayat saat Beranda/Aktivitas terlihat (sekitar setiap 5 detik). Setelah memasang fitur pemantauan ini, restart backend satu kali agar watcher aktif. File akun `users.json` belum dipantau dan tetap perlu backend dimulai ulang setelah diedit. Perubahan JSON yang belum disimpan, atau JSON yang tidak valid, tidak akan diterapkan.

### Alur akun (Task Authentication)

- Aplikasi membuka halaman **Masuk** atau **Daftar** sebelum menampilkan halaman utama.
- Daftar meminta nama lengkap, email, password minimal 8 karakter, dan konfirmasi password; validasi dijalankan di aplikasi dan di server.
- Backend menyediakan `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, dan `POST /api/auth/logout`.
- Password tidak disimpan sebagai teks biasa: backend menyimpan salt dan hash scrypt. Setelah berhasil, backend menerbitkan bearer token acak yang berlaku 7 hari; aplikasi menyimpannya melalui `expo-secure-store`.
- Endpoint permintaan darurat memerlukan bearer token. Server mengambil identitas pemilik dari sesi, sehingga pengguna hanya dapat melihat permintaannya sendiri. Logout menghapus sesi token server.
- Sesi disimpan dalam memori server dan akan berakhir saat backend dimulai ulang. Pengguna kemudian perlu login kembali. Akun tersimpan pada `backend/data/users.json`.

## Catatan

Autentikasi ini adalah implementasi pembelajaran lokal, bukan sistem produksi yang telah diaudit. File akun menyimpan hash password, tetapi file permintaan pasien tetap berupa JSON tanpa enkripsi; gunakan data contoh saja dan jangan mengekspos backend ke internet. Sebelum produksi, tambahkan HTTPS, penyimpanan database terenkripsi, kebijakan retensi, pemulihan akun, audit keamanan, dan pengelolaan sesi/token yang sesuai. Lokasi perangkat, pembayaran, daftar fasilitas kesehatan, serta dispatch ambulans belum terhubung. Tombol panggilan darurat 119 tetap dapat dihubungi melalui telepon; jangan mengandalkan prototipe ini sebagai pengganti layanan darurat resmi.

Lihat rancangan entitas, contoh JSON, dan kontrak API pada [DATA_MODEL.md](DATA_MODEL.md).
