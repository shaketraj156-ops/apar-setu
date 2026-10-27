from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from enum import Enum


class RegistryStatus(str, Enum):
    VALID = "VALID"
    INVALID = "INVALID"
    NOT_FOUND = "NOT_FOUND"
    PENDING = "PENDING"


class RegistryClient:
    def __init__(self, base_url: str | None = None, timeout: float = 0.5):
        self.base_url = (base_url or os.getenv("MOCK_APAAR_REGISTRY_URL", "http://localhost:8001")).rstrip("/")
        self.timeout = timeout
        self.use_fake = os.getenv("USE_FAKE_REGISTRY", "true").lower() in ("true", "1", "yes")

    def lookup(self, apaar_id: str | None) -> RegistryStatus:
        if not apaar_id:
            return RegistryStatus.INVALID
        if self.use_fake:
            if apaar_id.endswith("9999"):
                return RegistryStatus.NOT_FOUND
            if apaar_id.endswith("0000"):
                return RegistryStatus.INVALID
            return RegistryStatus.VALID
        try:
            with urllib.request.urlopen(f"{self.base_url}/verify/{apaar_id}", timeout=self.timeout) as resp:
                return RegistryStatus(json.load(resp)["status"])
        except (urllib.error.URLError, OSError, KeyError, ValueError):
            return RegistryStatus.PENDING

    def bulk_lookup(self, ids) -> dict:
        return {i: self.lookup(i) for i in dict.fromkeys(ids)}
