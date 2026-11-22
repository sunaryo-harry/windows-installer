@echo off
title Days WinInstaller - Windows Installer Setup
setlocal enabledelayedexpansion

echo ===================================================================
echo             DAYS WININSTALLER - INSTALLER WINDOWS
echo ===================================================================
echo Mengunduh dan menjalankan instalasi dari GitHub...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/sunaryo-harry/windows-installer/main/install.ps1 | iex"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Terjadi kesalahan saat instalasi.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Selesai!
exit /b 0
