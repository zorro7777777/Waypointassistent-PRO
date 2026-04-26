@echo off

:: Zorg dat de server ALTIJD start in de map van dit bestand
cd /d "%~dp0"

title WaypointAssistent PRO — Lokale Server
color 0A
cls

echo ============================================
echo   WAYPOINTASSISTENT PRO V4.8
echo   Lokale server opstarten...
echo ============================================
echo.

echo [INFO] Werkmap:
cd
echo.

:: Controleer of Python beschikbaar is
python --version >nul 2>&1
if %errorlevel% == 0 (
echo [OK] Python gevonden.
echo.
echo Server gestart op: http://localhost:8080
echo Druk CTRL+C om te stoppen.
echo.
start "" http://localhost:8080/index.html
python -m http.server 8080
goto :einde
)

:: Controleer of Python3 beschikbaar is
python3 --version >nul 2>&1
if %errorlevel% == 0 (
echo [OK] Python3 gevonden.
echo.
echo Server gestart op: http://localhost:8080
echo Druk CTRL+C om te stoppen.
echo.
start "" http://localhost:8080/index.html
python3 -m http.server 8080
goto :einde
)

:: Controleer of Node/npx beschikbaar is
npx --version >nul 2>&1
if %errorlevel% == 0 (
echo [OK] Node.js gevonden.
echo.
echo Server gestart op: http://localhost:3000
echo Druk CTRL+C om te stoppen.
echo.
start "" http://localhost:3000/index.html
npx serve . -l 3000
goto :einde
)

:: Niets gevonden
echo [FOUT] Geen geschikte server gevonden op dit systeem.
echo.
echo Installeer een van de volgende opties:
echo.
echo   1. Python  -> https://www.python.org/downloads/
echo      (vink "Add to PATH" aan tijdens installatie)
echo.
echo   2. Node.js -> https://nodejs.org/
echo.
pause

:einde
pause
