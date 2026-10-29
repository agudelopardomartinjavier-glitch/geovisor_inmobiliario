"""Migraciones versionadas y reversibles de las dos bases (SQLite plano, sin GDAL).

    python scripts/migrar.py estado                       # qué hay aplicado y pendiente
    python scripts/migrar.py subir [--destino admin|publico] [--hasta N]
    python scripts/migrar.py bajar [--destino admin|publico] [--pasos 1]

Archivos: db/migraciones/<destino>/NNN_nombre.up.sql y NNN_nombre.down.sql. Cada una corre en una sola
transacción. Antes de tocar admin.sqlite se hace una copia en data/db/respaldos/. Las migraciones solo agregan
tablas/columnas: no borran datos existentes; las .down solo quitan lo que agregó su .up."""
import argparse, os, re, sqlite3, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db_comun import ADMIN, BASE, DB_DIR, PUBLICO

RUTAS = {"admin": ADMIN, "publico": PUBLICO}
DIR_MIG = os.path.join(BASE, "db", "migraciones")
DIR_RESP = os.path.join(DB_DIR, "respaldos")
_PATRON = re.compile(r"^(\d{3})_(.+)\.up\.sql$")

def disponibles(destino: str) -> list[tuple[int, str]]:
    d = os.path.join(DIR_MIG, destino)
    out = []
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        m = _PATRON.match(f)
        if m:
            out.append((int(m.group(1)), m.group(2)))
    return out

def _archivo(destino: str, version: int, nombre: str, sentido: str) -> str:
    return os.path.join(DIR_MIG, destino, f"{version:03d}_{nombre}.{sentido}.sql")

def aplicadas(con: sqlite3.Connection) -> list[int]:
    con.execute("CREATE TABLE IF NOT EXISTS schema_migraciones (version INTEGER PRIMARY KEY, nombre TEXT NOT NULL, "
                "aplicada_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')))")
    con.commit()
    return [r[0] for r in con.execute("SELECT version FROM schema_migraciones ORDER BY version")]

def respaldar(ruta: str, etiqueta: str) -> str | None:
    """Copia consistente (API de backup de SQLite) antes de migrar."""
    if not os.path.exists(ruta):
        return None
    os.makedirs(DIR_RESP, exist_ok=True)
    dest = os.path.join(DIR_RESP, f"{os.path.splitext(os.path.basename(ruta))[0]}_{etiqueta}_{time.strftime('%Y%m%d_%H%M%S')}.sqlite")
    src, dst = sqlite3.connect(ruta), sqlite3.connect(dest)
    with dst:
        src.backup(dst)
    src.close(); dst.close()
    return dest

def _ejecutar(con: sqlite3.Connection, sql: str, extra: str):
    con.executescript(f"BEGIN;\n{sql}\n{extra}\nCOMMIT;")

def subir(destino: str, hasta: int | None = None, ruta: str | None = None, hacer_respaldo: bool = True) -> list[int]:
    ruta = ruta or RUTAS[destino]
    con = sqlite3.connect(ruta)
    hechas = set(aplicadas(con))
    pend = [(v, n) for v, n in disponibles(destino) if v not in hechas and (hasta is None or v <= hasta)]
    if pend and destino == "admin" and hacer_respaldo:
        r = respaldar(ruta, f"antes_mig{pend[0][0]:03d}")
        if r:
            print("  respaldo:", os.path.relpath(r, BASE))
    nuevas = []
    for v, n in pend:
        sql = open(_archivo(destino, v, n, "up"), encoding="utf8").read()
        try:
            _ejecutar(con, sql, f"INSERT INTO schema_migraciones (version, nombre) VALUES ({v}, '{n}');")
        except Exception:
            con.rollback()
            raise
        nuevas.append(v); print(f"  [{destino}] subida {v:03d}_{n}")
    con.close()
    return nuevas

def bajar(destino: str, pasos: int = 1, ruta: str | None = None, hacer_respaldo: bool = True) -> list[int]:
    ruta = ruta or RUTAS[destino]
    con = sqlite3.connect(ruta)
    hechas = aplicadas(con)
    nombres = dict(disponibles(destino))
    objetivo = list(reversed(hechas))[:pasos]
    if objetivo and destino == "admin" and hacer_respaldo:
        r = respaldar(ruta, f"antes_bajar{objetivo[0]:03d}")
        if r:
            print("  respaldo:", os.path.relpath(r, BASE))
    quitadas = []
    for v in objetivo:
        sql = open(_archivo(destino, v, nombres[v], "down"), encoding="utf8").read()
        try:
            _ejecutar(con, sql, f"DELETE FROM schema_migraciones WHERE version = {v};")
        except Exception:
            con.rollback()
            raise
        quitadas.append(v); print(f"  [{destino}] revertida {v:03d}_{nombres[v]}")
    con.close()
    return quitadas

def estado():
    for destino, ruta in RUTAS.items():
        if not os.path.exists(ruta):
            print(f"{destino}: (no existe {os.path.relpath(ruta, BASE)})"); continue
        con = sqlite3.connect(ruta); hechas = set(aplicadas(con)); con.close()
        print(f"{destino}:")
        for v, n in disponibles(destino):
            print(f"  {v:03d}_{n:<32} {'aplicada' if v in hechas else 'PENDIENTE'}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("accion", choices=["estado", "subir", "bajar"])
    ap.add_argument("--destino", choices=list(RUTAS))
    ap.add_argument("--hasta", type=int)
    ap.add_argument("--pasos", type=int, default=1)
    a = ap.parse_args()
    if a.accion == "estado":
        estado()
    else:
        for d in ([a.destino] if a.destino else list(RUTAS)):
            (subir(d, a.hasta) if a.accion == "subir" else bajar(d, a.pasos))
