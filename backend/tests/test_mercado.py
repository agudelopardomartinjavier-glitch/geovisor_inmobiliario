"""Cálculos de la Fase 2 (funciones puras): tiempo en el mercado, rebajas, indicador de precio, rentabilidad y mapa de calor."""
from datetime import date

import numpy as np
import pytest

from app import mercado as m

HOY = date(2026, 10, 29)

# ---------------------------------------------------------------- tiempo en el mercado
def test_dias_publicado_hasta_hoy():
    r = m.dias_en_mercado([("2026-10-01", "borrador"), ("2026-10-09", "publicado")], HOY)
    assert r["dias"] == 20 and r["publicado_ahora"] and r["publicado_desde"] == "2026-10-09" and r["vendido_el"] is None

def test_dias_se_detienen_al_vender():
    r = m.dias_en_mercado([("2026-08-01", "publicado"), ("2026-09-10", "vendido")], HOY)
    assert r["dias"] == 40 and not r["publicado_ahora"] and r["dias_hasta_venta"] == 40 and r["vendido_el"] == "2026-09-10"

def test_dias_suman_los_tramos_si_se_despublica_y_republica():
    ev = [("2026-06-01", "publicado"), ("2026-06-11", "borrador"), ("2026-10-19", "publicado")]
    assert m.dias_en_mercado(ev, HOY)["dias"] == 10 + 10

def test_sin_publicar_son_cero_dias():
    r = m.dias_en_mercado([("2026-10-01", "borrador")], HOY)
    assert r["dias"] == 0 and r["publicado_desde"] is None

# ---------------------------------------------------------------- rebajas
def test_resumen_de_rebajas():
    serie = [dict(fecha="2026-07-01", precio=300, tipo="inicial"), dict(fecha="2026-08-01", precio=270, tipo="rebaja"),
             dict(fecha="2026-09-01", precio=285, tipo="aumento"), dict(fecha="2026-10-01", precio=240, tipo="rebaja")]
    r = m.resumen_precios(serie, HOY)
    assert r["n_cambios"] == 3 and r["n_rebajas"] == 2
    assert r["variacion_pct"] == -20.0                       # 300 -> 240
    assert r["rebaja_maxima_pct"] == 15.8                    # 285 -> 240
    assert r["dias_desde_ultimo_cambio"] == 28

def test_resumen_sin_cambios():
    r = m.resumen_precios([dict(fecha="2026-10-01", precio=100, tipo="inicial")], HOY)
    assert r["n_rebajas"] == 0 and r["variacion_pct"] == 0.0 and r["rebaja_maxima_pct"] is None
    assert m.resumen_precios([], HOY)["variacion_pct"] is None

def test_tipos_de_serie():
    assert m.tipos_de_serie([("a", 100), ("b", 90), ("c", 95), ("d", 95)]) == [(None, "inicial"), (100, "rebaja"), (90, "aumento"), (95, "aumento")]

# ---------------------------------------------------------------- precio publicado vs estimado
@pytest.mark.parametrize("precio,clase,dif", [(89, "por_debajo", -11.0), (90, "en_rango", -10.0), (100, "en_rango", 0.0), (110, "en_rango", 10.0), (111, "por_encima", 11.0)])
def test_indicador_con_tolerancia_del_10(precio, clase, dif):
    r = m.indicador_precio(precio, 100, 5, True, 10)
    assert r["clasificacion"] == clase and r["dif_pct"] == dif

def test_indicador_tolerancia_es_parametro():
    assert m.indicador_precio(115, 100, 5, True, 20)["clasificacion"] == "en_rango"
    assert m.indicador_precio(115, 100, 5, True, 5)["clasificacion"] == "por_encima"

def test_indicador_confianza():
    assert m.indicador_precio(100, 100, 5, True, 10)["confianza"] == "alta"
    assert m.indicador_precio(100, 100, 5, False, 10)["confianza"] == "media"
    assert m.indicador_precio(100, 100, 2, True, 10)["confianza"] == "baja"

