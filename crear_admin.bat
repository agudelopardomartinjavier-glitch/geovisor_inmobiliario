@echo off
rem Crea o cambia la clave del administrador (se pide por teclado)
cd /d "%~dp0"
backend\.venv\Scripts\python.exe scripts\crear_admin.py %1
pause
