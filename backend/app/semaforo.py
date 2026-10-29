"""Reglas del semáforo de riesgo jurídico-ambiental. FUNCIONES PURAS: reciben datos ya medidos y devuelven color + hallazgos.

El cruce espacial (porcentaje del predio dentro de cada capa) lo hace app/semaforo_espacial.py; el texto completo de las
reglas está en docs/SEMAFORO.md. Si cambia una regla, sube REGLAS_VERSION y actualiza ese documento.

Color final = el peor nivel de cualquier hallazgo (rojo > amarillo > verde).
Público: solo color + resumen genérico por categorías (nunca el motivo exacto: 'embargo', 'litigio', etc.)."""
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

REGLAS_VERSION = "1.0"

VERDE, AMARILLO, ROJO = "verde", "amarillo", "rojo"
_ORDEN = {VERDE: 0, AMARILLO: 1, ROJO: 2}
CATEGORIAS = {"juridico": "aspectos jurídicos", "ambiental": "afectaciones ambientales o de amenaza", "normativo": "uso del suelo"}

# Usos del suelo (POT de Acacías) que restringen construir o cambiar de uso; # CONFIRMAR con un asesor urbanístico
USOS_PROTECCION = {"AAPP", "APSH", "APNS", "AME"}
# uso dominante -> tipos de inmueble cuya compatibilidad hay que verificar   # CONFIRMAR con un asesor urbanístico
USO_A_TIPOS_A_VERIFICAR: dict[str, set[str]] = {
    "AAPP": {"casa", "local", "apartamento", "lote"},
    "APSH": {"casa", "local", "apartamento", "lote"},
    "APNS": {"casa", "local", "apartamento", "lote", "finca"},
    "AME":  {"casa", "local", "apartamento", "lote"},
    "AAM":  {"casa", "apartamento", "local"},          # actividad minera
    "AAI1": {"casa", "apartamento"},                   # industrial
    "AAD1": {"casa", "apartamento", "local", "lote"}, "AAD2": {"casa", "apartamento", "local", "lote"},
    "AAD3": {"casa", "apartamento", "local", "lote"},  # dotacional (institucional)
    "AAR1": {"local"}, "AAR2": {"local"}, "AAR3": {"local"},   # residencial: el comercio depende de la ficha normativa
}

@dataclass
class Hallazgo:
    categoria: str          # juridico | ambiental | normativo
    nivel: str              # amarillo | rojo
    codigo: str
    texto: str

@dataclass
class Resultado:
    color: str
    resumen_publico: str
    categorias: list[str]
    hallazgos: list[Hallazgo] = field(default_factory=list)

@dataclass
class Entrada:
    """Lo medido para un inmueble. Porcentajes = % del área del predio (0–100); None = no se pudo medir."""
    tipo: str
    medido: bool = True                        # False si no hay predio ni punto: no se pudo hacer el cruce
    amenaza_pct: Optional[float] = None        # inundación o deslizamiento (POT urbano)
    amenaza_tipos: list[str] = field(default_factory=list)
    proteccion_pct: Optional[float] = None     # áreas protegidas, ronda hídrica, humedales, POMCA conservación…
    proteccion_motivos: list[str] = field(default_factory=list)
    conflicto_pct: Optional[float] = None      # conflicto de uso del suelo (POT)
    uso_dominante: Optional[str] = None        # código del uso del suelo con mayor área
    sin_cobertura_normativa: bool = False      # el predio no cae en ninguna capa de uso del suelo
    juridico: Optional[dict] = None            # fila de inmueble_juridico o None si no se ha diligenciado
    soportes: list[dict] = field(default_factory=list)   # [{tipo, fecha_vencimiento, fecha_documento}]
    hoy: date = field(default_factory=date.today)

def _pct(x: Optional[float]) -> float:
    return x or 0.0

def _vigente(s: dict, hoy: date, dias_certificado: int) -> bool:
    """Un soporte vence en su fecha_vencimiento; sin ella, el certificado de tradición vale `dias_certificado` desde su fecha."""
    if s.get("fecha_vencimiento"):
        return date.fromisoformat(s["fecha_vencimiento"]) >= hoy
    if s["tipo"] == "certificado_tradicion":
        if not s.get("fecha_documento"):
            return False
        return date.fromisoformat(s["fecha_documento"]) + timedelta(days=dias_certificado) >= hoy
    return True

