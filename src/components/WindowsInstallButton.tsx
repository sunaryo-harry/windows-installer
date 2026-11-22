import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  MonitorDown,
  Terminal,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { downloadTextFile } from '../utils/scriptGenerators';

interface WindowsInstallButtonProps {
  onNotify: (message: string) => void;
}

function buildWindowsSelfInstallerPs1(appUrl: string): string {
  return `# =============================================================================
# Installer Aplikasi Desktop Windows — Days WinInstaller
# Menambahkan Days WinInstaller ke Start Menu & Desktop Windows 10/11
# Jalankan dengan klik kanan -> "Run with PowerShell"
# =============================================================================
$ErrorActionPreference = "Stop"

$AppName = "Days WinInstaller"
$AppUrl = "${appUrl}"

# Cari Microsoft Edge atau Google Chrome untuk menjalankan mode jendela desktop mandiri
$BrowserPaths = @(
  "$env:ProgramFiles (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe",
  "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe",
  "$env:ProgramFiles (x86)\\Google\\Chrome\\Application\\chrome.exe"
)

$Browser = $BrowserPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Browser) {
  Write-Error "Microsoft Edge atau Google Chrome tidak ditemukan pada sistem ini."
  exit 1
}

$Shell = New-Object -ComObject WScript.Shell
$DesktopDir = [Environment]::GetFolderPath("Desktop")
$StartMenuDir = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs\\Days WinInstaller"
New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null

foreach ($TargetPath in @(
  (Join-Path $DesktopDir "$AppName.lnk"),
  (Join-Path $StartMenuDir "$AppName.lnk")
)) {
  $Shortcut = $Shell.CreateShortcut($TargetPath)
  $Shortcut.TargetPath = $Browser
  $Shortcut.Arguments = "--app=$AppUrl"
  $Shortcut.Description = "Days WinInstaller — Pembuat Windows Installer"
  $Shortcut.IconLocation = "$Browser,0"
  $Shortcut.Save()
}

Write-Host "$AppName berhasil dipasang ke Desktop dan Start Menu Windows!" -ForegroundColor Green
Start-Process -FilePath $Browser -ArgumentList "--app=$AppUrl"
`;
}

function buildWindowsSelfInnoScript(appUrl: string): string {
  return `; =============================================================================
; Inno Setup 6 Script — Days WinInstaller Desktop Launcher (.exe)
; Kompilasi dengan: iscc DaysWinInstaller-Setup.iss
; =============================================================================
[Setup]
AppId={{D4A15B72-8C90-4F2E-9B11-7E4A6D2C9F01}
AppName=Days WinInstaller
AppVersion=1.0.0
AppPublisher=Days WinInstaller
DefaultDirName={localappdata}\\Days WinInstaller
DefaultGroupName=Days WinInstaller
OutputDir=dist
OutputBaseFilename=DaysWinInstaller-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest

[Languages]
Name: "indonesian"; MessagesFile: "compiler:Languages\\Indonesian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Icons]
Name: "{group}\\Days WinInstaller"; Filename: "{pf32}\\Microsoft\\Edge\\Application\\msedge.exe"; Parameters: "--app=${appUrl}"
Name: "{autodesktop}\\Days WinInstaller"; Filename: "{pf32}\\Microsoft\\Edge\\Application\\msedge.exe"; Parameters: "--app=${appUrl}"; Tasks: desktopicon

[Run]
Filename: "{pf32}\\Microsoft\\Edge\\Application\\msedge.exe"; Parameters: "--app=${appUrl}"; Description: "Jalankan Days WinInstaller"; Flags: nowait postinstall skipifsilent
`;
}

export const WindowsInstallButton: React.FC<WindowsInstallButtonProps> = ({
  onNotify,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  const currentOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://days-wininstaller.app';

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        onNotify('Days WinInstaller berhasil dipasang sebagai aplikasi desktop.');
        return;
      }
    }
    setModalOpen(true);
  };

  const handleDownloadPs1 = () => {
    downloadTextFile(
      'Install-DaysWinInstaller.ps1',
      buildWindowsSelfInstallerPs1(currentOrigin)
    );
    onNotify('Mengunduh Install-DaysWinInstaller.ps1 untuk pemasangan cepat Windows.');
  };

  const handleDownloadSelfIss = () => {
    downloadTextFile(
      'DaysWinInstaller-Setup.iss',
      buildWindowsSelfInnoScript(currentOrigin)
    );
    onNotify('Mengunduh DaysWinInstaller-Setup.iss (Inno Setup).');
  };

  return (
    <>
      {isInstalled ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300">
          <span className="inline-flex items-center gap-1.5 font-medium truncate">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Terpasang di Desktop
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-[#0067C0] hover:bg-[#0057A3] text-white rounded-lg transition-colors whitespace-nowrap"
        >
          <MonitorDown className="w-3.5 h-3.5 shrink-0" />
          Pasang di Windows
        </button>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="w-full max-w-lg bg-white dark:bg-[#141C2B] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Pasang Days WinInstaller di Windows
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Jalankan Days WinInstaller sebagai aplikasi desktop mandiri dengan dukungan offline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup dialog pemasangan"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Method 1: Native Windows PWA */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  1. Instalasi Langsung via Microsoft Edge / Google Chrome
                </div>
                {isIOS ? (
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Pada Safari iOS/iPadOS: ketuk tombol <strong>Bagikan (Share)</strong> di bilah Safari, lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                  </p>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Buka Days WinInstaller di tab penuh Microsoft Edge atau Google Chrome pada Windows 10/11, lalu klik ikon <strong>Instal Aplikasi</strong> di kanan bilah alamat (atau menu <strong>Aplikasi &gt; Instal Days WinInstaller</strong>). Aplikasi akan langsung muncul di Start Menu, Taskbar, dan bekerja secara offline.
                  </p>
                )}
                {isInstallable && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) {
                        setModalOpen(false);
                        onNotify('Days WinInstaller berhasil dipasang di perangkat Anda.');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0067C0] hover:bg-[#0057A3] text-white rounded-lg transition-colors"
                  >
                    <MonitorDown className="w-3.5 h-3.5" />
                    Pasang Sekarang
                  </button>
                )}
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              {/* Method 2: Native Windows PowerShell & Inno Setup Scripts */}
              <div className="space-y-2.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  2. Skrip Pemasangan Desktop Windows (`.ps1` &amp; `.iss`)
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Unduh skrip PowerShell untuk membuat pintasan Start Menu &amp; Desktop Windows secara otomatis, atau unduh skrip Inno Setup untuk mengompilasi berkas <span className="font-mono text-slate-800 dark:text-slate-200">DaysWinInstaller-Setup.exe</span>.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadPs1}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Unduh Install-DaysWinInstaller.ps1
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSelfIss}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white dark:bg-[#0D131F] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh DaysWinInstaller-Setup.iss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 text-white text-xs font-medium shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      Mode Offline — Menggunakan cache lokal
    </div>
  );
};
