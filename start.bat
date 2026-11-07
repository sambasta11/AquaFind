@echo off
title AquaFind
cd /d "%~dp0backend"
echo Node version:
node -v || (echo Node.js was not found. Install the LTS version from https://nodejs.org then run this again. & pause & exit /b 1)
if not exist .env if "%DATABASE_URL%"=="" (
  echo.
  echo AquaFind now stores its data in Supabase. Copy ..\.env.example to backend\.env and put your Supabase connection string in DATABASE_URL.
  echo See DEPLOY.md, section "Set up Supabase".
  pause & exit /b 1
)
if not exist node_modules call npm install
start "" http://localhost:3000
call npm start
pause
