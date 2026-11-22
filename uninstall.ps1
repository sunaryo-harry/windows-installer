# =============================================================================
# Days WinInstaller - Windows Uninstaller Script
# =============================================================================
$AppName = "Days WinInstaller"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\Days-WinInstaller"

Write-Host "Menghapus $AppName dari sistem..." -ForegroundColor Yellow

# Hapus Shortcuts
$DesktopDir = [Environment]::GetFolderPath("Desktop")
$DesktopShortcut = Join-Path $DesktopDir "$AppName.lnk"
if (Test-Path $DesktopShortcut) {
    Remove-Item -Force $DesktopShortcut
    Write-Host "Pintasan Desktop dihapus." -ForegroundColor Green
}

$StartMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Days WinInstaller"
if (Test-Path $StartMenuDir) {
    Remove-Item -Recurse -Force $StartMenuDir
    Write-Host "Pintasan Start Menu dihapus." -ForegroundColor Green
}

# Hapus Folder Instalasi
if (Test-Path $InstallDir) {
    Remove-Item -Recurse -Force $InstallDir
    Write-Host "Folder instalasi dihapus: $InstallDir" -ForegroundColor Green
}

Write-Host "$AppName telah berhasil dicopot dari Windows." -ForegroundColor Green