def evaluar(e: Entrada, umbral_rojo: float = 50, umbral_amarillo: float = 5, dias_certificado: int = 30) -> Resultado:
    h: list[Hallazgo] = []
    def add(cat, nivel, cod, txt): h.append(Hallazgo(cat, nivel, cod, txt))

    # ------------------------------------------------ ambiental (cruce espacial)
    if not e.medido:
        add("ambiental", AMARILLO, "A0", "Sin ubicación ni predio: no se pudo hacer el cruce espacial")
    else:
        if _pct(e.amenaza_pct) >= umbral_rojo:
            add("ambiental", ROJO, "A1", f"{e.amenaza_pct:.0f} % del predio en zona de amenaza ({', '.join(e.amenaza_tipos) or 'inundación/deslizamiento'})")
        elif _pct(e.amenaza_pct) >= umbral_amarillo:
            add("ambiental", AMARILLO, "A2", f"{e.amenaza_pct:.1f} % del predio en zona de amenaza ({', '.join(e.amenaza_tipos) or 'inundación/deslizamiento'})")
        if _pct(e.proteccion_pct) >= umbral_rojo:
            add("ambiental", ROJO, "A3", f"{e.proteccion_pct:.0f} % del predio en áreas de protección o conservación ({', '.join(e.proteccion_motivos)})")
        elif _pct(e.proteccion_pct) >= umbral_amarillo:
            add("ambiental", AMARILLO, "A4", f"{e.proteccion_pct:.1f} % del predio en áreas de protección o conservación ({', '.join(e.proteccion_motivos)})")

    # ------------------------------------------------ normativo (uso del suelo)
        if _pct(e.conflicto_pct) >= umbral_amarillo:
            add("normativo", AMARILLO, "N1", f"{e.conflicto_pct:.1f} % del predio en área de conflicto de uso del suelo")
        if e.sin_cobertura_normativa:
            add("normativo", AMARILLO, "N2", "El predio no cae en ninguna capa de uso del suelo del POT")
        elif e.uso_dominante and e.tipo in USO_A_TIPOS_A_VERIFICAR.get(e.uso_dominante, ()):
            add("normativo", AMARILLO, "N3", f"Uso dominante {e.uso_dominante}: verificar compatibilidad con {e.tipo}")

    # ------------------------------------------------ jurídico
    j = e.juridico
    if not j:
        add("juridico", AMARILLO, "J0", "Módulo jurídico sin diligenciar")
    else:
        if j.get("embargo"):
            add("juridico", ROJO, "J1", "Embargo registrado")
        if (j.get("litigios") or "").strip():
            add("juridico", ROJO, "J2", "Litigio informado")
        if j.get("sucesion_pendiente"):
            add("juridico", ROJO, "J3", "Sucesión pendiente")
        if j.get("hipoteca"):
            add("juridico", AMARILLO, "J4", "Hipoteca vigente (levantar al cerrar el negocio)")
        if j.get("afectacion_vivienda_familiar"):
            add("juridico", AMARILLO, "J5", "Afectación a vivienda familiar (exige firma del cónyuge)")
        if (j.get("servidumbres") or "").strip():
            add("juridico", AMARILLO, "J6", "Servidumbres registradas")
        if j.get("predial_estado") == "mora":
            add("juridico", AMARILLO, "J7", "Impuesto predial en mora")
        if j.get("valorizacion_estado") == "pendiente":
            add("juridico", AMARILLO, "J8", "Valorización pendiente de pago")
        incompleto = (not (j.get("matricula_inmobiliaria") or "").strip()) or any(
            j.get(k) is None for k in ("hipoteca", "embargo", "afectacion_vivienda_familiar", "sucesion_pendiente"))
        if incompleto:
            add("juridico", AMARILLO, "J9", "Estado jurídico incompleto (falta matrícula o algún gravamen por confirmar)")
        certs = [s for s in e.soportes if s["tipo"] == "certificado_tradicion"]
        if not any(_vigente(s, e.hoy, dias_certificado) for s in certs):
            add("juridico", AMARILLO, "J10", "Sin certificado de tradición vigente" if not certs else "Certificado de tradición vencido")

    mejor = max((_ORDEN[x.nivel] for x in h), default=0)
    color = {0: VERDE, 1: AMARILLO, 2: ROJO}[mejor]
    cats = [c for c in CATEGORIAS if any(x.categoria == c for x in h)]
    return Resultado(color, _resumen(color, cats), cats, h)

def _resumen(color: str, cats: list[str]) -> str:
    """Texto público: solo categorías genéricas, nunca el motivo exacto."""
    if color == VERDE:
        return "Sin alertas jurídicas, ambientales ni de uso del suelo en la verificación preliminar."
    lista = " y ".join(CATEGORIAS[c] for c in cats)
    base = "Riesgo alto" if color == ROJO else "Requiere verificación"
    return f"{base} en: {lista}. Consulte a la inmobiliaria antes de decidir."
