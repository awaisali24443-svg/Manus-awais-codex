import sqlite3
import os
import json
from typing import List, Dict, Any, Optional

class LocalMemory:
    def __init__(self, db_path: str = "workspace/synod_memory.db"):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS task_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT,
                    goal TEXT,
                    status TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_preferences (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS system_state (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            """)

    def save_task(self, task_id: str, goal: str, status: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO task_history (task_id, goal, status) VALUES (?, ?, ?)",
                (task_id, goal, status)
            )

    def set_preference(self, key: str, value: Any):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)",
                (key, json.dumps(value))
            )

    def get_preference(self, key: str) -> Any:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT value FROM user_preferences WHERE key = ?", (key,))
            row = cursor.fetchone()
            return json.loads(row[0]) if row else None

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT task_id, goal, status, timestamp FROM task_history WHERE task_id = ?",
                (task_id,)
            )
            row = cursor.fetchone()
            if row:
                return {"task_id": row[0], "goal": row[1], "status": row[2], "timestamp": row[3]}
            return None

    def get_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT task_id, goal, status, timestamp FROM task_history ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
            return [
                {"task_id": r[0], "goal": r[1], "status": r[2], "timestamp": r[3]}
                for r in cursor.fetchall()
            ]
