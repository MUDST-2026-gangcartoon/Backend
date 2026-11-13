"""Check an Azure deployment and the Grafana datasource proxies."""
import base64
import json
import os
import time
import urllib.parse
import urllib.request
import uuid


web = os.environ["EVENTHUB_WEB_URL"].rstrip("/")
grafana = os.environ["EVENTHUB_GRAFANA_URL"].rstrip("/")
auth = base64.b64encode(("admin:" + os.environ["EVENTHUB_GRAFANA_PASSWORD"]).encode()).decode()
trace = uuid.uuid4().hex


def get(url, headers=None):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=8) as response:
        return response.read()


def source(uid, path, **params):
    query = "?" + urllib.parse.urlencode(params) if params else ""
    return json.loads(get(f"{grafana}/api/datasources/proxy/uid/{uid}{path}{query}",
                          {"Authorization": "Basic " + auth}))


def eventually(label, check):
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            if check():
                print(f"PASS {label}", flush=True)
                return
        except (OSError, ValueError, KeyError):
            pass
        time.sleep(3)
    raise SystemExit(f"FAIL {label}")


def web_ready():
    get(web + "/")
    result = json.loads(get(web + "/api/events?size=1", {"traceparent": f"00-{trace}-1234567890abcdef-01"}))
    return result["totalElements"] > 0


eventually("web and seeded API", web_ready)
for metric in ('up{job="eventhub"} == 1', "http_server_requests_seconds_count", "eventhub_registration_orders"):
    eventually(metric, lambda: source("prometheus", "/api/v1/query", query=metric)["data"]["result"])
eventually("Tempo trace", lambda: source("tempo", "/api/traces/" + trace).get("batches"))
eventually("matching Loki request", lambda: source(
    "loki", "/loki/api/v1/query_range", query='{service_name="eventhub"} |= "' + trace + '"',
    start=str(int((time.time() - 300) * 1e9)), limit="10")["data"]["result"])
