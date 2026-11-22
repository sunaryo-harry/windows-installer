import { InstallerProject, PrerequisiteItem } from '../types/installer';

export const DEFAULT_SIDEBAR_IMAGE =
  '/src/assets/images/wizard_sidebar_art_1795309806713.jpg';
export const DEFAULT_APP_ICON =
  '/src/assets/images/default_app_icon_1795309805568.jpg';

export function generateGuid(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, exp);
  return `${val >= 100 || exp === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[exp]}`;
}

export const AVAILABLE_LANGUAGES = [
  { code: 'indonesian', label: 'Bahasa Indonesia', innoFile: 'compiler:Languages\\Indonesian.isl', nsisLang: 'Indonesian' },
  { code: 'english', label: 'English (US)', innoFile: 'compiler:Default.isl', nsisLang: 'English' },
  { code: 'japanese', label: 'Japanese', innoFile: 'compiler:Languages\\Japanese.isl', nsisLang: 'Japanese' },
  { code: 'german', label: 'Deutsch', innoFile: 'compiler:Languages\\German.isl', nsisLang: 'German' },
  { code: 'french', label: 'Français', innoFile: 'compiler:Languages\\French.isl', nsisLang: 'French' },
] as const;

export const MIN_WINDOWS_OPTIONS = [
  { value: '10.0.22000', label: 'Windows 11 (Build 22000+)', wixVersion: '1000' },
  { value: '10.0.19041', label: 'Windows 10 2004 / 22H2 (Build 19041+)', wixVersion: '1000' },
  { value: '10.0.17763', label: 'Windows 10 1809 LTSC (Build 17763+)', wixVersion: '1000' },
  { value: '6.1', label: 'Windows 7 SP1 / 8.1 (Kompatibilitas Lama)', wixVersion: '601' },
] as const;

export const DEFAULT_PREREQUISITES: PrerequisiteItem[] = [
  {
    id: 'prereq-dotnet8',
    key: 'dotnet8',
    name: '.NET 8 Desktop Runtime (x64)',
    description: 'Diperlukan untuk aplikasi WPF, WinForms, dan WinUI 3 berbasis .NET 8.',
    enabled: false,
    downloadUrl: 'https://aka.ms/dotnet/8.0/windowsdesktop-runtime-win-x64.exe',
    silentArgs: '/install /quiet /norestart',
    registryCheck: 'SOFTWARE\\dotnet\\Setup\\InstalledVersions\\x64\\sharedfx\\Microsoft.WindowsDesktop.App',
  },
  {
    id: 'prereq-vcpp',
    key: 'vcpp2022',
    name: 'Visual C++ Redistributable 2015–2022',
    description: 'Pustaka runtime C/C++ untuk biner native Windows, Rust, atau modul C++.',
    enabled: true,
    downloadUrl: 'https://aka.ms/vs/17/release/vc_redist.x64.exe',
    silentArgs: '/install /quiet /norestart',
    registryCheck: 'SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64',
  },
  {
    id: 'prereq-webview2',
    key: 'webview2',
    name: 'Microsoft Edge WebView2 Runtime',
    description: 'Diperlukan untuk aplikasi Tauri, WinUI WebView2, atau antarmuka hibrida.',
    enabled: false,
    downloadUrl: 'https://go.microsoft.com/fwlink/p/?LinkId=2124703',
    silentArgs: '/silent /install',
    registryCheck: 'SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
  },
  {
    id: 'prereq-directx',
    key: 'directx',
    name: 'DirectX End-User Runtime',
    description: 'Komponen grafis dan audio untuk aplikasi multimedia atau gim 3D Windows.',
    enabled: false,
    downloadUrl: 'https://download.microsoft.com/download/1/7/1/1718CCC4-6315-4D8E-9543-8E28A4E18C4C/dxwebsetup.exe',
    silentArgs: '/Q',
    registryCheck: 'SOFTWARE\\Microsoft\\DirectX',
  },
];

