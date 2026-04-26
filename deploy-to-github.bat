@echo off
title WAYPOINTASSISTENT PRO — GITHUB DEPLOY (FIXED)
color 0A
cls

echo ============================================
echo   WAYPOINTASSISTENT PRO — GITHUB DEPLOY
echo ============================================
echo.

:: Check Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FOUT] Git is niet geinstalleerd!
    pause
    exit /b
)

echo [OK] Git gevonden
echo.

:: User identity check
git config user.name >nul 2>&1
if %errorlevel% neq 0 (
    echo [SETUP] Git user niet gevonden - instellen...
    git config --global user.name "WaypointUser"
    git config --global user.email "user@waypoint.local"
)

:: Commit message
set /p msg=Commit message (Enter = auto): 
if "%msg%"=="" set msg=update waypointassistent

echo.
echo [1/6] Repository initialiseren...
git init

echo.
echo [2/6] Branch instellen...
git branch -M main

echo.
echo [3/6] Remote controleren...

git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo Geen remote gevonden.
    set /p repo=Plak GitHub repo URL: 
    git remote add origin %repo%
) else (
    echo Remote bestaat al - overslaan
)

echo.
echo [4/6] Bestanden toevoegen...
git add .

echo.
echo [5/6] Commit maken...
git commit -m "%msg%"

echo.
echo [6/6] Push naar GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [FOUT] Push mislukt!
    echo Controleer:
    echo - GitHub repo bestaat
    echo - Internet verbinding
    echo - juiste URL
    pause
    exit /b
)

echo.
echo ============================================
echo  DEPLOY SUCCESVOL!
echo ============================================
pause