@echo off
rem Visor React en http://localhost:5173  (usa el Node portable de tools\node)
cd /d "%~dp0frontend"
set PATH=%~dp0tools\node;%PATH%
npm run dev
