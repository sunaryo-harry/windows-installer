# =============================================================================
# Days WinInstaller - Windows Installer Script
# Repository: https://github.com/sunaryo-harry/windows-installer
# Jalankan langsung via PowerShell:
# irm https://raw.githubusercontent.com/sunaryo-harry/windows-installer/main/install.ps1 | iex
# =============================================================================

$ErrorActionPreference = "Stop"

function Write-Banner {
    Clear-Host
    Write-Host "===================================================================" -ForegroundColor Cyan
    Write-Host "             DAYS WININSTALLER - INSTALLER WINDOWS                " -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host "   Pembuat Skrip Inno Setup (.iss), NSIS (.nsi) & WiX (.wxs)      " -ForegroundColor Gray
    Write-Host "===================================================================" -ForegroundColor Cyan
    Write-Host ""
}

Write-Banner

$AppName = "Days WinInstaller"
$RepoUrl = "https://github.com/sunaryo-harry/windows-installer.git"
$ZipUrl  = "https://github.com/sunaryo-harry/windows-installer/archive/refs/heads/main.zip"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\Days-WinInstaller"

Write-Host "[1/6] Memeriksa Direktori Instalasi..." -ForegroundColor Yellow
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Write-Host "  -> Direktori dibuat: $InstallDir" -ForegroundColor Green
} else {
    Write-Host "  -> Direktori instalasi: $InstallDir" -ForegroundColor Gray
}

# -----------------------------------------------------------------------------
# 2. Cek / Install Node.js
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/6] Memeriksa Prasyarat Runtime (Node.js)..." -ForegroundColor Yellow

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
    Write-Host "  [!] Node.js belum terpasang." -ForegroundColor Yellow
    Write-Host "  [+] Mencoba memasang Node.js LTS secara otomatis via winget..." -ForegroundColor Cyan
    
    $WingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if ($WingetCmd) {
        try {
            winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements --silent
            Write-Host "  -> Node.js berhasil dipasang!" -ForegroundColor Green
            # Muat ulang PATH sesi saat ini
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        } catch {
            Write-Warning "Pemasangan otomatis via winget gagal: $_"
        }
    }

    $NodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $NodeCmd) {
        Write-Error "Gagal mendeteksi Node.js. Silakan unduh dan pasang Node.js manual dari: https://nodejs.org lalu jalankan ulang perintah ini."
        exit 1
    }
} else {
    $NodeVersion = (& node -v)
    Write-Host "  -> Node.js terdeteksi ($NodeVersion)" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# 3. Mengambil Sumber Kode (Git Clone atau Download ZIP)
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/6] Mengunduh Sumber Berkas dari GitHub..." -ForegroundColor Yellow

$GitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($GitCmd) {
    if (Test-Path (Join-Path $InstallDir ".git")) {
        Write-Host "  -> Memperbarui repository yang ada..." -ForegroundColor Cyan
        Push-Location $InstallDir
        try {
            git fetch origin main
            git reset --hard origin/main
            Write-Host "  -> Kode sumber berhasil diperbarui." -ForegroundColor Green
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "  -> Melakukan git clone dari $RepoUrl..." -ForegroundColor Cyan
        git clone $RepoUrl $InstallDir
    }
} else {
    Write-Host "  -> Git tidak terdeteksi, mengunduh arsip ZIP..." -ForegroundColor Cyan
    $TempZip = Join-Path $env:TEMP "windows-installer-main.zip"
    Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing
    
    $TempExtract = Join-Path $env:TEMP "windows-installer-extracted"
    if (Test-Path $TempExtract) { Remove-Item -Recurse -Force $TempExtract }
    Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force
    
    $ExtractedFolder = Join-Path $TempExtract "windows-installer-main"
    Copy-Item -Path "$ExtractedFolder\*" -Destination $InstallDir -Recurse -Force
    Remove-Item -Force $TempZip
    Remove-Item -Recurse -Force $TempExtract
    Write-Host "  -> Berkas berhasil diekstrak." -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# 4. Memasang Dependensi & Build Proyek
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/6] Memasang Dependensi & Membangun Aplikasi..." -ForegroundColor Yellow
Push-Location $InstallDir
try {
    if (Get-Command bun -ErrorAction SilentlyContinue) {
        Write-Host "  -> Menggunakan Bun package manager..." -ForegroundColor Cyan
        bun install
        bun run build
    } else {
        Write-Host "  -> Menggunakan NPM package manager..." -ForegroundColor Cyan
        npm install --no-audit --no-fund
        npm run build
    }
    Write-Host "  -> Build selesai dengan sukses!" -ForegroundColor Green
} finally {
    Pop-Location
}

# -----------------------------------------------------------------------------
# 5. Membuat Skrip Peluncur & Pintasan Windows
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[5/6] Membuat Peluncur Desktop & Start Menu..." -ForegroundColor Yellow

# Skrip runner VBScript agar jendela konsol tidak muncul saat aplikasi diluncurkan
$VbsLauncherPath = Join-Path $InstallDir "launch.vbs"
$BatLauncherPath = Join-Path $InstallDir "launch.bat"

# File batch peluncur
$BatContent = @"
@echo off
cd /d "$InstallDir"
start "" /b npx --yes serve -s dist -l 3456
timeout /t 2 /nobreak >nul
start msedge --app=http://localhost:3456 || start chrome --app=http://localhost:3456 || start http://localhost:3456
"@
Set-Content -Path $BatLauncherPath -Value $BatContent -Encoding ASCII

# VBScript untuk silent background execution
$VbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "$BatLauncherPath" & chr(34), 0
Set WshShell = Nothing
"@
Set-Content -Path $VbsLauncherPath -Value $VbsContent -Encoding ASCII

# Cari icon aplikasi jika ada
$IconPath = Join-Path $InstallDir "public\icon.svg"

# Buat shortcut di Desktop dan Start Menu
$Shell = New-Object -ComObject WScript.Shell
$DesktopDir = [Environment]::GetFolderPath("Desktop")
$StartMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Days WinInstaller"
if (-not (Test-Path $StartMenuDir)) {
    New-Item -ItemType Directory -Path $StartMenuDir -Force | Out-Null
}

$Shortcuts = @(
    (Join-Path $DesktopDir "$AppName.lnk"),
    (Join-Path $StartMenuDir "$AppName.lnk")
)

foreach ($LnkPath in $Shortcuts) {
    $Shortcut = $Shell.CreateShortcut($LnkPath)
    $Shortcut.TargetPath = "wscript.exe"
    $Shortcut.Arguments = "`"$VbsLauncherPath`""
    $Shortcut.WorkingDirectory = $InstallDir
    $Shortcut.Description = "Days WinInstaller - Pembuat Windows Installer (.iss, .nsi, .wxs)"
    $Shortcut.Save()
}
Write-Host "  -> Pintasan berhasil ditambahkan ke Desktop dan Start Menu!" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 6. Selesai & Luncurkan
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "===================================================================" -ForegroundColor Green
Write-Host "           PEMASANGAN DAYS WININSTALLER TELAH BERHASIL!            " -ForegroundColor White -BackgroundColor DarkGreen
Write-Host "===================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Lokasi Aplikasi : $InstallDir" -ForegroundColor Gray
Write-Host "Pintasan        : Desktop & Start Menu ($AppName)" -ForegroundColor Gray
Write-Host ""

$PromptLaunch = Read-Host "Apakah Anda ingin meluncurkan Days WinInstaller sekarang? (Y/n)"
if ($PromptLaunch -ne 'n' -and $PromptLaunch -ne 'N') {
    Write-Host "Meluncurkan $AppName..." -ForegroundColor Cyan
    Start-Process "wscript.exe" -ArgumentList "`"$VbsLauncherPath`""
}
