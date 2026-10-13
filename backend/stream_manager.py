"""
StreamManager — manages RTSP drone video streams for AgroVision AI.

Each stream runs in a background daemon thread that:
  1. Opens cv2.VideoCapture on the RTSP URL.
  2. Continuously reads frames and stores the latest one.
  3. Auto-reconnects if the connection drops.

Callers (FastAPI endpoints) use get_frame() to retrieve the latest frame
and call stop() / the context manager to clean up.
"""

from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np

# How long (seconds) an idle stream is kept alive before auto-cleanup.
IDLE_TIMEOUT = 300  # 5 minutes


@dataclass
class DroneStream:
    stream_id: str
    rtsp_url: str
    _thread: threading.Thread = field(init=False, repr=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)
    _stop_event: threading.Event = field(default_factory=threading.Event, init=False, repr=False)

    # Latest raw frame (BGR numpy array) and metadata
    _frame: Optional[np.ndarray] = field(default=None, init=False, repr=False)
    _frame_index: int = field(default=0, init=False, repr=False)
    _frame_timestamp: float = field(default=0.0, init=False, repr=False)
    _started_at: float = field(default_factory=time.monotonic, init=False, repr=False)
    _last_access: float = field(default_factory=time.monotonic, init=False, repr=False)

    # Connection health
    connected: bool = field(default=False, init=False)
    error: Optional[str] = field(default=None, init=False)

    def __post_init__(self) -> None:
        self._thread = threading.Thread(target=self._run, daemon=True, name=f"drone-{self.stream_id[:8]}")
        self._thread.start()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_frame(self) -> tuple[Optional[np.ndarray], int, float]:
        """Return the latest frame, index, and stream-relative timestamp."""
        with self._lock:
            self._last_access = time.monotonic()
            return self._frame, self._frame_index, self._frame_timestamp

    def stop(self) -> None:
        """Signal the background thread to exit and release resources."""
        self._stop_event.set()

    @property
    def idle_seconds(self) -> float:
        with self._lock:
            return time.monotonic() - self._last_access

    # ------------------------------------------------------------------
    # Background thread
    # ------------------------------------------------------------------

    def _run(self) -> None:
        while not self._stop_event.is_set():
            source: str | int = int(self.rtsp_url) if self.rtsp_url in {"0", "1", "2"} else self.rtsp_url
            cap = cv2.VideoCapture(source)
            if not cap.isOpened():
                self.connected = False
                self.error = f"Cannot open stream: {self.rtsp_url}"
                # Wait before retrying
                self._stop_event.wait(timeout=3)
                continue

            self.connected = True
            self.error = None
            consecutive_failures = 0

            while not self._stop_event.is_set():
                ok, frame = cap.read()
                if not ok:
                    consecutive_failures += 1
                    if consecutive_failures >= 10:
                        break  # reconnect outer loop
                    time.sleep(0.05)
                    continue

                consecutive_failures = 0
                with self._lock:
                    self._frame = frame
                    self._frame_index += 1
                    self._frame_timestamp = max(time.monotonic() - self._started_at, 0.0)

            cap.release()
            self.connected = False

            if not self._stop_event.is_set():
                # Brief pause before reconnect attempt
                self._stop_event.wait(timeout=2)


class StreamManager:
    """Global registry of active DroneStream instances."""

    def __init__(self) -> None:
        self._streams: dict[str, DroneStream] = {}
        self._lock = threading.Lock()

        # Start cleanup daemon
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True, name="drone-cleanup")
        self._cleanup_thread.start()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def create(self, rtsp_url: str) -> str:
        """Open a new RTSP stream and return its stream_id."""
        stream_id = str(uuid.uuid4())
        stream = DroneStream(stream_id=stream_id, rtsp_url=rtsp_url)
        with self._lock:
            self._streams[stream_id] = stream
        return stream_id

    def get(self, stream_id: str) -> Optional[DroneStream]:
        """Look up a stream by ID.  Returns None if not found."""
        with self._lock:
            return self._streams.get(stream_id)

    def stop(self, stream_id: str) -> bool:
        """Stop and remove a stream.  Returns True if it existed."""
        with self._lock:
            stream = self._streams.pop(stream_id, None)
        if stream:
            stream.stop()
            return True
        return False

    def list_streams(self) -> list[dict]:
        with self._lock:
            return [
                {
                    "stream_id": sid,
                    "rtsp_url": s.rtsp_url,
                    "connected": s.connected,
                    "error": s.error,
                    "idle_seconds": round(s.idle_seconds, 1),
                }
                for sid, s in self._streams.items()
            ]

    # ------------------------------------------------------------------
    # Cleanup daemon
    # ------------------------------------------------------------------

    def _cleanup_loop(self) -> None:
        while True:
            time.sleep(60)
            with self._lock:
                stale = [sid for sid, s in self._streams.items() if s.idle_seconds > IDLE_TIMEOUT]
                for sid in stale:
                    stream = self._streams.pop(sid)
                    stream.stop()


# Module-level singleton used by FastAPI routes
stream_manager = StreamManager()
