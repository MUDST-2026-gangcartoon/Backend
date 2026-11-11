"""Verify guest OTP delivery through the Minikube frontend proxy and Mailpit."""
import json
import os
import re
import runpy
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[3]
APP = "http://127.0.0.1:18080"
MAIL = "http://127.0.0.1:18025"


def mail_json(path):
    with urlopen(MAIL + path, timeout=5) as response:
        return json.load(response)


def read_otp(email):
    for _ in range(20):
        for entry in mail_json("/api/v1/messages")["messages"]:
            if not any(address["Address"] == email for address in entry["To"]):
                continue
            message = mail_json("/api/v1/message/" + quote(entry["ID"], safe=""))
            match = re.search(r"verification code is (\d{6})\b", message["Text"])
            if match:
                return match[1]
        time.sleep(1)
    raise AssertionError("Mailpit did not capture the verification email for the fixture account")


def main():
    smoke = runpy.run_path(str(ROOT / ".github/scripts/ci-guest/verify.py"))
    client = smoke["Client"]
    client.request.__globals__["BASE"] = APP
    password = os.environ["E2E_SEED_PASSWORD"]
    email = f"minikube-guest-{uuid4().hex}@example.test"

    admin = client()
    admin.post("/api/auth/login", 200, {"email": "e2e.admin@example.com", "password": password})
    event = admin.post("/api/admin/events", 200, {
        "title": "Minikube Guest OTP smoke",
        "description": "Disposable Kubernetes test fixture",
        "location": "Test venue",
        "category": "TECH",
        "capacity": 5,
        "startsAt": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%S"),
        "imageUrl": "",
        "detailImages": [],
        "ticketTypes": [{"name": "Free", "description": "Test", "price": 0, "capacity": 5}],
    })
    guest = client()
    receipt = guest.post(f"/api/guest/events/{event['id']}/registrations", 201, {
        "displayName": "Minikube Guest", "email": email,
        "ticketTypeId": event["ticketTypes"][0]["id"], "quantity": 1,
    }, {"Idempotency-Key": str(uuid4())})
    assert receipt["status"] == "CONFIRMED" and receipt["ticketCode"]

    member = client()
    member.post("/api/auth/signup", 201, {"name": "Minikube Guest", "email": email, "password": password})
    assert member.request("/api/registrations/me") == []
    member.post("/api/auth/email-verification/request", 202)
    member.post("/api/auth/email-verification/confirm", 204, {"code": read_otp(email)})
    assert member.post("/api/registrations/claim-guest", 200)["claimedRegistrations"] == 1
    history = member.request("/api/registrations/me")
    assert len(history) == 1
    assert history[0]["id"] == receipt["registrationId"]
    assert history[0]["ticketCode"] == receipt["ticketCode"]
    print("Minikube Guest OTP smoke passed: Mailpit delivery, email verification and original ticket claim")


if __name__ == "__main__":
    main()
