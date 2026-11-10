@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CS2 Lobby Inviter 2.0
where node >nul 2>nul
if errorlevel 1 (
  echo Nie znaleziono Node.js. Zainstaluj Node.js 20 LTS lub nowszy.
  pause
  exit /b 1
)
if not exist node_modules\@node-3d\steam-api\package.json (
  echo Instalowanie wymaganej biblioteki Steamworks...
  call npm install
  if errorlevel 1 (
    echo Instalacja nie powiodla sie.
    pause
    exit /b 1
  )
)
node invite-lobby.js
echo.
pause