def test_indicador_sin_datos():
    assert m.indicador_precio(None, 100, 5, True, 10)["clasificacion"] == "sin_dato"
    assert m.indicador_precio(100, None, 0, None, 10)["clasificacion"] == "sin_dato"

# ---------------------------------------------------------------- rentabilidad
def test_rentabilidad_es_canon_anual_sobre_valor():
    assert m.rentabilidad_pct(1_500_000, 200_000_000) == 9.0           # 18 M / 200 M
    assert m.rentabilidad_pct(2_000_000, 300_000_000) == 8.0

def test_rentabilidad_sin_datos():
    assert m.rentabilidad_pct(None, 100) is None and m.rentabilidad_pct(1000, 0) is None and m.rentabilidad_pct(0, 100) is None

def test_canon_estimado_usa_la_mediana_por_m2():
    r = m.canon_estimado([(1_000_000, 50), (1_200_000, 60), (3_000_000, 50)], 80)   # 20.000, 20.000, 60.000 $/m² -> 20.000
    assert r == {"canon": 1_600_000, "n": 3, "canon_m2": 20000}
    assert m.canon_estimado([(1_000_000, 50)], 80) is None            # pocos datos
    assert m.canon_estimado([(1_000_000, 50), (1_000_000, 50)], None) is None

def test_estadisticas():
    e = m.estadisticas([100, 200, 300, 400, 1000])
    assert e["n"] == 5 and e["mediana"] == 300 and e["minimo"] == 100 and e["maximo"] == 1000
    assert m.estadisticas([])["mediana"] is None

# ---------------------------------------------------------------- mapa de calor (IDW)
def _nube(cx, cy, valor, n=6, sep=100):
    ang = np.linspace(0, 2 * np.pi, n, endpoint=False)
    return np.c_[cx + sep * np.cos(ang), cy + sep * np.sin(ang), np.full(n, valor)]

def test_idw_pocos_datos_no_pinta():
    r = m.superficie_idw(np.array([0, 10.0]), np.array([0, 10.0]), np.array([1.0, 2.0]), 250, 1500, 2)
    assert r["celdas"] == []

def test_idw_valores_dentro_del_rango_y_no_extrapola():
    a, b = _nube(0, 0, 1_000_000), _nube(5000, 0, 3_000_000)
    p = np.vstack([a, b])
    r = m.superficie_idw(p[:, 0], p[:, 1], p[:, 2], 250, 1500, 2)
    assert r["celdas"]
    assert all(1_000_000 - 1 <= c[2] <= 3_000_000 + 1 for c in r["celdas"])
    # nada a más de 1,5 km de cualquier dato; y entre las dos nubes (2,5 km de cada una) hay un hueco sin pintar
    assert all(any(np.hypot(c[0] - px, c[1] - py) <= 1500 for px, py in p[:, :2]) for c in r["celdas"])
    assert not any(abs(c[0] - 2500) < 100 for c in r["celdas"])
    cerca_a = [c[2] for c in r["celdas"] if c[0] < 500]
    assert max(cerca_a) < 1_100_000                                    # junto a la nube barata, el valor es el barato

def test_idw_recorta_atipicos():
    p = _nube(0, 0, 1_000_000, n=19)
    v = np.append(p[:, 2], 90_000_000)                                # un dato absurdo
    x, y = np.append(p[:, 0], 50), np.append(p[:, 1], 50)
    r = m.superficie_idw(x, y, v, 250, 1500, 2, recorte_pct=5)
    assert max(c[2] for c in r["celdas"]) < 5_000_000

def test_idw_limita_el_numero_de_celdas():
    p = np.vstack([_nube(0, 0, 1e6, n=10, sep=3000), _nube(20000, 20000, 2e6, n=10, sep=3000)])
    r = m.superficie_idw(p[:, 0], p[:, 1], p[:, 2], 50, 5000, 2, max_celdas=1500)
    assert len(r["celdas"]) <= 1500 and r["celda"] > 50                # la celda crece para respetar el tope
