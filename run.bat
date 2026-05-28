@echo off
echo ===================================================
echo               CineMatch Startup Script
echo ===================================================
echo.

cd %~dp0

:: Check if Python virtual environment exists
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo Error: Python is not installed or not in PATH.
        pause
        exit /b
    )
)

:: Activate virtual environment and install requirements
echo Installing/Verifying requirements...
call .venv\Scripts\activate.bat
pip install -r requirements.txt
if errorlevel 1 (
    echo Error installing dependencies.
    pause
    exit /b
)

:: Preprocess data if it doesn't exist
if not exist data\movies_metadata.json (
    echo.
    echo Preprocessing datasets... This might take a few moments...
    python backend\process_data.py
    if errorlevel 1 (
        echo Error preprocessing datasets. Make sure CSV files are present.
        pause
        exit /b
    )
)

echo.
echo Starting Flask backend server...
echo The web app will be available at: http://127.0.0.1:5000
echo.
python backend\app.py

pause
