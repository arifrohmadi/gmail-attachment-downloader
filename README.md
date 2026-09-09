# 📎 Gmail Attachment Downloader (by Prefix)

Aplikasi web satu-file (`gmail-attachment-downloader.html`) untuk mencari dan mengunduh attachment Gmail berdasarkan **prefix nama file** (misalnya `DAA_T1`, `PWB_A_T2`). Aplikasi ini berjalan 100% di browser — tidak ada server backend, tidak ada data yang dikirim ke pihak ketiga selain langsung ke Gmail API milik Google.

Cocok dipakai untuk kasus seperti: mengumpulkan file tugas mahasiswa yang dikirim lewat email dengan pola nama file yang seragam (`DAA_T1_<NIM>.pdf`, dll).

---

## ✨ Fitur

- **Login Gmail langsung dari browser** menggunakan Google OAuth (tidak perlu backend/server).
- **Pencarian attachment berdasarkan prefix nama file**, *case-insensitive* — `DAA_T1`, `daa_t1`, dan `Daa_T1` dianggap sama, begitu juga nama file seperti `DAA_T1_L0125123.pdf` vs `daa_t1_l0125123.pdf`.
- **Filter tambahan Gmail** (opsional) menggunakan sintaks pencarian Gmail biasa, misalnya `from:dosen@kampus.ac.id after:2024/01/01`.
- **Deduplikasi otomatis** (opsional): jika ditemukan beberapa attachment dengan nama file yang sama, hanya email/versi terbaru yang disimpan, sisanya dianggap duplikat.
- **Tabel hasil pencarian** yang bisa diurutkan (sort) berdasarkan Nomor, Nama File, Subjek Email, atau Tanggal — klik header kolom untuk mengurutkan.
- **Pilih attachment secara individual** lewat checkbox, atau gunakan tombol "Pilih Semua" / "Batal Semua".
- **Download satu per satu** langsung dari tabel hasil, atau **download massal dalam bentuk file `.zip`**.
- **Client ID OAuth disimpan otomatis** di `localStorage` browser agar tidak perlu diketik ulang setiap kali dibuka.

---

## 🧰 Kebutuhan (Prerequisites)

