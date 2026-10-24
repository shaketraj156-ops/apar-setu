import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from app.services.registry_client import RegistryClient, RegistryStatus


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        status = "NOT_FOUND" if self.path.endswith("0001") else "VALID"
        if self.path.endswith("0500"):
            self.send_response(500); self.end_headers(); return
        body = json.dumps({"apaar_id": self.path.rsplit("/", 1)[-1], "status": status}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


def _server():
    srv = HTTPServer(("127.0.0.1", 0), _Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_port}"


def test_lookup_returns_service_status():
    srv, url = _server()
    try:
        c = RegistryClient(url)
        assert c.lookup("900000000001") == RegistryStatus.NOT_FOUND
        assert c.lookup("900000000002") == RegistryStatus.VALID
        assert c.bulk_lookup(["900000000002", "900000000002"]) == {"900000000002": RegistryStatus.VALID}
        assert c.lookup("900000000500") == RegistryStatus.PENDING     # server error -> PENDING
    finally:
        srv.shutdown()


def test_missing_id_is_invalid():
    assert RegistryClient("http://127.0.0.1:1").lookup("") == RegistryStatus.INVALID


def test_registry_down_becomes_pending():
    assert RegistryClient("http://127.0.0.1:1", timeout=0.5).lookup("900000000001") == RegistryStatus.PENDING
