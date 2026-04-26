@echo off
title WAYPOINTASSISTENT PRO — AUTO GITHUB DEPLOY
color 0A
cls

echo ============================================
echo   WAYPOINTASSISTENT PRO — AUTO DEPLOY
echo ============================================
echo.

:: Check Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [FOUT] Git niet gevonden
    pause
    exit /b
)

echo [OK] Git gevonden
echo.

:: Auto user setup
git config --global user.name >nul 2>&1
if %errorlevel% neq 0 (
    echo [SETUP] Git user instellen...
    git config --global user.name "WaypointUser"
    git config --global user.email "waypoint@local.dev"
)

:: Default commit message
set msg=auto update waypointassistent

echo [1/5] Repository check...
git init >nul 2>&1

echo [2/5] Branch main...
git branch -M main >nul 2>&1

echo [3/5] Remote fix...

git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo Geen remote → toevoegen...
    git remote add origin https://github.com/zorro7777777/Waypointassistent-PRO.git
) else (
    echo Remote bestaat → resetten...
    git remote set-url origin https://github.com/zorro7777777/Waypointassistent-PRO.git
)

echo [4/5] Add files...
git add .

echo [5/5] Commit + push...
git commit -m "%msg%" >nul 2>&1
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [FOUT] Push mislukt
    echo Controleer internet / GitHub access
    pause
    exit /b
)

echo.
echo ============================================
echo   DEPLOY SUCCESVOL
echo ============================================
echo.
pause