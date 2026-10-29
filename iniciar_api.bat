@echo off
rem API FastAPI en http://localhost:8000  (documentación: /docs)
cd /d "%~dp0"
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000 --reload --reload-dir backend
