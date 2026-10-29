"""Autenticación del administrador: claves con PBKDF2, token firmado con HMAC (sin dependencias extra) y límite de intentos."""
import base64
import hashlib
import hmac
import json
import secrets
import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .. import config

ITERACIONES = 600_000
_bearer = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------- claves
def hash_password(clave: str) -> str:
    sal = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", clave.encode(), sal, ITERACIONES)
    return f"pbkdf2_sha256${ITERACIONES}${base64.b64encode(sal).decode()}${base64.b64encode(h).decode()}"

def verificar_password(clave: str, almacenado: str) -> bool:
    try:
        alg, it, sal, h = almacenado.split("$")
        calc = hashlib.pbkdf2_hmac("sha256", clave.encode(), base64.b64decode(sal), int(it))
        return alg == "pbkdf2_sha256" and hmac.compare_digest(calc, base64.b64decode(h))
    except Exception:
        return False

# ---------------------------------------------------------------- tokens
def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def _firma(datos: str) -> str:
    return _b64(hmac.new(config.ADMIN_SECRET.encode(), datos.encode(), hashlib.sha256).digest())

def crear_token(usuario: str) -> str:
    cuerpo = _b64(json.dumps({"u": usuario, "exp": int(time.time() + config.ADMIN_TOKEN_HORAS * 3600)}).encode())
    return f"{cuerpo}.{_firma(cuerpo)}"

def leer_token(token: str) -> str | None:
    try:
        cuerpo, firma = token.split(".")
        if not hmac.compare_digest(firma, _firma(cuerpo)):
            return None
        datos = json.loads(base64.urlsafe_b64decode(cuerpo + "=" * (-len(cuerpo) % 4)))
        return datos["u"] if datos["exp"] > time.time() else None
    except Exception:
        return None

def admin_actual(cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]) -> str:
    usuario = leer_token(cred.credentials) if cred else None
    if not usuario:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión no válida o vencida", headers={"WWW-Authenticate": "Bearer"})
    return usuario

# ---------------------------------------------------------------- límite de intentos (por IP, en memoria)
_intentos: dict[str, deque] = defaultdict(deque)
VENTANA_S, MAX_INTENTOS = 300, 5

def limitar_login(request: Request):
    ip = request.client.host if request.client else "?"
    q = _intentos[ip]
    ahora = time.time()
    while q and q[0] < ahora - VENTANA_S:
        q.popleft()
    if len(q) >= MAX_INTENTOS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados intentos. Espera unos minutos.")
    return q

def registrar_fallo(q: deque):
    q.append(time.time())
