"""Exercise real network paths through the Grafana datasource proxy."""
import base64
import json
import importlib.util
from datetime import datetime, timedelta
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:3000"
AUTH = "Basic " + base64.b64encode(b"admin:local-demo-only").decode()
TRACE = "1234567890abcdef1234567890abcdef"


def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=5) as response:
        return response.read()


def grafana(path):
    return json.loads(get(BASE + path, {"Authorization": AUTH}))


def eventually(label, fn, seconds=180):
    deadline = time.monotonic() + seconds
    last = None
    while time.monotonic() < deadline:
        try:
            last = fn()
            if last:
                print(label + ": OK", flush=True)
                return last
        except Exception as exc:
            last = str(exc)
        time.sleep(2)
    raise RuntimeError(f"{label} timed out: {last}")


def request():
    # A fixed W3C parent lets us independently query exactly this request.
    get("http://127.0.0.1:8080/api/events", {
        "traceparent": "00-" + TRACE + "-1234567890abcdef-01"
    })
    return True


def query(source, path, params):
    return grafana("/api/datasources/proxy/uid/" + source + path + "?" + urllib.parse.urlencode(params))


eventually("Grafana datasource provisioning", lambda: all(
    grafana("/api/datasources/uid/" + uid).get("uid") == uid
    for uid in ("prometheus", "loki", "tempo")))
loki = grafana("/api/datasources/uid/loki")
field = loki["jsonData"]["derivedFields"][0]
assert field["datasourceUid"] == "tempo" and field["url"] == "${__value.raw}"
assert re.search(field["matcherRegex"], "[" + TRACE + "-1234567890abcdef]").group(1) == TRACE
tempo = grafana("/api/datasources/uid/tempo")["jsonData"]["tracesToLogsV2"]
assert tempo["datasourceUid"] == "loki" and "${__trace.traceId}" in tempo["query"]
eventually("Dashboard provisioning", lambda: grafana("/api/dashboards/uid/eventhub"))
eventually("EventHub request", request)
eventually("Prometheus target", lambda: query("prometheus", "/api/v1/query", {
    "query": 'up{job="eventhub"}'}).get("data", {}).get("result", [{}])[0].get("value", [0, "0"])[1] == "1")
eventually("Request metric", lambda: bool(query("prometheus", "/api/v1/query", {
    "query": 'http_server_requests_seconds_count'}).get("data", {}).get("result")))
for metric in ("eventhub_registration_orders", "eventhub_registration_attempts_matured",
               "eventhub_registration_attempts_dropped", "eventhub_registration_seats_active",
               "eventhub_registration_seats_checked_in"):
    eventually("Business metric " + metric, lambda metric=metric: bool(query(
        "prometheus", "/api/v1/query", {"query": metric}).get("data", {}).get("result")))
# Drive the same public booking flow used by the guest API CI test.
def order_count():
    result = query("prometheus", "/api/v1/query", {
        "query": "sum(eventhub_registration_orders)"})["data"]["result"]
    return float(result[0]["value"][1]) if result else None

baseline = order_count()
assert baseline is not None
fixture = Path(__file__).resolve().parents[2] / ".github/scripts/ci-guest/verify.py"
spec = importlib.util.spec_from_file_location("guest_verify", fixture)
guest_verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guest_verify)
guest_verify.BASE = "http://127.0.0.1:8080"
admin = guest_verify.Client()
admin.post("/api/auth/login", 200, {"email": "e2e.admin@example.com", "password": "local-demo-only-password"})
event = admin.post("/api/admin/events", 200, {
    "title": "Observability smoke", "description": "Disposable booking fixture",
    "location": "CI", "category": "TECH", "capacity": 5,
    "startsAt": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%S"),
    "imageUrl": "", "detailImages": [], "ticketTypes": [
        {"name": "Free", "description": "CI", "price": 0, "capacity": 5}]})
guest = guest_verify.Client()
receipt = guest.post(f"/api/guest/events/{event['id']}/registrations", 201,
    {"displayName": "Smoke Guest", "email": "smoke@example.com",
     "ticketTypeId": event["ticketTypes"][0]["id"], "quantity": 1},
    {"Idempotency-Key": "observability-smoke-booking"})
assert receipt["status"] == "CONFIRMED"
eventually("Booking increases business orders", lambda: order_count() >= baseline + 1)
eventually("Trace in Tempo", lambda: bool(grafana(
    "/api/datasources/proxy/uid/tempo/api/traces/" + TRACE).get("batches")))
eventually("Matching request log in Loki", lambda: bool(query("loki", "/loki/api/v1/query_range", {
    "query": '{service_name="eventhub"} |= "' + TRACE + '" |= "HTTP request completed"',
    "start": str(int((time.time() - 300) * 1e9)), "limit": "10"
}).get("data", {}).get("result")))
print("The same trace ID is present in Tempo and the Loki request log.")
