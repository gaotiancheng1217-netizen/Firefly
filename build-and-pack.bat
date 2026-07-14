@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ========================================
echo  TianCheng Blog - Build and Pack
echo ========================================
echo.

if not exist "node_modules" (
  echo [ERROR] node_modules not found.
  echo Please run "pnpm install" once before using this script.
  echo.
  pause
  exit /b 1
)

set "MAX_VER=0"

for %%F in (firefly-ver*.zip) do (
  set "FILE=%%~nF"
  set "VER=!FILE:firefly-ver=!"
  for /f "delims=0123456789" %%A in ("!VER!") do set "VER="
  if defined VER (
    if !VER! GTR !MAX_VER! set "MAX_VER=!VER!"
  )
)

set /a NEXT_VER=MAX_VER+1
set "ZIP_NAME=firefly-ver%NEXT_VER%.zip"

echo Next package: %ZIP_NAME%
echo.

echo [1/6] Generating icon list...
node scripts/generate-icons.js
if errorlevel 1 goto failed

echo.
echo [2/6] Generating image placeholders...
call .\node_modules\.bin\tsx.CMD scripts/generate-lqips.ts
if errorlevel 1 goto failed

echo.
echo [3/6] Building static site...
call .\node_modules\.bin\astro.CMD build
if errorlevel 1 goto failed

echo.
echo [4/6] Processing font subsets...
call .\node_modules\.bin\tsx.CMD scripts/subset-fonts.ts
if errorlevel 1 goto failed

echo.
echo [5/6] Building search index...
call .\node_modules\.bin\pagefind.CMD --site dist
if errorlevel 1 goto failed

echo.
echo [6/6] Creating zip package...
set "PACK_TMP=%TEMP%\tiancheng-blog-pack-%RANDOM%%RANDOM%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $src = Resolve-Path '.\dist'; $tmp = $env:PACK_TMP; if (Test-Path $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force }; New-Item -ItemType Directory -Force -Path $tmp | Out-Null; Copy-Item -Path (Join-Path $src '*') -Destination $tmp -Recurse -Force; $ost = Join-Path $tmp 'assets\music\魔法使之夜OST'; if (Test-Path $ost) { Remove-Item -LiteralPath $ost -Recurse -Force }; Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath '.\%ZIP_NAME%' -Force; Remove-Item -LiteralPath $tmp -Recurse -Force"
if errorlevel 1 goto failed

echo.
echo ========================================
echo  Done!
echo  Package created: %ZIP_NAME%
echo ========================================
echo.
pause
exit /b 0

:failed
echo.
echo ========================================
echo  Build failed. Please check the message above.
echo ========================================
echo.
pause
exit /b 1