export const LICENSE_PRESETS: Record<string, { label: string; text: string }> = {
  eula_id: {
    label: 'EULA Komersial (Bahasa Indonesia)',
    text: `PERJANJIAN LISENSI PENGGUNA AKHIR (EULA)

Hak Cipta (c) 2026 Nusantara Digital Systems. Seluruh hak cipta dilindungi.

DENGAN MEMASANG ATAU MENGGUNAKAN PERANGKAT LUNAK INI, ANDA MENYETUJUI KETENTUAN BERIKUT:

1. PEMBERIAN LISENSI
   Penerbit memberikan kepada Anda lisensi non-eksklusif dan tidak dapat dipindahtangankan untuk memasang dan menjalankan perangkat lunak ini pada perangkat Windows yang Anda miliki atau kelola.

2. PEMBATASAN
   Anda tidak diperkenankan mendekompilasi, merekayasa balik, menyewakan, atau mendistribusikan ulang paket pemasangan ini tanpa izin tertulis dari Penerbit.

3. PEMBARUAN DAN DUKUNGAN
   Pembaruan perangkat lunak yang dirilis oleh Penerbit tunduk pada ketentuan perjanjian ini kecuali disertai perjanjian terpisah.

4. PENYANGKALAN JAMINAN
   Perangkat lunak ini disediakan "sebagaimana adanya" tanpa jaminan tersurat maupun tersirat. Penerbit tidak bertanggung jawab atas kehilangan data atau kerugian operasional yang timbul akibat penggunaan perangkat lunak ini.`,
  },
  mit: {
    label: 'MIT License (Open Source)',
    text: `MIT License

Copyright (c) 2026 Publisher

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  },
  apache2: {
    label: 'Apache License 2.0',
    text: `Apache License, Version 2.0

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:
http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,
  },
};

