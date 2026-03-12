@echo off
title Harmonic Atlas — Dev Server
cd /d "%~dp0"

echo.
echo  Demarrage de Harmonic Atlas...
echo.

:: Try python3 first (Microsoft Store / some installs)
python3 --version >nul 2>&1
if %errorlevel%==0 (
    echo  Utilisation de Python 3...
    python3 dev-server.py
    goto end
)

:: Try python (most common on Windows)
python --version >nul 2>&1
if %errorlevel%==0 (
    echo  Utilisation de Python...
    python dev-server.py
    goto end
)

:: Try node as fallback
node --version >nul 2>&1
if %errorlevel%==0 (
    echo  Utilisation de Node.js...
    node dev-server.js
    goto end
)

:: Nothing found — guide the user
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║   INSTALLATION REQUISE                                   ║
echo  ║                                                          ║
echo  ║   Python n'est pas installe sur ce PC.                   ║
echo  ║                                                          ║
echo  ║   1. Allez sur https://www.python.org/downloads/         ║
echo  ║   2. Cliquez "Download Python 3.x.x"                     ║
echo  ║   3. IMPORTANT : cochez "Add Python to PATH"             ║
echo  ║      lors de l'installation !                            ║
echo  ║   4. Relancez ce fichier apres l'installation            ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:end
pause
