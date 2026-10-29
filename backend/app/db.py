"""Conexión SOLO LECTURA a data/db/publico.gpkg. El API público nunca abre admin.sqlite."""
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

from .config import DB_PUBLICO

def _conectar():
    return sqlite3.connect(f"file:{DB_PUBLICO.as_posix()}?mode=ro", uri=True, check_same_thread=False)

engine = create_engine("sqlite://", creator=_conectar, poolclass=QueuePool, pool_size=5, max_overflow=5)

def get_conn():
    with engine.connect() as conn:
        yield conn
