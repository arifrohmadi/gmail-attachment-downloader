# 📥 Gmail Attachment Downloader

Download semua attachment dari email Gmail yang subjeknya diawali kata tertentu.  
Contoh: `PWA_T1`, `DAA_T1`, `INVOICE_2024`, dll.

---

## 🚀 Cara Setup (Sekali Saja)

### 1. Install Node.js
Unduh dari https://nodejs.org (pilih versi LTS)

### 2. Install dependencies
```bash
npm install
```

### 3. Aktifkan Gmail API di Google Cloud

1. Buka https://console.cloud.google.com
2. Buat project baru (klik dropdown di atas → **New Project**)
3. Di menu kiri: **APIs & Services → Library**
4. Cari **Gmail API** → klik **Enable**
5. Di menu kiri: **APIs & Services → Credentials**
6. Klik **+ Create Credentials → OAuth client ID**
7. Pilih **Application type: Desktop app** → beri nama → **Create**
8. Klik tombol **Download JSON** → simpan sebagai **`credentials.json`** di folder ini
9. Di menu kiri: **OAuth consent screen** → set ke **External** → isi nama app → tambahkan email Anda sebagai **Test user**

### 4. Buat file konfigurasi `.env`
```bash
# Salin file contoh
cp .env.example .env
```
Lalu edit `.env` dan ubah `SUBJECT_PREFIX` sesuai kebutuhan.

---

## ▶️ Cara Menjalankan

```bash
node download-attachments.js
```

atau

```bash
npm start
```

**Pertama kali:** browser akan terbuka untuk minta izin → login Gmail → copy kode → paste ke terminal.  
Selanjutnya: langsung jalan tanpa perlu login lagi.

---

## 🔄 Ganti Kata Awalan Subjek

Cukup edit file `.env`:

```env
# Dari ini:
SUBJECT_PREFIX=PWA_T1

# Menjadi ini:
SUBJECT_PREFIX=DAA_T1
```

Atau langsung via command line (tanpa mengubah .env):

```bash
# Windows (CMD)
set SUBJECT_PREFIX=DAA_T1 && node download-attachments.js

# Windows (PowerShell)
$env:SUBJECT_PREFIX="DAA_T1"; node download-attachments.js

# Mac / Linux
SUBJECT_PREFIX=DAA_T1 node download-attachments.js
```

---

## 📁 Hasil Download

File tersimpan di folder:
```
downloads/
  PWA_T1/
    20240315_laporan.pdf
    20240315_data.xlsx
    20240322_presentasi.pptx
  DAA_T1/
    20240401_tugas.docx
    ...
```

Jika ada attachment dengan **nama file yang sama**, script akan memilih versi dari email dengan datetime terbaru (`internalDate` Gmail). Saat file tujuan sudah ada di lokal, script akan membandingkan isi file:
- jika isinya sama, file dilewati (tidak didownload/ditulis ulang)
- jika isinya berbeda, file lokal ditimpa versi terbaru

---

## ⚙️ Opsi Konfigurasi (file `.env`)

| Variabel | Default | Keterangan |
|---|---|---|
| `SUBJECT_PREFIX` | `PWA_T1` | Kata awalan subjek email |
| `OUTPUT_DIR` | `./downloads/<PREFIX>` | Folder output (opsional) |
| `MAX_RESULTS` | `500` | Maks email yang diproses |
| `UNREAD_ONLY` | `false` | Hanya email belum dibaca |

---

## ❓ Troubleshooting

**`credentials.json tidak ditemukan`**  
→ Pastikan file credentials.json ada di folder yang sama dengan script.

**`Token expired`**  
→ Hapus file `token.json` lalu jalankan ulang.

**`Gmail API has not been used`**  
→ Pastikan Gmail API sudah di-enable di Google Cloud Console.

**Email tidak ditemukan padahal ada**  
→ Coba turunkan `MAX_RESULTS` atau pastikan ejaan `SUBJECT_PREFIX` tepat (case-insensitive).
