@echo off
title Amigo AI - Stopping
color 0C
echo.
echo  ============================================
echo        AMIGO AI - Shutting Down
echo  ============================================
echo.

echo  Stopping backend...
taskkill /FI "WINDOWTITLE eq Amigo - Backend*" /F >nul 2>&1

echo  Stopping frontend...
taskkill /FI "WINDOWTITLE eq Amigo - Frontend*" /F >nul 2>&1

echo  Killing uvicorn...
taskkill /IM "uvicorn.exe" /F >nul 2>&1

echo  Killing node...
taskkill /IM "node.exe" /F >nul 2>&1

echo.
echo  ============================================
echo   Amigo AI stopped successfully.
echo  ============================================
echo.
pause