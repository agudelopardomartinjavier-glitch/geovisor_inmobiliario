"""Parámetros configurables (tabla `parametros` de admin.sqlite). El código solo trae valores de reserva por si falta la fila."""
import sqlite3

# Valores de reserva: la fuente de verdad es la tabla. # CONFIRMAR los marcados en la migración 002.
RESERVA: dict[str, str] = {
    "semaforo.umbral_rojo_pct": "50",
    "semaforo.umbral_amarillo_pct": "5",
    "soportes.dias_alerta_vencimiento": "30",
    "soportes.vigencia_certificado_tradicion_dias": "30",
    "soportes.max_mb": "15",
    "valoracion.tolerancia_pct": "10",
    "mercado.celda_m": "250",
    "mercado.radio_influencia_m": "1500",
    "mercado.min_vecinos": "2",
    "mercado.recorte_percentil": "5",
}

def todos(con: sqlite3.Connection) -> dict[str, str]:
    p = dict(RESERVA)
    try:
        p.update({r[0]: r[1] for r in con.execute("SELECT clave, valor FROM parametros")})
    except sqlite3.OperationalError:   # migración 002 aún sin aplicar
        pass
    return p

def numero(p: dict[str, str], clave: str) -> float:
    return float(p[clave])
