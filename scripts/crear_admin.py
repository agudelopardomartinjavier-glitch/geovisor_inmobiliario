"""Crea o cambia la clave de un administrador en data/db/admin.sqlite. La clave se pide por teclado (no queda en historial).
Uso:  backend\.venv\Scripts\python.exe scripts\crear_admin.py [usuario]"""
import getpass, os, sqlite3, sys
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE, "backend"))
from app.admin.auth import hash_password  # noqa: E402

usuario = (sys.argv[1] if len(sys.argv) > 1 else input("Usuario: ")).strip()
if not usuario:
    sys.exit("Falta el usuario")
clave = getpass.getpass("Clave nueva (mínimo 10 caracteres): ")
if len(clave) < 10 or clave != getpass.getpass("Repite la clave: "):
    sys.exit("La clave es muy corta o no coincide. No se guardó nada.")
con = sqlite3.connect(os.path.join(BASE, "data", "db", "admin.sqlite"))
con.execute("INSERT INTO admin_usuarios (usuario, clave_hash) VALUES (?, ?) ON CONFLICT(usuario) DO UPDATE SET clave_hash = excluded.clave_hash",
            (usuario, hash_password(clave)))
con.commit()
print(f"Listo: usuario '{usuario}' guardado.")
