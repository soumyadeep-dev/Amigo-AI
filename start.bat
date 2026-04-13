@echo off
title Amigo AI - Startup
color 0A
echo.
echo  ============================================
echo        AMIGO AI - Starting Up
echo  ============================================
echo.

:: ── Check Python ─────────────────────────────
echo  [1/6] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [MISSING] Python is not installed.
    echo  Please install Python from https://python.org
    echo  Make sure to check "Add Python to PATH" during install.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo  [OK] %%i


:: ── Check pip ────────────────────────────────
echo  [2/6] Checking pip...
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [MISSING] pip is not installed. Trying to install...
    python -m ensurepip --upgrade
    if %errorlevel% neq 0 (
        echo  [ERROR] Could not install pip. Please reinstall Python.
        pause
        exit /b 1
    )
)
echo  [OK] pip found


:: ── Check Python dependencies ─────────────────
echo  [3/6] Checking Python dependencies...

set MISSING_PY=0

python -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALLING] fastapi...
    pip install fastapi --quiet
    set MISSING_PY=1
)

python -c "import uvicorn" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALLING] uvicorn...
    pip install uvicorn --quiet
    set MISSING_PY=1
)

python -c "import ollama" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALLING] ollama...
    pip install ollama --quiet
    set MISSING_PY=1
)

python -c "import pandas" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALLING] pandas...
    pip install pandas --quiet
    set MISSING_PY=1
)

python -c "import pptx" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALLING] python-pptx...
    pip install python-pptx --quiet
    set MISSING_PY=1
)

python -c "import PyPDF2" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALLING] PyPDF2...
    pip install PyPDF2 --quiet
    set MISSING_PY=1
)

python -c "import openpyxl" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALLING] openpyxl...
    pip install openpyxl --quiet
    set MISSING_PY=1
)

python -c "import multipart" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALLING] python-multipart...
    pip install python-multipart --quiet
    set MISSING_PY=1
)

if %MISSING_PY%==0 (
    echo  [OK] All Python dependencies installed
) else (
    echo  [OK] Missing dependencies installed successfully
)


:: ── Check Node.js ────────────────────────────
echo  [4/6] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [MISSING] Node.js is not installed.
    echo  Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do echo  [OK] Node.js %%i

:: Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [WARNING] npm not found in PATH but continuing...
) else (
    echo  [OK] npm found
)


:: ── Check frontend node_modules ───────────────
echo  [5/6] Checking frontend dependencies...
if not exist "D:\AI SAAS\frontend\node_modules" (
    echo  [INSTALLING] Frontend packages, please wait...
    cd /d "D:\AI SAAS\frontend"
    npm install --silent
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo  [OK] Frontend packages installed
) else (
    echo  [OK] Frontend packages already installed
)


:: ── Check Ollama ─────────────────────────────
echo  [6/6] Checking Ollama...
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [MISSING] Ollama is not installed.
    echo  Please install Ollama from https://ollama.com
    echo  Then run: ollama pull llama3.2:3b
    echo.
    echo  Continuing without Ollama - AI features will not work.
    echo.
) else (
    echo  [OK] Ollama found
)


:: ── All checks passed — Start everything ──────
echo.
echo  ============================================
echo   All checks passed. Starting Amigo AI...
echo  ============================================
echo.

:: Ollama runs automatically on Windows - no need to start manually
echo  [OK] Ollama already running

:: Start FastAPI backend
echo  Starting backend...
start "Amigo - Backend" /min cmd /k "cd /d "%~dp0" && uvicorn main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak > nul

:: Start React frontend
echo  Starting frontend...
start "Amigo - Frontend" /min cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 /nobreak > nul

:: Open browser
echo  Opening Amigo AI...
start http://localhost:5173

echo.
echo  ============================================
echo   Amigo AI is running at localhost:5173
echo   Close the terminal windows to stop.
echo  ============================================
echo.
pause
