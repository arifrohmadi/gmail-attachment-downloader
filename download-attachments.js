/**
 * Gmail Attachment Downloader
 * Downloads all attachments from emails whose subject starts with a specific keyword.
 *
 * Requirements:
 *   - Node.js >= 14
 *   - npm install googleapis dotenv
 *
 * Setup:
 *   1. Buat project di https://console.cloud.google.com
 *   2. Enable Gmail API
 *   3. Buat OAuth2 credentials (Desktop App)
 *   4. Download credentials.json ke folder ini
 *   5. Buat file .env (lihat .env.example)
 *   6. Jalankan: node download-attachments.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");
require("dotenv").config();

// ─── KONFIGURASI ──────────────────────────────────────────────────────────────
const CONFIG = {
  // Kata awalan subjek email yang ingin didownload
  // Ubah nilai ini sesuai kebutuhan, atau set via .env: SUBJECT_PREFIX=DAA_T1
  subjectPrefix: process.env.SUBJECT_PREFIX || "PWA_T1",

  // Folder tempat menyimpan attachment (akan dibuat otomatis jika belum ada)
  // Default: ./downloads/<subjectPrefix>/
  outputDir:
    process.env.OUTPUT_DIR ||
    path.join(__dirname, "downloads", process.env.SUBJECT_PREFIX || "PWA_T1"),

  // Maksimal email yang dicari (Gmail API max = 500)
  maxResults: parseInt(process.env.MAX_RESULTS || "500"),

  // File token autentikasi (disimpan otomatis setelah login pertama)
  tokenFile: path.join(__dirname, "token.json"),

  // File credentials dari Google Cloud Console
  credentialsFile: path.join(__dirname, "credentials.json"),

  // Hanya download email yang BELUM dibaca? (true/false)
  unreadOnly: process.env.UNREAD_ONLY === "true" || false,
};

// Scope yang dibutuhkan (readonly sudah cukup)
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

// ─── AUTENTIKASI ──────────────────────────────────────────────────────────────

async function authenticate() {
  if (!fs.existsSync(CONFIG.credentialsFile)) {
    console.error(
      "\n❌ File credentials.json tidak ditemukan!\n" +
        "   Ikuti langkah setup di README.md atau komentar di atas script ini.\n"
    );
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CONFIG.credentialsFile));
  const { client_secret, client_id, redirect_uris } =
    credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Cek apakah sudah ada token tersimpan
  if (fs.existsSync(CONFIG.tokenFile)) {
    const token = JSON.parse(fs.readFileSync(CONFIG.tokenFile));
    oAuth2Client.setCredentials(token);
    console.log("✅ Menggunakan token tersimpan.");
    return oAuth2Client;
  }

  // Minta otorisasi baru
  return await getNewToken(oAuth2Client);
}

async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("\n🔐 Buka URL berikut di browser untuk otorisasi:\n");
  console.log("   " + authUrl + "\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("Masukkan kode otorisasi dari browser: ", async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code.trim());
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(CONFIG.tokenFile, JSON.stringify(tokens, null, 2));
        console.log("\n✅ Token disimpan ke", CONFIG.tokenFile);
        resolve(oAuth2Client);
      } catch (err) {
        reject(new Error("❌ Gagal mendapatkan token: " + err.message));
      }
    });
  });
}

// ─── FUNGSI UTAMA ─────────────────────────────────────────────────────────────

async function downloadAttachments() {
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║     Gmail Attachment Downloader           ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  console.log(`🔍 Mencari email dengan subjek diawali: "${CONFIG.subjectPrefix}"`);
  console.log(`📁 Folder output: ${CONFIG.outputDir}\n`);

  // Buat folder output jika belum ada
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  const auth = await authenticate();
  const gmail = google.gmail({ version: "v1", auth });

  async function fetchMessagesByQuery(searchQuery) {
    let messages = [];
    let pageToken = undefined;

    do {
      const res = await gmail.users.messages.list({
        userId: "me",
        q: searchQuery,
        maxResults: Math.min(CONFIG.maxResults - messages.length, 100),
        pageToken,
      });

      const batch = res.data.messages || [];
      messages = messages.concat(batch);
      pageToken = res.data.nextPageToken;
    } while (pageToken && messages.length < CONFIG.maxResults);

    return messages;
  }

  // ── Cari email yang cocok ──
  let query = `subject:"${CONFIG.subjectPrefix}" has:attachment`;
  if (CONFIG.unreadOnly) query += " is:unread";

  console.log(`🔎 Query Gmail: ${query}\n`);

  let allMessages = await fetchMessagesByQuery(query);

  if (allMessages.length === 0) {
    // Fallback: beberapa pola subjek (mis. menggunakan underscore/simbol)
    // kadang tidak terjaring konsisten oleh operator subject Gmail.
    let fallbackQuery = "has:attachment";
    if (CONFIG.unreadOnly) fallbackQuery += " is:unread";

    console.log("⚠️  Hasil 0 dengan query subject. Mencoba fallback query...");
    console.log(`🔎 Query Gmail (fallback): ${fallbackQuery}\n`);

    allMessages = await fetchMessagesByQuery(fallbackQuery);
  }

  if (allMessages.length === 0) {
    console.log("📭 Tidak ada email yang cocok ditemukan.");
    return;
  }

  console.log(`📬 Ditemukan ${allMessages.length} email. Memproses...\n`);

  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalEmails = 0;
  let totalDuplicateOlderSkipped = 0;
  let totalOverwritten = 0;
  let totalSameAsLocalSkipped = 0;

  // Simpan kandidat attachment terbaru untuk setiap nama file.
  // Key = nama file bersih, value = metadata attachment dari email paling baru.
  const latestAttachmentByFilename = new Map();

  for (let i = 0; i < allMessages.length; i++) {
    const msgMeta = allMessages[i];
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: msgMeta.id,
    });

    // Ambil subject email
    const headers = msg.data.payload.headers;
    const subjectHeader = headers.find(
      (h) => h.name.toLowerCase() === "subject"
    );
    const subject = subjectHeader ? subjectHeader.value : "(no subject)";

    // Validasi subject diawali kata yang ditentukan (case-insensitive)
    if (!subject.toLowerCase().startsWith(CONFIG.subjectPrefix.toLowerCase())) {
      continue;
    }

    totalEmails++;
    console.log(
      `[${i + 1}/${allMessages.length}] 📧 ${subject.substring(0, 60)}...`
    );

    const emailTimestamp = Number(msg.data.internalDate || 0);
    const emailDate = emailTimestamp > 0 ? new Date(emailTimestamp) : null;
    const emailDateLabel = emailDate
      ? emailDate.toISOString().replace("T", " ").substring(0, 19)
      : "(tanggal tidak tersedia)";

    // Cari semua attachment dalam email
    const parts = getAllParts(msg.data.payload);
    const attachmentParts = parts.filter(
      (p) =>
        p.filename &&
        p.filename.length > 0 &&
        p.body &&
        (p.body.attachmentId || p.body.data)
    );

    if (attachmentParts.length === 0) {
      console.log(`   ⏭️  Tidak ada attachment.\n`);
      continue;
    }

    for (const part of attachmentParts) {
      const filename = sanitizeFilename(part.filename);
      const existing = latestAttachmentByFilename.get(filename);

      if (!existing || emailTimestamp > existing.emailTimestamp) {
        latestAttachmentByFilename.set(filename, {
          filename,
          part,
          messageId: msgMeta.id,
          emailTimestamp,
        });

        if (existing) {
          console.log(`   ♻️  Pilih versi terbaru: ${filename} (${emailDateLabel})`);
        } else {
          console.log(`   🆕 Kandidat: ${filename} (${emailDateLabel})`);
        }
      } else {
        console.log(`   ⏭️  Lewati versi lama: ${filename}`);
        totalSkipped++;
        totalDuplicateOlderSkipped++;
      }
    }
    console.log();
  }

  console.log("⬇️  Mendownload attachment terbaru per nama file...\n");

  for (const candidate of latestAttachmentByFilename.values()) {
    const outputPath = path.join(CONFIG.outputDir, candidate.filename);

    try {
      let data;

      if (candidate.part.body.attachmentId) {
        // Download dari attachment ID
        const attachment = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId: candidate.messageId,
          id: candidate.part.body.attachmentId,
        });
        data = attachment.data.data;
      } else {
        data = candidate.part.body.data;
      }

      // Decode base64url → buffer
      const buffer = Buffer.from(data, "base64");
      const exists = fs.existsSync(outputPath);

      if (exists) {
        const existingBuffer = fs.readFileSync(outputPath);
        if (isSameFileContent(existingBuffer, buffer)) {
          console.log(`   ⏭️  Sama dengan file lokal: ${candidate.filename}`);
          totalSkipped++;
          totalSameAsLocalSkipped++;
          continue;
        }
      }

      fs.writeFileSync(outputPath, buffer);

      const sizeKB = (buffer.length / 1024).toFixed(1);
      if (exists) {
        console.log(`   ♻️  Ditimpa versi terbaru: ${candidate.filename} (${sizeKB} KB)`);
        totalOverwritten++;
      } else {
        console.log(`   ✅ ${candidate.filename} (${sizeKB} KB)`);
      }
      totalDownloaded++;
    } catch (err) {
      console.log(`   ❌ Gagal download ${candidate.filename}: ${err.message}`);
    }
  }

  // ── Ringkasan ──
  console.log("═══════════════════════════════════════════");
  console.log(`✅ Selesai!`);
  console.log(`   📧 Email diproses : ${totalEmails}`);
  console.log(`   ⬇️  File didownload: ${totalDownloaded}`);
  console.log(`   ♻️  File ditimpa   : ${totalOverwritten}`);
  console.log(`   🟰 Sama lokal      : ${totalSameAsLocalSkipped}`);
  console.log(`   🧹 Duplikat lama   : ${totalDuplicateOlderSkipped}`);
  console.log(`   ⏭️  File dilewati  : ${totalSkipped}`);
  console.log(`   📁 Lokasi file    : ${CONFIG.outputDir}`);
  console.log("═══════════════════════════════════════════\n");
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/** Rekursif ambil semua part (termasuk nested multipart) */
function getAllParts(payload) {
  const parts = [];
  if (payload.parts) {
    for (const part of payload.parts) {
      parts.push(...getAllParts(part));
    }
  } else {
    parts.push(payload);
  }
  if (payload.filename && payload.body) {
    // Juga tambahkan payload root jika punya filename
    if (!parts.includes(payload)) parts.push(payload);
  }
  return parts;
}

/** Bersihkan nama file dari karakter tidak valid */
function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, "_").trim();
}

/** Cek kesamaan konten dua file berbasis byte */
function isSameFileContent(a, b) {
  return a.length === b.length && Buffer.compare(a, b) === 0;
}

// ─── RUN ──────────────────────────────────────────────────────────────────────
downloadAttachments().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
