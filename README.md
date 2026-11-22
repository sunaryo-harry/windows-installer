# 🛠️ Days WinInstaller — Windows Installer Creator

[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?logo=windows&logoColor=white)](https://github.com/sunaryo-harry/windows-installer)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/sunaryo-harry/windows-installer?style=social)](https://github.com/sunaryo-harry/windows-installer)

Aplikasi perancang **Windows Installer** modern untuk membuat skrip instalasi siap pakai:
- 📦 **Inno Setup** (`.iss`)
- ⚙️ **NSIS — Nullsoft Scriptable Install System** (`.nsi`)
- 🛡️ **WiX Toolset MSI** (`.wxs`)
- 🧪 **Interactive Wizard Simulator** & Windows Build Bundle exporter.

---

## ⚡ Perintah Cepat Pasang di Windows (One-Liner)

Buka **PowerShell** (tekan `Win + X`, pilih **Terminal** atau **PowerShell**), lalu salin dan jalankan perintah berikut:

```powershell
irm https://raw.githubusercontent.com/sunaryo-harry/windows-installer/main/install.ps1 | iex
```

> **Catatan:** Perintah di atas akan secara otomatis mengunduh, memasang prasyarat (Node.js jika belum ada), membangun aplikasi, serta membuat pintasan resmi di **Desktop** dan **Start Menu** Windows.

---

## 💻 Pilihan Instalasi Alternatif

### Opsi 1: Menggunakan File Batch (`install.bat`)
1. Unduh berkas [`install.bat`](https://raw.githubusercontent.com/sunaryo-harry/windows-installer/main/install.bat).
2. Klik ganda (double-click) pada berkas `install.bat`.
3. Skrip akan memandu proses instalasi sampai selesai.

---

### Opsi 2: Manual Clone via Git & Terminal

Jika Anda ingin menjalankan atau memodifikasi kode secara manual:

```powershell
# 1. Clone repository
git clone https://github.com/sunaryo-harry/windows-installer.git
cd windows-installer

# 2. Pasang dependensi
npm install

# 3. Jalankan server pengembang
npm run dev
```

Buka peramban di `http://localhost:3000`.

Untuk membangun bundle produksi:
```powershell
npm run build
npm run preview
```

---

## 🚀 Fitur Utama

- **Multi-Engine Generator**: Otomatis menghasilkan kode skrip Inno Setup 6, NSIS 3, dan WiX 3/4 MSI yang tervalidasi.
- **Wizard Simulator Interaktif**: Uji alur antarmuka installer Windows langsung di peramban sebelum dikompilasi ke `.exe`.
- **Preflight Checklist**: Audit konfigurasi (GUID unik, jalur direktori, izin administrator, dll.) untuk meminimalisir error kompilasi.
- **Export Ready-to-Build ZIP**: Ekspor seluruh berkas konfigurasi, banner, ikon, dan batch script kompilator dalam 1 arsip `.zip`.
- **Dukungan Mode Offline / PWA**: Dapat dipasang sebagai aplikasi desktop mandiri tanpa jendela browser.

---

## 🗑️ Cara Uninstall

Jalankan perintah ini di PowerShell untuk mencopot pemasangan dan menghapus pintasan:

```powershell
irm https://raw.githubusercontent.com/sunaryo-harry/windows-installer/main/uninstall.ps1 | iex
```

---

## 👨‍💻 Kontribusi & Lisensi

Dibuat oleh [sunaryo-harry](https://github.com/sunaryo-harry). Dilisensikan di bawah lisensi MIT.
