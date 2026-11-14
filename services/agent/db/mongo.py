"""MongoDB Exclusive Database Connection & Repository Manager for sutra.

Provides singleton client initialization, collection access, and repository
helpers for sessions, chat logs, user preferences, and knowledge documents.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional
from utils.logging import get_logger

LOGGER = get_logger("sutra.db.mongo")

_MONGO_CLIENT: Any = None
_MONGO_DATABASE: Any = None


def get_mongo_uri() -> str:
    """Retrieve MongoDB connection URI from environment variables."""
    return os.environ.get("MONGODB_URI", "mongodb://localhost:27017/sutra")


def get_database_name() -> str:
    """Retrieve MongoDB database name."""
    return os.environ.get("MONGODB_DB_NAME", "sutra")


def get_mongo_client():
    """Lazily initialize and return the singleton MongoDB client."""
    global _MONGO_CLIENT, _MONGO_DATABASE
    if _MONGO_CLIENT is None:
        try:
            from pymongo import MongoClient
            uri = get_mongo_uri()
            LOGGER.info("Connecting to MongoDB at %s", uri.split("@")[-1] if "@" in uri else uri)
            _MONGO_CLIENT = MongoClient(uri, serverSelectionTimeoutMS=5000)
            _MONGO_DATABASE = _MONGO_CLIENT[get_database_name()]
        except Exception as exc:
            LOGGER.warning("MongoDB client could not be initialized: %s", exc)
            return None
    return _MONGO_CLIENT


def get_db():
    """Get the active MongoDB database instance."""
    global _MONGO_DATABASE
    if _MONGO_DATABASE is None:
        get_mongo_client()
    return _MONGO_DATABASE


def get_collection(name: str):
    """Retrieve a MongoDB collection by name."""
    db = get_db()
    if db is None:
        return None
    return db[name]


def save_session_history(session_id: str, payload: Dict[str, Any]) -> bool:
    """Persist a conversation or tutor session document to MongoDB."""
    col = get_collection("sessions")
    if col is None:
        LOGGER.debug("MongoDB not connected; skipping session persist for %s", session_id)
        return False
    try:
        col.update_one(
            {"session_id": session_id},
            {"$set": payload},
            upsert=True,
        )
        return True
    except Exception as exc:
        LOGGER.error("Failed to persist session to MongoDB: %s", exc)
        return False


def get_session_history(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a session document from MongoDB by session_id."""
    col = get_collection("sessions")
    if col is None:
        return None
    try:
        return col.find_one({"session_id": session_id}, {"_id": 0})
    except Exception as exc:
        LOGGER.error("Failed to query session from MongoDB: %s", exc)
        return None
