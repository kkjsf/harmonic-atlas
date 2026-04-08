@echo off
title Harmonic Atlas — Dev Server
cd /d "%~dp0"

echo.
echo  Demarrage de Harmonic Atlas...
echo.

node --version >nul 2>&1
if %errorlevel%==0 (
    echo  Utilisation de Node.js...
    node dev-server.js
    goto end
)

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║   INSTALLATION REQUISE                                   ║
echo  ║                                                          ║
echo  ║   Node.js n'est pas installe sur ce PC.                  ║
echo  ║                                                          ║
echo  ║   1. Allez sur https://nodejs.org                        ║
echo  ║   2. Cliquez "Download Node.js (LTS)"                    ║
echo  ║   3. Installez puis relancez ce fichier                  ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:end
pause