1. Browser modern (Chrome, Edge, Firefox, dsb).
2. Akun Google/Gmail yang ingin diakses attachment-nya.
3. **Google OAuth Client ID** milik Anda sendiri (gratis, dibuat sekali). Panduan lengkap tersedia langsung di dalam aplikasi lewat tombol **"📘 Cara Membuat Client ID"**, ringkasannya:
   1. Buka [console.cloud.google.com](https://console.cloud.google.com/) → buat project baru (atau pakai yang sudah ada).
   2. Buka **APIs & Services → Library**, cari **Gmail API**, klik **Enable**.
   3. Buka **APIs & Services → OAuth consent screen**, pilih **External**, isi nama app & email, simpan. Tambahkan email Anda di bagian **Test users**.
   4. Buka **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   5. Pilih **Application type: Web application**.
   6. Di **Authorized JavaScript origins**, tambahkan alamat tempat file HTML ini akan dibuka, misalnya:
      - `http://localhost:5500` (jika pakai ekstensi Live Server di VS Code), atau
      - alamat domain hosting Anda (harus **https**, kecuali `localhost`).
   7. Copy **Client ID** yang dihasilkan.

   > ⚠️ **Catatan penting:** membuka file langsung via `file://` **tidak didukung** oleh Google OAuth. File ini harus dibuka melalui server HTTP lokal atau hosting, misalnya:
   > - Ekstensi **Live Server** di VS Code, atau
   > - Jalankan `python -m http.server` di folder file ini, lalu buka `http://localhost:8000` di browser.

---

## 🚀 Cara Menjalankan

1. Simpan file `gmail-attachment-downloader.html` di komputer Anda.
2. Jalankan lewat server lokal (lihat catatan `file://` di atas), misalnya:
   ```bash
   python -m http.server 8000
   ```
   lalu buka `http://localhost:8000/gmail-attachment-downloader.html` di browser.
3. **Langkah 1 — Konfigurasi OAuth Client ID**
   - Tempel Client ID Anda ke kolom yang tersedia.
   - Klik **🔐 Hubungkan Akun Gmail** dan izinkan akses (scope: `gmail.readonly`, hanya baca).
   - Client ID akan otomatis tersimpan di browser untuk pemakaian berikutnya (bisa dihapus lewat tombol **🗑️ Hapus Client ID Tersimpan**).
4. **Langkah 2 — Filter Pencarian**
   - Isi **Prefix nama file attachment** (wajib), misalnya `DAA_T1`.
   - (Opsional) isi **Filter tambahan Gmail** menggunakan sintaks pencarian Gmail, misalnya `from:dosen@kampus.ac.id after:2024/01/01`.
   - (Opsional) centang **"Jika ada nama file sama, ambil hanya 1 (versi/email terbaru)"** untuk mengaktifkan deduplikasi.
   - Klik **🔍 Cari Attachment**.
5. **Langkah 3 — Hasil Pencarian**
   - Tabel akan menampilkan semua attachment yang cocok dengan prefix, lengkap dengan nama file, subjek email, dan tanggal.
   - Klik header kolom untuk mengurutkan hasil.
   - Centang/hilangkan centang attachment yang diinginkan, atau gunakan **Pilih Semua** / **Batal Semua**.
   - Klik **Download** di baris tertentu untuk mengunduh satu file, atau klik **⬇️ Download Terpilih (.zip)** untuk mengunduh semua yang tercentang sekaligus dalam satu file ZIP.

---

## 🔍 Cara Kerja Pencarian

1. Aplikasi mencari semua email yang memiliki attachment (`has:attachment`) ditambah filter tambahan (jika diisi), menggunakan Gmail API (`users.messages.list`).
2. Untuk setiap email yang ditemukan, aplikasi mengambil detail lengkapnya (`users.messages.get`) lalu memeriksa setiap bagian/part attachment.
3. Attachment yang **nama filenya diawali** oleh prefix yang dimasukkan akan disimpan sebagai hasil. Pencocokan ini **tidak membedakan huruf besar/kecil (case-insensitive)** — misalnya prefix `DAA_T1` akan cocok dengan file bernama `DAA_T1_L0125123.pdf`, `daa_t1_l0125123.pdf`, maupun `dAa_T1_L0125123.pdf`.
4. Jika opsi deduplikasi diaktifkan, attachment dengan **nama file yang sama** (juga dibandingkan tanpa memandang huruf besar/kecil) akan disaring — hanya versi dari email dengan tanggal paling baru yang disimpan, sisanya ditandai sebagai duplikat dan ditampilkan sebagai peringatan di atas tabel hasil.

---

## 🔐 Privasi & Keamanan

- Aplikasi ini **tidak memiliki backend/server sendiri** — semua proses (autentikasi, pencarian, pengunduhan, pembuatan ZIP) berjalan langsung di browser Anda.
- Scope OAuth yang diminta adalah `https://www.googleapis.com/auth/gmail.readonly` — **hanya izin baca**, tidak bisa mengirim, menghapus, atau mengubah email/attachment Anda.
- Client ID OAuth disimpan di `localStorage` browser lokal Anda saja (tidak dikirim ke server manapun selain Google), dan bisa dihapus kapan saja lewat tombol **🗑️ Hapus Client ID Tersimpan**.

---

## 🧩 Teknologi yang Digunakan

- **Google Identity Services (GSI)** — untuk proses OAuth login (`accounts.google.com/gsi/client`).
- **Google API Client (`gapi`)** — untuk memanggil Gmail API (`apis.google.com/js/api.js`).
- **JSZip** — untuk membuat file `.zip` dari beberapa attachment sekaligus, dimuat dari CDN `cdnjs.cloudflare.com`.
- HTML, CSS, dan JavaScript murni (vanilla) — tanpa framework, tanpa proses build.

---

## ⚠️ Batasan yang Perlu Diketahui

- Karena aplikasi ini menggunakan OAuth **Test Mode** secara default (kecuali consent screen di-publish), token akses biasanya hanya berlaku sementara dan mungkin perlu login ulang secara berkala.
- Pencarian memeriksa email satu per satu (`messages.get`) sehingga bisa memakan waktu jika jumlah email dengan attachment sangat banyak — status progres ditampilkan secara real-time di bagian bawah form pencarian.
- Hanya mendukung akun Gmail pribadi/Google Workspace yang mengizinkan aplikasi OAuth pihak ketiga sesuai kebijakan admin domain (untuk akun Workspace, mungkin perlu persetujuan admin IT).

---

## 🛠️ Troubleshooting

| Masalah | Kemungkinan Penyebab & Solusi |
|---|---|
| Tombol "Hubungkan Akun Gmail" tidak merespons / error redirect_uri_mismatch | Pastikan alamat (origin) tempat file dibuka sudah ditambahkan di **Authorized JavaScript origins** pada OAuth Client ID Anda. |
| Halaman OAuth Google menampilkan "This app isn't verified" | Wajar untuk aplikasi yang belum di-*publish* — klik **Advanced → Go to (nama app) (unsafe)** karena Anda sendiri pembuat/pemilik aplikasinya. Pastikan email Anda sudah ditambahkan sebagai **Test user**. |
| Tidak bisa login sama sekali saat file dibuka dengan `file://` | Google OAuth tidak mendukung origin `file://`. Jalankan lewat Live Server atau `python -m http.server`. |
| Hasil pencarian kosong padahal yakin ada attachment yang sesuai | Periksa kembali prefix yang dimasukkan (meski tidak case-sensitive, pastikan ejaannya benar), atau coba longgarkan/kosongkan filter tambahan Gmail. |
| Muncul badge duplikat pada attachment yang menurut Anda berbeda | Deduplikasi membandingkan nama file secara keseluruhan (tanpa memandang huruf besar/kecil) — jika dua file punya nama persis sama meski dari email berbeda, keduanya akan dianggap duplikat. Matikan opsi deduplikasi jika tidak diinginkan. |

---

## 📄 Lisensi

Gunakan dan modifikasi sesuai kebutuhan Anda.