export interface ProjectTemplate {
  id: string;
  name: string;
  subtitle: string;
  engineLabel: string;
  create: () => InstallerProject;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'desktop-pro',
    name: 'Aplikasi Desktop Windows (x64)',
    subtitle: 'Lengkap dengan shortcut, asosiasi berkas, kunci registri, EULA, dan VC++ Runtime.',
    engineLabel: 'Inno Setup (.exe)',
    create: () => ({
      id: 'proj-nusantara-desktop',
      updatedAt: new Date().toISOString(),
      engine: 'inno',
      appName: 'Nusantara Studio',
      appVersion: '2.4.0',
      publisher: 'Nusantara Digital Systems',
      publisherUrl: 'https://nusantaradigital.id',
      supportUrl: 'https://nusantaradigital.id/dukungan',
      appId: '{8F4A2B1C-6D9E-4C12-9A34-5E7B8C9D0E1F}',
      upgradeCode: '{A1B2C3D4-E5F6-4789-8ABC-DEF012345678}',
      architecture: 'x64',
      outputBaseFilename: 'NusantaraStudio-2.4.0-x64-Setup',
      outputDir: 'dist\\installer',
      compression: 'lzma2/ultra64',
      solidCompression: true,
      defaultDirPreset: 'autopf',
      defaultDirName: 'Nusantara Studio',
      allowDirChange: true,
      files: [
        {
          id: 'f-1',
          sourcePath: 'build\\Release\\NusantaraStudio.exe',
          destSubDir: '',
          isMainExe: true,
          isRecursive: false,
          sizeBytes: 18450944,
          ignoreVersion: true,
          restartReplace: false,
          note: 'Biner utama aplikasi',
        },
        {
          id: 'f-2',
          sourcePath: 'build\\Release\\CoreEngine.dll',
          destSubDir: '',
          isMainExe: false,
          isRecursive: false,
          sizeBytes: 6291456,
          ignoreVersion: true,
          restartReplace: true,
          note: 'Pustaka inti pemrosesan',
        },
        {
          id: 'f-3',
          sourcePath: 'build\\Release\\assets\\*',
          destSubDir: 'assets',
          isMainExe: false,
          isRecursive: true,
          sizeBytes: 14802944,
          ignoreVersion: true,
          restartReplace: false,
          note: 'Ikon, tema, dan templat bawaan',
        },
        {
          id: 'f-4',
          sourcePath: 'build\\Release\\locales\\*',
          destSubDir: 'locales',
          isMainExe: false,
          isRecursive: true,
          sizeBytes: 1245184,
          ignoreVersion: true,
          restartReplace: false,
          note: 'Paket terjemahan ID & EN',
        },
        {
          id: 'f-5',
          sourcePath: 'build\\Release\\config.default.json',
          destSubDir: 'config',
          isMainExe: false,
          isRecursive: false,
          sizeBytes: 16384,
          ignoreVersion: false,
          restartReplace: false,
          note: 'Konfigurasi awal aplikasi',
        },
      ],
      startMenuFolder: 'Nusantara Studio',
      createStartMenuShortcut: true,
      createDesktopShortcut: true,
      desktopShortcutDefaultChecked: true,
      createUninstallShortcut: true,
      launchAfterInstall: true,
      runAtWindowsStartup: false,
      addToSystemPath: false,
      fileAssociations: [
        {
          id: 'assoc-1',
          extension: '.nsproj',
          progId: 'NusantaraStudio.ProjectFile',
          description: 'Berkas Proyek Nusantara Studio',
        },
      ],
      minWindowsVersion: '10.0.19041',
      privilegeLevel: 'admin',
      closeRunningApp: true,
      supportSilentInstall: true,
      registryEntries: [
        {
          id: 'reg-1',
          root: 'HKLM',
          subKey: 'Software\\NusantaraDigital\\NusantaraStudio',
          valueName: 'InstallPath',
          valueType: 'REG_SZ',
          valueData: '{app}',
          deleteOnUninstall: true,
        },
        {
          id: 'reg-2',
          root: 'HKLM',
          subKey: 'Software\\NusantaraDigital\\NusantaraStudio',
          valueName: 'AutoUpdateChannel',
          valueType: 'REG_SZ',
          valueData: 'stable',
          deleteOnUninstall: true,
        },
      ],
      prerequisites: DEFAULT_PREREQUISITES.map((item) => ({ ...item })),
      enableCodeSigning: false,
      signCertPath: 'certs\\codesign-company.pfx',
      timestampServer: 'http://timestamp.digicert.com',
      wizardStyle: 'modern',
      languages: ['indonesian', 'english'],
      showLicensePage: true,
      licenseText: LICENSE_PRESETS.eula_id.text,
      welcomeHeadline: 'Selamat Datang di Pemasangan Nusantara Studio',
      welcomeSubtitle:
        'Panduan ini akan memasang Nusantara Studio 2.4.0 pada komputer Windows Anda. Tutup aplikasi lain sebelum melanjutkan.',
      accentHex: '#0067C0',
    }),
  },
  {
    id: 'msi-enterprise',
    name: 'Paket Enterprise MSI (WiX Toolset)',
    subtitle: 'Cocok untuk distribusi massal Intune / Group Policy (GPO) dan instalasi senyap.',
    engineLabel: 'WiX v4 (.msi)',
    create: () => ({
      id: `proj-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      engine: 'wix',
      appName: 'SentraSync Agent',
      appVersion: '3.1.2',
      publisher: 'PT Sentra Infrastruktur',
      publisherUrl: 'https://sentrainfra.co.id',
      supportUrl: 'https://sentrainfra.co.id/helpdesk',
      appId: generateGuid(),
      upgradeCode: generateGuid(),
      architecture: 'x64',
      outputBaseFilename: 'SentraSyncAgent-3.1.2-x64',
      outputDir: 'dist\\msi',
      compression: 'lzma2',
      solidCompression: true,
      defaultDirPreset: 'autopf',
      defaultDirName: 'SentraSync Agent',
      allowDirChange: true,
      files: [
        {
          id: 'f-msi-1',
          sourcePath: 'publish\\SentraSync.exe',
          destSubDir: '',
          isMainExe: true,
          isRecursive: false,
          sizeBytes: 9437184,
          ignoreVersion: true,
          restartReplace: true,
          note: 'Layanan agen utama',
        },
        {
          id: 'f-msi-2',
          sourcePath: 'publish\\SentraSync.Cli.exe',
          destSubDir: 'bin',
          isMainExe: false,
          isRecursive: false,
          sizeBytes: 3145728,
          ignoreVersion: true,
          restartReplace: false,
          note: 'Utilitas baris perintah',
        },
      ],
      startMenuFolder: 'SentraSync',
      createStartMenuShortcut: true,
      createDesktopShortcut: false,
      desktopShortcutDefaultChecked: false,
      createUninstallShortcut: false,
      launchAfterInstall: false,
      runAtWindowsStartup: true,
      addToSystemPath: true,
      fileAssociations: [],
      minWindowsVersion: '10.0.19041',
      privilegeLevel: 'admin',
      closeRunningApp: true,
      supportSilentInstall: true,
      registryEntries: [
        {
          id: 'reg-msi-1',
          root: 'HKLM',
          subKey: 'Software\\SentraInfrastruktur\\SentraSync',
          valueName: 'EnableTelemetry',
          valueType: 'REG_DWORD',
          valueData: '0',
          deleteOnUninstall: true,
        },
      ],
      prerequisites: DEFAULT_PREREQUISITES.map((p) => ({
        ...p,
        enabled: p.key === 'dotnet8',
      })),
      enableCodeSigning: true,
      signCertPath: 'certs\\enterprise-signing.pfx',
      timestampServer: 'http://timestamp.digicert.com',
      wizardStyle: 'modern',
      languages: ['indonesian', 'english'],
      showLicensePage: true,
      licenseText: LICENSE_PRESETS.eula_id.text,
      welcomeHeadline: 'Pemasangan SentraSync Agent Enterprise',
      welcomeSubtitle:
        'Installer MSI resmi untuk distribusi workstations dan server Windows perusahaan.',
      accentHex: '#0067C0',
    }),
  },
  {
    id: 'per-user-nsis',
    name: 'Utilitas Per-Pengguna Tanpa Admin',
    subtitle: 'Dipasang ke LocalAppData tanpa prompt UAC menggunakan NSIS Modern UI.',
    engineLabel: 'NSIS (.exe)',
    create: () => ({
      id: `proj-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      engine: 'nsis',
      appName: 'CatatanCepat',
      appVersion: '1.2.0',
      publisher: 'Studio Mandiri',
      publisherUrl: 'https://catatancepat.app',
      supportUrl: 'https://catatancepat.app/bantuan',
      appId: generateGuid(),
      upgradeCode: generateGuid(),
      architecture: 'x64',
      outputBaseFilename: 'CatatanCepat-1.2.0-UserSetup',
      outputDir: 'dist',
      compression: 'lzma2/ultra64',
      solidCompression: true,
      defaultDirPreset: 'localappdata',
      defaultDirName: 'CatatanCepat',
      allowDirChange: true,
      files: [
        {
          id: 'f-user-1',
          sourcePath: 'release\\CatatanCepat.exe',
          destSubDir: '',
          isMainExe: true,
          isRecursive: false,
          sizeBytes: 5242880,
          ignoreVersion: true,
          restartReplace: false,
          note: 'Aplikasi catatan ringan',
        },
        {
          id: 'f-user-2',
          sourcePath: 'release\\themes\\*',
          destSubDir: 'themes',
          isMainExe: false,
          isRecursive: true,
          sizeBytes: 620000,
          ignoreVersion: true,
          restartReplace: false,
          note: 'Tema tampilan editor',
        },
      ],
      startMenuFolder: 'CatatanCepat',
      createStartMenuShortcut: true,
      createDesktopShortcut: true,
      desktopShortcutDefaultChecked: true,
      createUninstallShortcut: true,
      launchAfterInstall: true,
      runAtWindowsStartup: false,
      addToSystemPath: false,
      fileAssociations: [
        {
          id: 'assoc-user-1',
          extension: '.cnotes',
          progId: 'CatatanCepat.Document',
          description: 'Dokumen CatatanCepat',
        },
      ],
      minWindowsVersion: '10.0.17763',
      privilegeLevel: 'lowest',
      closeRunningApp: true,
      supportSilentInstall: true,
      registryEntries: [
        {
          id: 'reg-user-1',
          root: 'HKCU',
          subKey: 'Software\\StudioMandiri\\CatatanCepat',
          valueName: 'Theme',
          valueType: 'REG_SZ',
          valueData: 'system',
          deleteOnUninstall: true,
        },
      ],
      prerequisites: DEFAULT_PREREQUISITES.map((p) => ({
        ...p,
        enabled: p.key === 'webview2',
      })),
      enableCodeSigning: false,
      signCertPath: '',
      timestampServer: 'http://timestamp.digicert.com',
      wizardStyle: 'modern',
      languages: ['indonesian'],
      showLicensePage: false,
      licenseText: LICENSE_PRESETS.mit.text,
      welcomeHeadline: 'Pasang CatatanCepat di Akun Anda',
      welcomeSubtitle:
        'Tidak memerlukan hak Administrator. Siap digunakan dalam beberapa detik.',
      accentHex: '#0067C0',
    }),
  },
  {
    id: 'blank',
    name: 'Proyek Kosong Baru',
    subtitle: 'Mulai konfigurasi installer Windows dari awal sesuai kebutuhan aplikasi Anda.',
    engineLabel: 'Inno Setup (.exe)',
    create: () => ({
      id: `proj-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      engine: 'inno',
      appName: 'Aplikasi Saya',
      appVersion: '1.0.0',
      publisher: 'Perusahaan Anda',
      publisherUrl: 'https://contoh.id',
      supportUrl: 'https://contoh.id/dukungan',
      appId: generateGuid(),
      upgradeCode: generateGuid(),
      architecture: 'x64',
      outputBaseFilename: 'AplikasiSaya-1.0.0-Setup',
      outputDir: 'dist',
      compression: 'lzma2/ultra64',
      solidCompression: true,
      defaultDirPreset: 'autopf',
      defaultDirName: 'Aplikasi Saya',
      allowDirChange: true,
      files: [
        {
          id: 'f-blank-1',
          sourcePath: 'bin\\Release\\AplikasiSaya.exe',
          destSubDir: '',
          isMainExe: true,
          isRecursive: false,
          sizeBytes: 4194304,
          ignoreVersion: true,
          restartReplace: false,
          note: 'File eksekusi utama',
        },
      ],
      startMenuFolder: 'Aplikasi Saya',
      createStartMenuShortcut: true,
      createDesktopShortcut: true,
      desktopShortcutDefaultChecked: true,
      createUninstallShortcut: true,
      launchAfterInstall: true,
      runAtWindowsStartup: false,
      addToSystemPath: false,
      fileAssociations: [],
      minWindowsVersion: '10.0.19041',
      privilegeLevel: 'admin',
      closeRunningApp: true,
      supportSilentInstall: true,
      registryEntries: [],
      prerequisites: DEFAULT_PREREQUISITES.map((p) => ({ ...p, enabled: false })),
      enableCodeSigning: false,
      signCertPath: '',
      timestampServer: 'http://timestamp.digicert.com',
      wizardStyle: 'modern',
      languages: ['indonesian', 'english'],
      showLicensePage: true,
      licenseText: LICENSE_PRESETS.mit.text,
      welcomeHeadline: 'Selamat Datang di Pemasangan Aplikasi Saya',
      welcomeSubtitle: 'Wizard ini akan memandu Anda memasang aplikasi pada komputer Windows.',
      accentHex: '#0067C0',
    }),
  },
];
