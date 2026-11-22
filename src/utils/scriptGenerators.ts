import JSZip from 'jszip';
import { AVAILABLE_LANGUAGES } from '../data/presets';
import {
  HealthCategoryBreakdown,
  HealthCheckItem,
  InstallerProject,
  PreflightCheckItem,
  PreflightReport,
  ProjectHealthReport,
  UploadedAssets,
  ValidationIssue,
} from '../types/installer';

const GUID_REGEX = /^\{[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}\}$/;
const SEMVER_REGEX = /^\d+\.\d+(\.\d+)?(\.\d+)?$/;
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/;
const INVALID_DIR_CHARS = /[<>"|?*]/;

function escapeInnoString(str: string): string {
  return str.replace(/"/g, '""');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeId(str: string, fallback = 'Item'): string {
  const cleaned = str.replace(/[^A-Za-z0-9_]/g, '_');
  if (!cleaned) return fallback;
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

export function getMainExeFile(project: InstallerProject) {
  return project.files.find((f) => f.isMainExe) ?? project.files[0] ?? null;
}

export function getExeFileName(sourcePath: string): string {
  const normalized = sourcePath.replace(/\//g, '\\');
  const parts = normalized.split('\\');
  return parts[parts.length - 1] || 'App.exe';
}

export function getResolvedInstallDir(project: InstallerProject, format: 'display' | 'inno' | 'nsis' = 'display'): string {
  const folder = project.defaultDirName.trim() || project.appName.trim() || 'MyApp';
  if (project.defaultDirPreset === 'localappdata') {
    if (format === 'inno') return `{localappdata}\\${folder}`;
    if (format === 'nsis') return `$LOCALAPPDATA\\${folder}`;
    return `C:\\Users\\<Pengguna>\\AppData\\Local\\${folder}`;
  }
  if (project.defaultDirPreset === 'custom') {
    return folder;
  }
  if (format === 'inno') return `{autopf}\\${folder}`;
  if (format === 'nsis') {
    return project.architecture === 'x86' ? `$PROGRAMFILES\\${folder}` : `$PROGRAMFILES64\\${folder}`;
  }
  return project.architecture === 'x86'
    ? `C:\\Program Files (x86)\\${folder}`
    : `C:\\Program Files\\${folder}`;
}

export function getTotalSizeBytes(project: InstallerProject): number {
  return project.files.reduce((sum, f) => sum + (Number.isFinite(f.sizeBytes) ? f.sizeBytes : 0), 0);
}

export function getEstimatedCompressedBytes(project: InstallerProject): number {
  const raw = getTotalSizeBytes(project);
  const ratio =
    project.compression === 'lzma2/ultra64'
      ? 0.42
      : project.compression === 'lzma2'
        ? 0.5
        : project.compression === 'zip'
          ? 0.65
          : 1.0;
  return Math.round(raw * ratio) + 650_000;
}

export function evaluateProjectHealth(project: InstallerProject): ProjectHealthReport {
  const checks: HealthCheckItem[] = [];

  // 1. Identitas & GUID (30 poin)
  const hasAppAndPublisher = Boolean(project.appName.trim() && project.publisher.trim());
  checks.push({
    id: 'health-identity-basic',
    categoryId: 'identity',
    severity: hasAppAndPublisher ? 'pass' : 'critical',
    weight: 10,
    passed: hasAppAndPublisher,
    section: 'identity',
    title: hasAppAndPublisher
      ? 'Nama aplikasi & penerbit lengkap'
      : 'Nama aplikasi atau penerbit belum diisi',
    detail: hasAppAndPublisher
      ? `${project.appName} oleh ${project.publisher} siap terdaftar di Windows Installed Apps.`
      : 'Isi nama aplikasi dan penerbit agar entri di Control Panel / Settings Windows tidak kosong.',
  });

  const validVersion = SEMVER_REGEX.test(project.appVersion.trim());
  checks.push({
    id: 'health-version',
    categoryId: 'identity',
    severity: validVersion ? 'pass' : 'critical',
    weight: 5,
    passed: validVersion,
    section: 'identity',
    title: validVersion ? 'Format versi Windows valid' : 'Format versi aplikasi berisiko gagal kompilasi',
    detail: validVersion
      ? `Versi ${project.appVersion} kompatibel dengan metadata versi PE dan MSI.`
      : 'Gunakan format angka seperti 1.0.0 atau 2.4.0.1 tanpa huruf.',
  });

  const hasValidAppId = GUID_REGEX.test(project.appId.trim());
  checks.push({
    id: 'health-appid-guid',
    categoryId: 'identity',
    severity: hasValidAppId ? 'pass' : 'critical',
    weight: 10,
    passed: hasValidAppId,
    section: 'identity',
    title: hasValidAppId
      ? 'AppId GUID valid & unik'
      : !project.appId.trim()
        ? 'AppId GUID hilang'
        : 'Format AppId GUID tidak valid',
    detail: hasValidAppId
      ? 'Windows dapat mendeteksi pembaruan versi dan proses uninstall secara akurat.'
      : 'GUID yang hilang atau rusak menyebabkan duplikasi entri aplikasi saat upgrade di Windows. Klik "Buat GUID" di bagian Identitas.',
  });

  const hasValidUpgradeCode = GUID_REGEX.test(project.upgradeCode.trim());
  const upgradeCodeRequired = project.engine === 'wix';
  checks.push({
    id: 'health-upgrade-guid',
    categoryId: 'identity',
    severity: hasValidUpgradeCode ? 'pass' : upgradeCodeRequired ? 'critical' : 'warning',
    weight: 5,
    passed: hasValidUpgradeCode,
    section: 'identity',
    title: hasValidUpgradeCode
      ? 'MSI UpgradeCode GUID tersedia'
      : 'MSI UpgradeCode GUID belum ditentukan',
    detail: hasValidUpgradeCode
      ? 'Siap untuk MajorUpgrade MSI apabila dikompilasi dengan WiX Toolset.'
      : upgradeCodeRequired
        ? 'Wajib diisi untuk engine WiX Toolset (.msi) agar upgrade tidak gagal atau memasang dua salinan.'
        : 'Disarankan tetap mengisi UpgradeCode GUID bila suatu saat beralih ke format MSI.',
  });

  // 2. Direktori & Berkas Paket (30 poin)
  const dirTrimmed = project.defaultDirName.trim();
  const hasDirDefined =
    dirTrimmed.length > 0 &&
    !INVALID_DIR_CHARS.test(dirTrimmed) &&
    (project.defaultDirPreset !== 'custom' || /^[A-Za-z]:\\|^\{.+\}/.test(dirTrimmed));

  checks.push({
    id: 'health-install-dir',
    categoryId: 'files',
    severity: hasDirDefined ? 'pass' : 'critical',
    weight: 10,
    passed: hasDirDefined,
    section: 'files',
    title: hasDirDefined
      ? 'Direktori instalasi ditentukan dengan benar'
      : !dirTrimmed
        ? 'Direktori instalasi belum ditentukan'
        : 'Jalur direktori instalasi tidak valid',
    detail: hasDirDefined
      ? `Target default: ${getResolvedInstallDir(project, 'display')}.`
      : 'Direktori instalasi yang kosong atau tidak valid berisiko menimpa folder root sistem atau menggagalkan kompilasi.',
  });

  const hasFiles = project.files.length > 0;
  checks.push({
    id: 'health-files-present',
    categoryId: 'files',
    severity: hasFiles ? 'pass' : 'critical',
    weight: 10,
    passed: hasFiles,
    section: 'files',
    title: hasFiles ? `${project.files.length} berkas paket terdaftar` : 'Daftar berkas paket masih kosong',
    detail: hasFiles
      ? 'Seluruh berkas sumber siap dikemas ke dalam arsip installer.'
      : 'Tambahkan setidaknya satu berkas biner (.exe) atau direktori rilis aplikasi.',
  });

  const hasMainExe = project.files.some((f) => f.isMainExe);
  checks.push({
    id: 'health-main-exe',
    categoryId: 'files',
    severity: hasMainExe ? 'pass' : 'warning',
    weight: 5,
    passed: hasMainExe,
    section: 'files',
    title: hasMainExe
      ? 'Berkas eksekusi utama (.exe) telah ditandai'
      : 'Berkas eksekusi utama belum ditandai',
    detail: hasMainExe
      ? 'Pintasan Start Menu, Desktop, dan opsi jalankan setelah instalasi mengarah ke biner utama.'
      : 'Tandai satu berkas .exe sebagai utama agar pintasan Windows tidak rusak.',
  });

  const validOutputName =
    Boolean(project.outputBaseFilename.trim()) &&
    !INVALID_FILENAME_CHARS.test(project.outputBaseFilename);
  checks.push({
    id: 'health-output-filename',
    categoryId: 'files',
    severity: validOutputName ? 'pass' : 'critical',
    weight: 5,
    passed: validOutputName,
    section: 'identity',
    title: validOutputName
      ? 'Nama berkas output valid'
      : 'Nama berkas output kosong atau mengandung karakter terlarang',
    detail: validOutputName
      ? `Output: ${project.outputBaseFilename}.${project.engine === 'wix' ? 'msi' : 'exe'}.`
      : 'Hindari karakter \\ / : * ? " < > | pada nama berkas installer.',
  });

  // 3. Keamanan & Hak Akses Windows (25 poin)
  const privDirConflict =
    project.privilegeLevel === 'lowest' && project.defaultDirPreset === 'autopf';
  checks.push({
    id: 'health-uac-dir',
    categoryId: 'security',
    severity: privDirConflict ? 'warning' : 'pass',
    weight: 8,
    passed: !privDirConflict,
    section: 'registry',
    title: privDirConflict
      ? 'Konflik hak akses Per-Pengguna dengan Program Files'
      : 'Hak akses UAC selaras dengan lokasi pemasangan',
    detail: privDirConflict
      ? 'Pemasangan tanpa Administrator akan ditolak oleh Windows saat menulis ke Program Files. Gunakan LocalAppData atau aktifkan hak Administrator.'
      : 'Izin tulis Windows pada direktori tujuan sesuai dengan tingkat hak akses yang dipilih.',
  });

  const privHklmConflict =
    project.privilegeLevel === 'lowest' &&
    project.registryEntries.some((r) => r.root === 'HKLM');
  checks.push({
    id: 'health-uac-registry',
    categoryId: 'security',
    severity: privHklmConflict ? 'warning' : 'pass',
    weight: 7,
    passed: !privHklmConflict,
    section: 'registry',
    title: privHklmConflict
      ? 'Kunci registri HKLM berisiko gagal tanpa hak Administrator'
      : 'Konfigurasi hive registri aman',
    detail: privHklmConflict
      ? 'Pengguna non-admin tidak dapat menulis ke HKLM. Ubah root registri ke HKCU atau naikkan hak akses ke Administrator.'
      : 'Semua entri registri kompatibel dengan tingkat hak akses installer.',
  });

  const closeAppsOk = project.closeRunningApp;
  checks.push({
    id: 'health-restart-manager',
    categoryId: 'security',
    severity: closeAppsOk ? 'pass' : 'warning',
    weight: 5,
    passed: closeAppsOk,
    section: 'registry',
    title: closeAppsOk
      ? 'Windows Restart Manager aktif saat upgrade'
      : 'Penutupan aplikasi otomatis tidak aktif',
    detail: closeAppsOk
      ? 'Installer akan menutup proses aplikasi yang berjalan dengan aman sebelum menimpa berkas.'
      : 'Jika aplikasi sedang terbuka saat pembaruan, penggantian berkas .exe/.dll berisiko gagal atau memaksa reboot.',
  });

  const signingOk = project.enableCodeSigning && Boolean(project.signCertPath.trim());
  const signingBroken = project.enableCodeSigning && !project.signCertPath.trim();
  checks.push({
    id: 'health-code-signing',
    categoryId: 'security',
    severity: signingOk ? 'pass' : 'warning',
    weight: 5,
    passed: signingOk,
    section: 'registry',
    title: signingOk
      ? 'Authenticode Code Signing terkonfigurasi'
      : signingBroken
        ? 'Jalur sertifikat Code Signing (.pfx) belum diisi'
        : 'Code Signing belum diaktifkan (risiko peringatan SmartScreen)',
    detail: signingOk
      ? `Skrip build siap menandatangani output menggunakan ${project.signCertPath}.`
      : signingBroken
        ? 'Masukkan jalur berkas .pfx di bagian Registri & Sistem agar langkah signtool.exe berhasil.'
        : 'Installer tanpa tanda tangan digital cenderung memunculkan peringatan "Windows protected your PC" pada pengguna.',
  });

  // 4. Pengalaman Pengguna & Kepatuhan (15 poin)
  const hasLanguage = project.languages.length > 0;
  checks.push({
    id: 'health-language',
    categoryId: 'ux',
    severity: hasLanguage ? 'pass' : 'warning',
    weight: 5,
    passed: hasLanguage,
    section: 'wizard',
    title: hasLanguage ? 'Bahasa antarmuka wizard terkonfigurasi' : 'Belum ada bahasa installer dipilih',
    detail: hasLanguage
      ? `${project.languages.length} bahasa aktif pada dialog pemasangan.`
      : 'Pilih minimal satu bahasa agar antarmuka wizard tampil konsisten.',
  });

  const licenseOk = !project.showLicensePage || Boolean(project.licenseText.trim());
  checks.push({
    id: 'health-license',
    categoryId: 'ux',
    severity: licenseOk ? 'pass' : 'warning',
    weight: 5,
    passed: licenseOk,
    section: 'wizard',
    title: licenseOk
      ? 'Konfigurasi perjanjian lisensi valid'
      : 'Halaman lisensi aktif tetapi teks EULA masih kosong',
    detail: licenseOk
      ? project.showLicensePage
        ? 'Berkas LICENSE.txt terisi dan siap ditampilkan di halaman persetujuan.'
        : 'Halaman lisensi dinonaktifkan secara eksplisit.'
      : 'Isi teks lisensi atau pilih templat MIT/EULA agar halaman persetujuan tidak kosong.',
  });

  const hasSupportUrl = Boolean(project.publisherUrl.trim() || project.supportUrl.trim());
  checks.push({
    id: 'health-support-url',
    categoryId: 'ux',
    severity: hasSupportUrl ? 'pass' : 'warning',
    weight: 5,
    passed: hasSupportUrl,
    section: 'identity',
    title: hasSupportUrl
      ? 'Tautan penerbit / dukungan tercantum'
      : 'Tautan situs penerbit atau dukungan belum diisi',
    detail: hasSupportUrl
      ? 'Pengguna Windows dapat mengakses tautan bantuan langsung dari Settings > Installed Apps.'
      : 'Menambahkan URL penerbit meningkatkan kepercayaan pengguna dan memudahkan dukungan teknis.',
  });

  const categoryMeta: { id: HealthCategoryBreakdown['id']; label: string }[] = [
    { id: 'identity', label: 'Identitas & GUID' },
    { id: 'files', label: 'Direktori & Berkas' },
    { id: 'security', label: 'Keamanan & UAC' },
    { id: 'ux', label: 'Kepatuhan & UX' },
  ];

  const categories: HealthCategoryBreakdown[] = categoryMeta.map((cat) => {
    const catChecks = checks.filter((c) => c.categoryId === cat.id);
    const max = catChecks.reduce((s, c) => s + c.weight, 0);
    const earned = catChecks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
    const passedCount = catChecks.filter((c) => c.passed).length;
    return {
      id: cat.id,
      label: cat.label,
      earned,
      max,
      passedCount,
      totalCount: catChecks.length,
    };
  });

  const totalMax = checks.reduce((s, c) => s + c.weight, 0);
  const totalEarned = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const score = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  const criticalCount = checks.filter((c) => c.severity === 'critical').length;
  const warningCount = checks.filter((c) => c.severity === 'warning').length;
  const passedCount = checks.filter((c) => c.severity === 'pass').length;

  let status: ProjectHealthReport['status'] = 'optimal';
  let statusLabel = 'Siap Produksi';
  let summary =
    'Tidak ditemukan konfigurasi berisiko kritis. Paket installer siap dikompilasi dan didistribusikan.';

  if (criticalCount > 0 || score < 65) {
    status = 'risk';
    statusLabel = 'Konfigurasi Berisiko';
    summary = `Terdapat ${criticalCount} masalah kritis yang dapat menggagalkan kompilasi atau merusak proses upgrade/uninstall di Windows.`;
  } else if (warningCount > 0 || score < 90) {
    status = 'attention';
    statusLabel = 'Perlu Peninjauan';
    summary = `Tidak ada galat kritis, namun ada ${warningCount} peringatan risiko yang disarankan untuk diperbaiki sebelum rilis publik.`;
  }

  return {
    score,
    status,
    statusLabel,
    summary,
    criticalCount,
    warningCount,
    passedCount,
    categories,
    checks,
  };
}

export function runPreflightChecklist(project: InstallerProject): PreflightReport {
  const items: PreflightCheckItem[] = [];

  // 1. Verifikasi keberadaan file utama (.exe)
  const mainFile = project.files.find((f) => f.isMainExe);
  const hasAnyFiles = project.files.length > 0;
  const mainPath = mainFile?.sourcePath.trim() ?? '';
  const isExePath = /\.exe$/i.test(mainPath);

  if (!hasAnyFiles) {
    items.push({
      id: 'main-exe',
      label: 'Keberadaan File Utama',
      status: 'fail',
      statusText: 'Gagal',
      summary: 'Belum ada berkas aplikasi yang dimasukkan ke paket installer.',
      detectedValue: '0 berkas terdaftar',
      section: 'files',
    });
  } else if (!mainFile || !mainPath) {
    items.push({
      id: 'main-exe',
      label: 'Keberadaan File Utama',
      status: 'fail',
      statusText: 'Gagal',
      summary: 'Belum ada berkas yang ditandai sebagai file eksekusi utama (bintang).',
      detectedValue: `${project.files.length} berkas (belum ada utama)`,
      section: 'files',
    });
  } else if (!isExePath) {
    items.push({
      id: 'main-exe',
      label: 'Keberadaan File Utama',
      status: 'warning',
      statusText: 'Peringatan',
      summary: 'Berkas utama yang ditandai tidak berekstensi .exe. Pastikan pintasan Windows dapat menjalankannya.',
      detectedValue: mainPath,
      section: 'files',
    });
  } else {
    items.push({
      id: 'main-exe',
      label: 'Keberadaan File Utama',
      status: 'pass',
      statusText: 'Lolos',
      summary: 'File eksekusi utama terverifikasi dan siap ditautkan ke Start Menu, Desktop, serta uninstaller.',
      detectedValue: mainPath,
      section: 'files',
    });
  }

  // 2. Verifikasi konfigurasi registri Windows & hak akses
  const invalidRegEntries = project.registryEntries.filter(
    (r) => !r.subKey.trim() || !r.valueName.trim()
  );
  const invalidDwordEntries = project.registryEntries.filter(
    (r) => r.valueType === 'REG_DWORD' && !/^\d+$/.test(r.valueData.trim())
  );
  const hklmWithoutAdmin =
    project.privilegeLevel === 'lowest' &&
    project.registryEntries.some((r) => r.root === 'HKLM');

  if (invalidRegEntries.length > 0 || invalidDwordEntries.length > 0) {
    items.push({
      id: 'registry-config',
      label: 'Konfigurasi Registri',
      status: 'fail',
      statusText: 'Gagal',
      summary:
        invalidDwordEntries.length > 0
          ? `${invalidDwordEntries.length} entri REG_DWORD memiliki nilai bukan angka bulat.`
          : `${invalidRegEntries.length} entri registri memiliki subkey atau nama nilai kosong.`,
      detectedValue: `${project.registryEntries.length} entri (${invalidRegEntries.length + invalidDwordEntries.length} tidak valid)`,
      section: 'registry',
    });
  } else if (hklmWithoutAdmin) {
    items.push({
      id: 'registry-config',
      label: 'Konfigurasi Registri',
      status: 'warning',
      statusText: 'Peringatan',
      summary: 'Terdapat kunci HKLM saat hak akses disetel Per-Pengguna (tanpa UAC). Ubah ke HKCU atau aktifkan Administrator.',
      detectedValue: `HKLM + Per-Pengguna (${project.registryEntries.length} entri)`,
      section: 'registry',
    });
  } else {
    items.push({
      id: 'registry-config',
      label: 'Konfigurasi Registri',
      status: 'pass',
      statusText: 'Lolos',
      summary:
        project.registryEntries.length > 0
          ? 'Seluruh hive, tipe nilai, dan izin tulis registri kompatibel dengan konfigurasi hak akses.'
          : 'Menggunakan entri registri standar Programs & Features tanpa konflik hak akses.',
      detectedValue:
        project.registryEntries.length > 0
          ? `${project.registryEntries.length} entri kustom · ${project.privilegeLevel === 'admin' ? 'Administrator' : 'Per-Pengguna'}`
          : `Standar ARP · ${project.privilegeLevel === 'admin' ? 'Administrator' : 'Per-Pengguna'}`,
      section: 'registry',
    });
  }

  // 3. Verifikasi validitas versi aplikasi (Windows PE / MSI)
  const rawVersion = project.appVersion.trim();
  const versionParts = rawVersion.split('.').map((p) => Number(p));
  const matchesFormat = SEMVER_REGEX.test(rawVersion);
  const withinPeRange =
    matchesFormat && versionParts.every((n) => Number.isInteger(n) && n >= 0 && n <= 65535);
  const msiOutOfRange =
    project.engine === 'wix' &&
    withinPeRange &&
    (versionParts[0] > 255 || versionParts[1] > 255);

  if (!rawVersion || !matchesFormat || !withinPeRange) {
    items.push({
      id: 'app-version',
      label: 'Validitas Versi Aplikasi',
      status: 'fail',
      statusText: 'Gagal',
      summary: 'Versi harus berupa 2–4 segmen angka (0–65535), misalnya 1.0.0 atau 2.4.0.1.',
      detectedValue: rawVersion || '(kosong)',
      section: 'identity',
    });
  } else if (msiOutOfRange) {
    items.push({
      id: 'app-version',
      label: 'Validitas Versi Aplikasi',
      status: 'fail',
      statusText: 'Gagal',
      summary: 'Windows Installer MSI (WiX) membatasi angka Major dan Minor maksimal 255.',
      detectedValue: `${rawVersion} (melebihi batas MSI 255.255.65535)`,
      section: 'identity',
    });
  } else {
    items.push({
      id: 'app-version',
      label: 'Validitas Versi Aplikasi',
      status: 'pass',
      statusText: 'Lolos',
      summary: 'Format versi valid untuk metadata Windows Installer, Inno Setup, NSIS, dan WiX MSI.',
      detectedValue: `v${rawVersion}`,
      section: 'identity',
    });
  }

  // 4. Verifikasi GUID & Direktori Instalasi Output
  const appIdValid = GUID_REGEX.test(project.appId.trim());
  const upgradeCodeValid = project.engine !== 'wix' || GUID_REGEX.test(project.upgradeCode.trim());
  const dirValid =
    project.defaultDirName.trim().length > 0 &&
    !INVALID_DIR_CHARS.test(project.defaultDirName.trim());
  const outputValid =
    project.outputBaseFilename.trim().length > 0 &&
    !INVALID_FILENAME_CHARS.test(project.outputBaseFilename);

  if (!appIdValid || !upgradeCodeValid || !dirValid || !outputValid) {
    const missingParts = [
      !appIdValid && 'AppId GUID',
      !upgradeCodeValid && 'MSI UpgradeCode GUID',
      !dirValid && 'Direktori Instalasi',
      !outputValid && 'Nama Output',
    ].filter(Boolean);

    items.push({
      id: 'guid-and-dir',
      label: 'GUID & Target Instalasi',
      status: 'fail',
      statusText: 'Gagal',
      summary: `Konfigurasi belum valid: ${missingParts.join(', ')}.`,
      detectedValue: missingParts.join(' · '),
      section: !dirValid ? 'files' : 'identity',
    });
  } else {
    items.push({
      id: 'guid-and-dir',
      label: 'GUID & Target Instalasi',
      status: 'pass',
      statusText: 'Lolos',
      summary: 'Pengenal unik Windows (GUID), direktori pemasangan, dan nama berkas output siap dibuild.',
      detectedValue: `${getResolvedInstallDir(project, 'display')}`,
      section: 'identity',
    });
  }

  const passedCount = items.filter((i) => i.status === 'pass').length;
  const failedCount = items.filter((i) => i.status === 'fail').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;

  return {
    readyToBuild: failedCount === 0,
    hasWarnings: warningCount > 0,
    passedCount,
    failedCount,
    warningCount,
    totalCount: items.length,
    items,
  };
}

export function validateProject(project: InstallerProject): ValidationIssue[] {
  const report = evaluateProjectHealth(project);
  return report.checks
    .filter((c) => !c.passed)
    .map((c) => ({
      id: c.id,
      severity: c.severity === 'critical' ? 'error' : 'warning',
      section: c.section,
      title: c.title,
      detail: c.detail,
    }));
}

export function generateInnoSetupScript(project: InstallerProject, assets?: UploadedAssets): string {
  const mainExe = getMainExeFile(project);
  const mainExeName = mainExe ? getExeFileName(mainExe.sourcePath) : `${sanitizeId(project.appName)}.exe`;
  const mainExeDest = mainExe?.destSubDir ? `{app}\\${mainExe.destSubDir}\\${mainExeName}` : `{app}\\${mainExeName}`;
  const defaultDir = getResolvedInstallDir(project, 'inno');
  const enabledPrereqs = project.prerequisites.filter((p) => p.enabled);

  const lines: string[] = [];
  lines.push(`; =============================================================================`);
  lines.push(`; Dihasilkan oleh Days WinInstaller — Inno Setup 6 Script`);
  lines.push(`; Aplikasi : ${project.appName} v${project.appVersion}`);
  lines.push(`; Penerbit : ${project.publisher}`);
  lines.push(`; =============================================================================`);
  lines.push('');
  lines.push(`#define MyAppName "${escapeInnoString(project.appName)}"`);
  lines.push(`#define MyAppVersion "${escapeInnoString(project.appVersion)}"`);
  lines.push(`#define MyAppPublisher "${escapeInnoString(project.publisher)}"`);
  lines.push(`#define MyAppURL "${escapeInnoString(project.publisherUrl)}"`);
  lines.push(`#define MyAppExeName "${escapeInnoString(mainExeName)}"`);
  lines.push('');

  lines.push('[Setup]');
  lines.push(`AppId={{${project.appId.replace(/^\{|\}$/g, '')}}`);
  lines.push('AppName={#MyAppName}');
  lines.push('AppVersion={#MyAppVersion}');
  lines.push('AppVerName={#MyAppName} {#MyAppVersion}');
  lines.push('AppPublisher={#MyAppPublisher}');
  if (project.publisherUrl.trim()) {
    lines.push('AppPublisherURL={#MyAppURL}');
  }
  if (project.supportUrl.trim()) {
    lines.push(`AppSupportURL=${project.supportUrl.trim()}`);
    lines.push(`AppUpdatesURL=${project.supportUrl.trim()}`);
  }
  lines.push(`DefaultDirName=${defaultDir}`);
  lines.push(`DisableDirPage=${project.allowDirChange ? 'no' : 'yes'}`);
  lines.push(`DefaultGroupName=${project.startMenuFolder || '{#MyAppName}'}`);
  lines.push(`DisableProgramGroupPage=${project.createStartMenuShortcut ? 'auto' : 'yes'}`);
  if (project.showLicensePage) {
    lines.push('LicenseFile=LICENSE.txt');
  }
  lines.push(`OutputDir=${project.outputDir || 'dist'}`);
  lines.push(`OutputBaseFilename=${project.outputBaseFilename || 'Setup'}`);
  if (assets?.iconFileName) {
    lines.push(`SetupIconFile=assets\\${assets.iconFileName}`);
  }
  if (assets?.sidebarFileName) {
    lines.push(`WizardImageFile=assets\\${assets.sidebarFileName}`);
  }
  lines.push(`Compression=${project.compression}`);
  lines.push(`SolidCompression=${project.solidCompression ? 'yes' : 'no'}`);
  lines.push(`WizardStyle=${project.wizardStyle}`);
  lines.push(`PrivilegesRequired=${project.privilegeLevel}`);
  lines.push(`MinVersion=${project.minWindowsVersion}`);
  if (project.architecture === 'x64') {
    lines.push('ArchitecturesAllowed=x64compatible');
    lines.push('ArchitecturesInstallIn64BitMode=x64compatible');
  } else if (project.architecture === 'arm64') {
    lines.push('ArchitecturesAllowed=arm64');
    lines.push('ArchitecturesInstallIn64BitMode=arm64');
  }
  if (project.closeRunningApp) {
    lines.push('CloseApplications=yes');
    lines.push('RestartApplications=yes');
  }
  if (project.fileAssociations.length > 0 || project.addToSystemPath) {
    lines.push('ChangesAssociations=yes');
    lines.push('ChangesEnvironment=yes');
  }
  lines.push(`UninstallDisplayIcon=${mainExeDest}`);
  lines.push('');

  lines.push('[Languages]');
  const selectedLangs = project.languages.length > 0 ? project.languages : ['indonesian'];
  for (const code of selectedLangs) {
    const meta = AVAILABLE_LANGUAGES.find((l) => l.code === code);
    if (meta) {
      lines.push(`Name: "${meta.code}"; MessagesFile: "${meta.innoFile}"`);
    }
  }
  lines.push('');

  lines.push('[Tasks]');
  if (project.createDesktopShortcut) {
    const uncheckedFlag = project.desktopShortcutDefaultChecked ? '' : ' unchecked';
    lines.push(
      `Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags:${uncheckedFlag || ' checkablealone'}`
    );
  }
  if (project.runAtWindowsStartup) {
    lines.push(
      `Name: "autostart"; Description: "Jalankan {#MyAppName} otomatis saat Windows dimulai"; GroupDescription: "Opsi Sistem:"`
    );
  }
  if (project.addToSystemPath) {
    lines.push(
      `Name: "addtopath"; Description: "Tambahkan direktori aplikasi ke variabel PATH"; GroupDescription: "Opsi Sistem:"`
    );
  }
  lines.push('');

  lines.push('[Files]');
  for (const file of project.files) {
    const destDir = file.destSubDir.trim() ? `{app}\\${file.destSubDir.trim()}` : '{app}';
    const flags: string[] = [];
    if (file.ignoreVersion) flags.push('ignoreversion');
    if (file.isRecursive) {
      flags.push('recursesubdirs');
      flags.push('createallsubdirs');
    }
    if (file.restartReplace) flags.push('restartreplace');
    const flagStr = flags.length > 0 ? `; Flags: ${flags.join(' ')}` : '';
    lines.push(`Source: "${escapeInnoString(file.sourcePath)}"; DestDir: "${destDir}"${flagStr}`);
  }
  lines.push('');

  lines.push('[Icons]');
  if (project.createStartMenuShortcut) {
    lines.push(`Name: "{group}\\{#MyAppName}"; Filename: "${mainExeDest}"`);
  }
  if (project.createUninstallShortcut && project.createStartMenuShortcut) {
    lines.push(`Name: "{group}\\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"`);
  }
  if (project.createDesktopShortcut) {
    lines.push(`Name: "{autodesktop}\\{#MyAppName}"; Filename: "${mainExeDest}"; Tasks: desktopicon`);
  }
  lines.push('');

  const hasRegistry =
    project.registryEntries.length > 0 ||
    project.fileAssociations.length > 0 ||
    project.runAtWindowsStartup;

  if (hasRegistry) {
    lines.push('[Registry]');
    const assocRoot = project.privilegeLevel === 'admin' ? 'HKA' : 'HKCU';
    for (const assoc of project.fileAssociations) {
      const ext = assoc.extension.startsWith('.') ? assoc.extension : `.${assoc.extension}`;
      const progId = assoc.progId || `${sanitizeId(project.appName)}.File`;
      lines.push(
        `Root: ${assocRoot}; Subkey: "Software\\Classes\\${ext}"; ValueType: string; ValueName: ""; ValueData: "${progId}"; Flags: uninsdeletevalue`
      );
      lines.push(
        `Root: ${assocRoot}; Subkey: "Software\\Classes\\${progId}"; ValueType: string; ValueName: ""; ValueData: "${escapeInnoString(assoc.description || ext)}"; Flags: uninsdeletekey`
      );
      lines.push(
        `Root: ${assocRoot}; Subkey: "Software\\Classes\\${progId}\\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "${mainExeDest},0"`
      );
      lines.push(
        `Root: ${assocRoot}; Subkey: "Software\\Classes\\${progId}\\shell\\open\\command"; ValueType: string; ValueName: ""; ValueData: """${mainExeDest}"" ""%1"""`
      );
    }

    if (project.runAtWindowsStartup) {
      lines.push(
        `Root: HKCU; Subkey: "Software\\Microsoft\\Windows\\CurrentVersion\\Run"; ValueType: string; ValueName: "{#MyAppName}"; ValueData: """${mainExeDest}"""; Tasks: autostart; Flags: uninsdeletevalue`
      );
    }

    for (const reg of project.registryEntries) {
      const innoType =
        reg.valueType === 'REG_DWORD'
          ? 'dword'
          : reg.valueType === 'REG_EXPAND_SZ'
            ? 'expandsz'
            : 'string';
      const delFlag = reg.deleteOnUninstall ? '; Flags: uninsdeletevalue' : '';
      lines.push(
        `Root: ${reg.root}; Subkey: "${escapeInnoString(reg.subKey)}"; ValueType: ${innoType}; ValueName: "${escapeInnoString(reg.valueName)}"; ValueData: "${escapeInnoString(reg.valueData)}"${delFlag}`
      );
    }
    lines.push('');
  }

  if (project.launchAfterInstall) {
    lines.push('[Run]');
    lines.push(
      `Filename: "${mainExeDest}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent`
    );
    lines.push('');
  }

  if (enabledPrereqs.length > 0 || project.addToSystemPath) {
    lines.push('[Code]');
    if (enabledPrereqs.length > 0) {
      lines.push('function InitializeSetup(): Boolean;');
      lines.push('begin');
      lines.push('  Result := True;');
      for (const p of enabledPrereqs) {
        lines.push(`  // Pemeriksaan prasyarat: ${p.name}`);
        lines.push(`  if not RegKeyExists(HKLM, '${p.registryCheck.replace(/\\/g, '\\')}') then`);
        lines.push('  begin');
        lines.push(
          `    if MsgBox('Komponen "${p.name}" tidak terdeteksi. Buka tautan unduhan resmi sekarang?', mbConfirmation, MB_YESNO) = IDYES then`
        );
        lines.push(
          `      ShellExec('open', '${p.downloadUrl}', '', '', SW_SHOWNORMAL, ewNoWait, ResultCode);`
        );
        lines.push('  end;');
      }
      lines.push('end;');
      lines.push('');
    }

    if (project.addToSystemPath) {
      lines.push('procedure CurStepChanged(CurStep: TSetupStep);');
      lines.push('var');
      lines.push('  OrigPath: string;');
      lines.push('begin');
      lines.push('  if (CurStep = ssPostInstall) and WizardIsTaskSelected(\'addtopath\') then');
      lines.push('  begin');
      lines.push('    if RegQueryStringValue(HKEY_CURRENT_USER, \'Environment\', \'Path\', OrigPath) then');
      lines.push('    begin');
      lines.push('      if Pos(LowerCase(ExpandConstant(\'{app}\')), LowerCase(OrigPath)) = 0 then');
      lines.push(
        '        RegWriteExpandStringValue(HKEY_CURRENT_USER, \'Environment\', \'Path\', OrigPath + \';\' + ExpandConstant(\'{app}\'));'
      );
      lines.push('    end;');
      lines.push('  end;');
      lines.push('end;');
    }
  }

  return lines.join('\n');
}

export function generateNsisScript(project: InstallerProject): string {
  const mainExe = getMainExeFile(project);
  const mainExeName = mainExe ? getExeFileName(mainExe.sourcePath) : `${sanitizeId(project.appName)}.exe`;
  const mainExeInstPath = mainExe?.destSubDir ? `$INSTDIR\\${mainExe.destSubDir}\\${mainExeName}` : `$INSTDIR\\${mainExeName}`;
  const installDir = getResolvedInstallDir(project, 'nsis');
  const regRoot = project.privilegeLevel === 'admin' ? 'HKLM' : 'HKCU';
  const uninstallKey = `Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${project.appName}`;

  const lines: string[] = [];
  lines.push(`; =============================================================================`);
  lines.push(`; Dihasilkan oleh Days WinInstaller — NSIS 3 Modern UI 2 Script`);
  lines.push(`; Aplikasi : ${project.appName} v${project.appVersion}`);
  lines.push(`; =============================================================================`);
  lines.push('');
  lines.push('Unicode True');
  lines.push('!include "MUI2.nsh"');
  lines.push('!include "x64.nsh"');
  lines.push('');
  lines.push(`!define APP_NAME "${project.appName}"`);
  lines.push(`!define APP_VERSION "${project.appVersion}"`);
  lines.push(`!define APP_PUBLISHER "${project.publisher}"`);
  lines.push(`!define APP_URL "${project.publisherUrl}"`);
  lines.push(`!define APP_EXE "${mainExeName}"`);
  lines.push('');
  lines.push('Name "${APP_NAME} ${APP_VERSION}"');
  lines.push(`OutFile "${project.outputDir || 'dist'}\\${project.outputBaseFilename || 'Setup'}.exe"`);
  lines.push(`InstallDir "${installDir}"`);
  lines.push(`RequestExecutionLevel ${project.privilegeLevel === 'admin' ? 'admin' : 'user'}`);
  if (project.compression.startsWith('lzma2')) {
    lines.push(`SetCompressor ${project.solidCompression ? '/SOLID ' : ''}lzma`);
  } else if (project.compression === 'zip') {
    lines.push('SetCompressor zlib');
  } else {
    lines.push('SetCompress off');
  }
  lines.push('');

  lines.push('; Konfigurasi Modern UI');
  lines.push('!define MUI_ABORTWARNING');
  if (project.launchAfterInstall) {
    lines.push(`!define MUI_FINISHPAGE_RUN "${mainExeInstPath}"`);
  }
  lines.push('!insertmacro MUI_PAGE_WELCOME');
  if (project.showLicensePage) {
    lines.push('!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"');
  }
  if (project.allowDirChange) {
    lines.push('!insertmacro MUI_PAGE_DIRECTORY');
  }
  lines.push('!insertmacro MUI_PAGE_INSTFILES');
  lines.push('!insertmacro MUI_PAGE_FINISH');
  lines.push('');
  lines.push('!insertmacro MUI_UNPAGE_CONFIRM');
  lines.push('!insertmacro MUI_UNPAGE_INSTFILES');
  lines.push('');

  const selectedLangs = project.languages.length > 0 ? project.languages : ['indonesian'];
  for (const code of selectedLangs) {
    const meta = AVAILABLE_LANGUAGES.find((l) => l.code === code);
    if (meta) {
      lines.push(`!insertmacro MUI_LANGUAGE "${meta.nsisLang}"`);
    }
  }
  lines.push('');

  lines.push('Section "Pemasangan Utama" SecMain');
  lines.push('  SectionIn RO');
  lines.push('  SetOutPath "$INSTDIR"');
  for (const file of project.files) {
    if (file.destSubDir.trim()) {
      lines.push(`  SetOutPath "$INSTDIR\\${file.destSubDir.trim()}"`);
    } else {
      lines.push('  SetOutPath "$INSTDIR"');
    }
    lines.push(`  File ${file.isRecursive ? '/r ' : ''}"${file.sourcePath}"`);
  }
  lines.push('  SetOutPath "$INSTDIR"');
  lines.push('  WriteUninstaller "$INSTDIR\\Uninstall.exe"');
  lines.push('');

  if (project.createStartMenuShortcut) {
    lines.push(`  CreateDirectory "$SMPROGRAMS\\${project.startMenuFolder || project.appName}"`);
    lines.push(
      `  CreateShortcut "$SMPROGRAMS\\${project.startMenuFolder || project.appName}\\${project.appName}.lnk" "${mainExeInstPath}"`
    );
    if (project.createUninstallShortcut) {
      lines.push(
        `  CreateShortcut "$SMPROGRAMS\\${project.startMenuFolder || project.appName}\\Uninstall ${project.appName}.lnk" "$INSTDIR\\Uninstall.exe"`
      );
    }
  }
  if (project.createDesktopShortcut) {
    lines.push(`  CreateShortcut "$DESKTOP\\${project.appName}.lnk" "${mainExeInstPath}"`);
  }
  lines.push('');

  lines.push('  ; Entri Add/Remove Programs Windows');
  lines.push(`  WriteRegStr ${regRoot} "${uninstallKey}" "DisplayName" "\${APP_NAME}"`);
  lines.push(`  WriteRegStr ${regRoot} "${uninstallKey}" "DisplayVersion" "\${APP_VERSION}"`);
  lines.push(`  WriteRegStr ${regRoot} "${uninstallKey}" "Publisher" "\${APP_PUBLISHER}"`);
  lines.push(`  WriteRegStr ${regRoot} "${uninstallKey}" "UninstallString" '"$INSTDIR\\Uninstall.exe"'`);
  lines.push(`  WriteRegStr ${regRoot} "${uninstallKey}" "DisplayIcon" "${mainExeInstPath}"`);

  if (project.runAtWindowsStartup) {
    lines.push(
      `  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "\${APP_NAME}" '"${mainExeInstPath}"'`
    );
  }

  for (const reg of project.registryEntries) {
    const cmd =
      reg.valueType === 'REG_DWORD'
        ? 'WriteRegDWORD'
        : reg.valueType === 'REG_EXPAND_SZ'
          ? 'WriteRegExpandStr'
          : 'WriteRegStr';
    const val = reg.valueData.replace(/\{app\}/g, '$INSTDIR');
    lines.push(`  ${cmd} ${reg.root} "${reg.subKey}" "${reg.valueName}" "${val}"`);
  }

  for (const assoc of project.fileAssociations) {
    const ext = assoc.extension.startsWith('.') ? assoc.extension : `.${assoc.extension}`;
    lines.push(`  WriteRegStr ${regRoot} "Software\\Classes\\${ext}" "" "${assoc.progId}"`);
    lines.push(`  WriteRegStr ${regRoot} "Software\\Classes\\${assoc.progId}" "" "${assoc.description}"`);
    lines.push(
      `  WriteRegStr ${regRoot} "Software\\Classes\\${assoc.progId}\\shell\\open\\command" "" '"${mainExeInstPath}" "%1"'`
    );
  }
  lines.push('SectionEnd');
  lines.push('');

  lines.push('Section "Uninstall"');
  if (project.createDesktopShortcut) {
    lines.push(`  Delete "$DESKTOP\\${project.appName}.lnk"`);
  }
  if (project.createStartMenuShortcut) {
    lines.push(`  RMDir /r "$SMPROGRAMS\\${project.startMenuFolder || project.appName}"`);
  }
  lines.push(`  DeleteRegKey ${regRoot} "${uninstallKey}"`);
  if (project.runAtWindowsStartup) {
    lines.push('  DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "${APP_NAME}"');
  }
  for (const reg of project.registryEntries.filter((r) => r.deleteOnUninstall)) {
    lines.push(`  DeleteRegValue ${reg.root} "${reg.subKey}" "${reg.valueName}"`);
  }
  lines.push('  RMDir /r "$INSTDIR"');
  lines.push('SectionEnd');

  return lines.join('\n');
}

export function generateWixScript(project: InstallerProject): string {
  const mainExe = getMainExeFile(project);
  const mainExeName = mainExe ? getExeFileName(mainExe.sourcePath) : `${sanitizeId(project.appName)}.exe`;
  const scope = project.privilegeLevel === 'admin' ? 'perMachine' : 'perUser';
  const stdDir =
    project.defaultDirPreset === 'localappdata'
      ? 'LocalAppDataFolder'
      : project.architecture === 'x86'
        ? 'ProgramFilesFolder'
        : 'ProgramFiles64Folder';

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!-- Dihasilkan oleh Days WinInstaller — WiX Toolset v4 (.wxs) -->');
  lines.push('<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">');
  lines.push(
    `  <Package Name="${escapeXml(project.appName)}" Manufacturer="${escapeXml(project.publisher)}" Version="${escapeXml(project.appVersion)}" UpgradeCode="${escapeXml(project.upgradeCode)}" Scope="${scope}" Compressed="yes">`
  );
  lines.push(
    '    <MajorUpgrade DowngradeErrorMessage="Versi yang lebih baru dari [ProductName] sudah terpasang di sistem ini." />'
  );
  lines.push('    <MediaTemplate EmbedCab="yes" CompressionLevel="high" />');
  lines.push('');
  lines.push(`    <StandardDirectory Id="${stdDir}">`);
  lines.push(`      <Directory Id="INSTALLFOLDER" Name="${escapeXml(project.defaultDirName || project.appName)}">`);

  const uniqueSubDirs = Array.from(
    new Set(project.files.map((f) => f.destSubDir.trim()).filter(Boolean))
  );

  for (const sub of uniqueSubDirs) {
    lines.push(`        <Directory Id="DIR_${sanitizeId(sub)}" Name="${escapeXml(sub)}" />`);
  }
  lines.push('      </Directory>');
  lines.push('    </StandardDirectory>');
  lines.push('');

  if (project.createStartMenuShortcut) {
    lines.push('    <StandardDirectory Id="ProgramMenuFolder">');
    lines.push(
      `      <Directory Id="ApplicationProgramsFolder" Name="${escapeXml(project.startMenuFolder || project.appName)}" />`
    );
    lines.push('    </StandardDirectory>');
  }
  if (project.createDesktopShortcut) {
    lines.push('    <StandardDirectory Id="DesktopFolder" />');
  }
  lines.push('');

  lines.push('    <ComponentGroup Id="AppFiles" Directory="INSTALLFOLDER">');
  project.files.forEach((file, idx) => {
    const dirAttr = file.destSubDir.trim() ? ` Directory="DIR_${sanitizeId(file.destSubDir.trim())}"` : '';
    const compId = `Comp_${idx + 1}_${sanitizeId(getExeFileName(file.sourcePath))}`;
    lines.push(`      <Component Id="${compId}"${dirAttr} Guid="*">`);
    if (file.sourcePath.includes('*')) {
      lines.push(`        <!-- Untuk wildcard folder pada WiX v4, gunakan elemen Files Include -->`);
      lines.push(`        <File Source="${escapeXml(file.sourcePath.replace(/\*$/, 'placeholder.dat'))}" />`);
    } else {
      lines.push(`        <File Id="File_${idx + 1}" Source="${escapeXml(file.sourcePath)}" KeyPath="yes" />`);
    }
    lines.push('      </Component>');
  });

  if (project.addToSystemPath) {
    lines.push('      <Component Id="Comp_EnvPath" Guid="*">');
    lines.push(
      '        <Environment Id="PATH_ENTRY" Name="PATH" Value="[INSTALLFOLDER]" Permanent="no" Part="last" Action="set" System="yes" />'
    );
    lines.push('      </Component>');
  }
  lines.push('    </ComponentGroup>');
  lines.push('');

  if (project.createStartMenuShortcut || project.createDesktopShortcut) {
    lines.push('    <ComponentGroup Id="AppShortcuts">');
    if (project.createStartMenuShortcut) {
      lines.push('      <Component Id="Comp_StartMenuShortcut" Directory="ApplicationProgramsFolder" Guid="*">');
      lines.push(
        `        <Shortcut Id="StartMenuShortcut" Name="${escapeXml(project.appName)}" Target="[INSTALLFOLDER]${escapeXml(mainExeName)}" WorkingDirectory="INSTALLFOLDER" />`
      );
      lines.push('        <RemoveFolder Id="CleanStartMenuFolder" On="uninstall" />');
      lines.push(
        `        <RegistryValue Root="HKCU" Key="Software\\${escapeXml(project.publisher)}\\${escapeXml(project.appName)}" Name="installed" Type="integer" Value="1" KeyPath="yes" />`
      );
      lines.push('      </Component>');
    }
    if (project.createDesktopShortcut) {
      lines.push('      <Component Id="Comp_DesktopShortcut" Directory="DesktopFolder" Guid="*">');
      lines.push(
        `        <Shortcut Id="DesktopShortcut" Name="${escapeXml(project.appName)}" Target="[INSTALLFOLDER]${escapeXml(mainExeName)}" WorkingDirectory="INSTALLFOLDER" />`
      );
      lines.push(
        `        <RegistryValue Root="HKCU" Key="Software\\${escapeXml(project.publisher)}\\${escapeXml(project.appName)}" Name="desktop_shortcut" Type="integer" Value="1" KeyPath="yes" />`
      );
      lines.push('      </Component>');
    }
    lines.push('    </ComponentGroup>');
    lines.push('');
  }

  if (project.registryEntries.length > 0) {
    lines.push('    <ComponentGroup Id="AppRegistry" Directory="INSTALLFOLDER">');
    project.registryEntries.forEach((reg, idx) => {
      const wixType =
        reg.valueType === 'REG_DWORD'
          ? 'integer'
          : reg.valueType === 'REG_EXPAND_SZ'
            ? 'expandable'
            : 'string';
      const val = reg.valueData.replace(/\{app\}/g, '[INSTALLFOLDER]');
      lines.push(`      <Component Id="Comp_Reg_${idx + 1}" Guid="*">`);
      lines.push(
        `        <RegistryValue Root="${reg.root}" Key="${escapeXml(reg.subKey)}" Name="${escapeXml(reg.valueName)}" Type="${wixType}" Value="${escapeXml(val)}" KeyPath="yes" />`
      );
      lines.push('      </Component>');
    });
    lines.push('    </ComponentGroup>');
    lines.push('');
  }

  lines.push(`    <Feature Id="MainFeature" Title="${escapeXml(project.appName)}" Level="1">`);
  lines.push('      <ComponentGroupRef Id="AppFiles" />');
  if (project.createStartMenuShortcut || project.createDesktopShortcut) {
    lines.push('      <ComponentGroupRef Id="AppShortcuts" />');
  }
  if (project.registryEntries.length > 0) {
    lines.push('      <ComponentGroupRef Id="AppRegistry" />');
  }
  lines.push('    </Feature>');
  lines.push('  </Package>');
  lines.push('</Wix>');

  return lines.join('\n');
}

export function generateBuildPowerShell(project: InstallerProject): string {
  const ext = project.engine === 'wix' ? 'msi' : 'exe';
  const scriptFile =
    project.engine === 'inno'
      ? 'installer.iss'
      : project.engine === 'nsis'
        ? 'installer.nsi'
        : 'installer.wxs';
  const outPath = `${project.outputDir || 'dist'}\\${project.outputBaseFilename || 'Setup'}.${ext}`;

  const lines: string[] = [
    '# =============================================================================',
    `# Skrip Build Otomatis Windows Installer — ${project.appName} v${project.appVersion}`,
    '# Jalankan di Windows PowerShell: .\\build-installer.ps1',
    '# =============================================================================',
    '$ErrorActionPreference = "Stop"',
    '',
    `$AppName = "${project.appName}"`,
    `$Version = "${project.appVersion}"`,
    `$OutputFile = "${outPath}"`,
    `New-Item -ItemType Directory -Force -Path "${project.outputDir || 'dist'}" | Out-Null`,
    '',
    'Write-Host "Memulai kompilasi installer untuk $AppName v$Version..." -ForegroundColor Cyan',
    '',
  ];

  if (project.engine === 'inno') {
    lines.push('$iscc = "${env:ProgramFiles(x86)}\\Inno Setup 6\\ISCC.exe"');
    lines.push('if (-not (Test-Path $iscc)) { $iscc = (Get-Command iscc -ErrorAction SilentlyContinue).Source }');
    lines.push('if (-not $iscc) {');
    lines.push('  Write-Error "Inno Setup 6 (ISCC.exe) tidak ditemukan. Pasang via: winget install JRSoftware.InnoSetup"');
    lines.push('  exit 1');
    lines.push('}');
    lines.push(`& $iscc "${scriptFile}"`);
  } else if (project.engine === 'nsis') {
    lines.push('$makensis = "${env:ProgramFiles(x86)}\\NSIS\\makensis.exe"');
    lines.push('if (-not (Test-Path $makensis)) { $makensis = (Get-Command makensis -ErrorAction SilentlyContinue).Source }');
    lines.push('if (-not $makensis) {');
    lines.push('  Write-Error "NSIS (makensis.exe) tidak ditemukan. Pasang via: winget install NSIS.NSIS"');
    lines.push('  exit 1');
    lines.push('}');
    lines.push(`& $makensis /V3 "${scriptFile}"`);
  } else {
    lines.push('$wix = (Get-Command wix -ErrorAction SilentlyContinue).Source');
    lines.push('if (-not $wix) {');
    lines.push('  Write-Error "WiX Toolset v4 tidak ditemukan. Pasang via: dotnet tool install --global wix"');
    lines.push('  exit 1');
    lines.push('}');
    lines.push(`& $wix build "${scriptFile}" -arch ${project.architecture} -o "$OutputFile"`);
  }

  lines.push('');
  if (project.enableCodeSigning) {
    lines.push('# Penandatanganan Digital (Code Signing)');
    lines.push('$signtool = (Get-Command signtool.exe -ErrorAction SilentlyContinue).Source');
    lines.push('if ($signtool -and $env:CERT_PASSWORD) {');
    lines.push(
      `  & $signtool sign /f "${project.signCertPath}" /p $env:CERT_PASSWORD /fd SHA256 /tr "${project.timestampServer || 'http://timestamp.digicert.com'}" /td SHA256 "$OutputFile"`
    );
    lines.push('  Write-Host "Installer berhasil ditandatangani secara digital." -ForegroundColor Green');
    lines.push('} else {');
    lines.push('  Write-Warning "Lewati code signing: pastikan signtool.exe ada di PATH dan env CERT_PASSWORD diatur."');
    lines.push('}');
    lines.push('');
  }

  lines.push('if (Test-Path $OutputFile) {');
  lines.push('  $hash = (Get-FileHash -Algorithm SHA256 -Path $OutputFile).Hash');
  lines.push('  "$hash  $(Split-Path $OutputFile -Leaf)" | Out-File -Encoding ascii "$OutputFile.sha256.txt"');
  lines.push('  Write-Host "Selesai! Output: $OutputFile" -ForegroundColor Green');
  lines.push('  Write-Host "SHA-256: $hash"');
  lines.push('}');

  return lines.join('\n');
}

export function generateReadmeBuild(project: InstallerProject): string {
  const compilerInstall =
    project.engine === 'inno'
      ? 'winget install JRSoftware.InnoSetup'
      : project.engine === 'nsis'
        ? 'winget install NSIS.NSIS'
        : 'dotnet tool install --global wix';

  const engineName =
    project.engine === 'inno'
      ? 'Inno Setup 6 (.exe)'
      : project.engine === 'nsis'
        ? 'NSIS Modern UI 2 (.exe)'
        : 'WiX Toolset v4 (.msi)';

  const silentSwitch =
    project.engine === 'inno'
      ? `${project.outputBaseFilename}.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART`
      : project.engine === 'nsis'
        ? `${project.outputBaseFilename}.exe /S`
        : `msiexec /i "${project.outputBaseFilename}.msi" /qn /norestart`;

  return `PANDUAN KOMPILASI WINDOWS INSTALLER
====================================
Aplikasi   : ${project.appName} v${project.appVersion}
Penerbit   : ${project.publisher}
Engine     : ${engineName}
Arsitektur : ${project.architecture.toUpperCase()}

LANGKAH KOMPILASI DI WINDOWS 10 / 11
------------------------------------
1. Ekstrak seluruh isi arsip ZIP ini ke folder proyek aplikasi Anda.
2. Pastikan berkas sumber aplikasi (.exe, .dll, folder assets) sesuai dengan jalur yang tercatat di skrip installer.
3. Pasang kompilator jika belum tersedia melalui PowerShell / Terminal:
   ${compilerInstall}
4. Jalankan skrip otomatisasi build:
   powershell -ExecutionPolicy Bypass -File .\\build-installer.ps1
5. Berkas installer akhir akan dihasilkan pada direktori:
   ${project.outputDir}\\${project.outputBaseFilename}.${project.engine === 'wix' ? 'msi' : 'exe'}

PERINTAH INSTALASI SENYAP (SILENT INSTALL / IT DEPLOYMENT)
----------------------------------------------------------
${silentSwitch}
`;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export async function exportProjectZip(project: InstallerProject, assets: UploadedAssets): Promise<void> {
  const zip = new JSZip();
  const baseFolderName = sanitizeId(`${project.appName}_${project.appVersion}`, 'DaysWinInstallerProject');
  const root = zip.folder(baseFolderName) ?? zip;

  // Include active engine script + alternative scripts in scripts/ subfolder
  if (project.engine === 'inno') {
    root.file('installer.iss', generateInnoSetupScript(project, assets));
  } else if (project.engine === 'nsis') {
    root.file('installer.nsi', generateNsisScript(project));
  } else {
    root.file('installer.wxs', generateWixScript(project));
  }

  const altScripts = root.folder('scripts-alternatif');
  altScripts?.file('installer.iss', generateInnoSetupScript(project, assets));
  altScripts?.file('installer.nsi', generateNsisScript(project));
  altScripts?.file('installer.wxs', generateWixScript(project));

  root.file('build-installer.ps1', generateBuildPowerShell(project));
  root.file('README-BUILD.txt', generateReadmeBuild(project));

  if (project.showLicensePage && project.licenseText.trim()) {
    root.file('LICENSE.txt', project.licenseText);
  }

  root.file('project.winpack.json', JSON.stringify(project, null, 2));

  if (assets.iconDataUrl && assets.iconFileName) {
    root.folder('assets')?.file(assets.iconFileName, dataUrlToBase64(assets.iconDataUrl), { base64: true });
  }
  if (assets.sidebarDataUrl && assets.sidebarFileName) {
    root.folder('assets')?.file(assets.sidebarFileName, dataUrlToBase64(assets.sidebarDataUrl), { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.outputBaseFilename || baseFolderName}-DaysWinInstaller.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
