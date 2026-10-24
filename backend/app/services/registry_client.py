"""Client for the mock APAAR registry service (mock_apaar_registry, default http://localhost:8001).

Uses only the standard library. If the registry cannot be reached we return PENDING, so the
validation engine raises a warning instead of wrongly marking a student INVALID.
"""
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
    def __init__(self, base_url: str | None = None, timeout: float = 3.0):
        self.base_url = (base_url or os.getenv("MOCK_APAAR_REGISTRY_URL", "http://localhost:8001")).rstrip("/")
        self.timeout = timeout

    def lookup(self, apaar_id: str | None) -> RegistryStatus:
        if not apaar_id:
            return RegistryStatus.INVALID
        try:
            with urllib.request.urlopen(f"{self.base_url}/verify/{apaar_id}", timeout=self.timeout) as resp:
                return RegistryStatus(json.load(resp)["status"])
        except (urllib.error.URLError, OSError, KeyError, ValueError):
            return RegistryStatus.PENDING

    def bulk_lookup(self, ids) -> dict:
        return {i: self.lookup(i) for i in dict.fromkeys(ids)}
