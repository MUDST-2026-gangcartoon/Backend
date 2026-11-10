import contextlib
import email.policy
import importlib.util
import json
import os
import re
import secrets
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
from email.parser import Parser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
E2E = ROOT / 'e2e'


def load_api_smoke():
    sys.dont_write_bytecode = True
    source = ROOT / '.github/scripts/ci-guest/verify.py'
    spec = importlib.util.spec_from_file_location('guest_api_smoke', source)
    smoke = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(smoke)
    return smoke


class VerificationMailbox:
    def __init__(self, path):
        self.path = path
        self.lock = threading.Lock()

    def append(self, raw_message):
        message = Parser(policy=email.policy.default).parsestr(raw_message)
        recipients = message.get('To')
        body = message.get_body(preferencelist=('plain',))
        code = re.search(r'verification code is (\d{6})\b', body.get_content()) if body else None
        if recipients is None or len(recipients.addresses) != 1 or not code:
            return
        address = recipients.addresses[0].addr_spec
        if not re.fullmatch(r'guest-[a-f0-9-]+@example\.test', address):
            return
        with self.lock, self.path.open('a', encoding='utf-8') as file:
            file.write(json.dumps({'email': address, 'code': code[1]}) + '\n')


@contextlib.contextmanager
def serve_frontend(dist, backend_port):
    env = {**os.environ, 'E2E_FRONTEND_PORT': '0', 'E2E_BACKEND_PORT': str(backend_port)}
    process = subprocess.Popen(
        ['node', str(E2E / 'serve-built.mjs'), str(dist)],
        cwd=E2E, env=env, stdout=subprocess.PIPE, text=True, encoding='utf-8',
    )
    try:
        output = process.stdout.readline()
        match = re.fullmatch(r'E2E frontend listening on (127\.0\.0\.1:\d+)\s*', output)
        if not match:
            raise RuntimeError('Isolated frontend did not report a loopback listening port')
        yield 'http://' + match[1]
    finally:
        process.stdout.close()
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def wait_for_seed(smoke):
    required = {'[E2E] Open Workshop', '[E2E] Full Workshop'}
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        try:
            events = smoke.Client().request('/api/events?page=0&size=20')['items']
            if required <= {event['title'] for event in events}:
                return
        except (OSError, AssertionError):
            pass
        time.sleep(0.25)
    raise RuntimeError('Isolated E2E event fixtures did not become ready')


def main(playwright_args):
    jar = ROOT / 'backend/target/eventhub-0.0.1-SNAPSHOT.jar'
    dist = ROOT / 'frontend/dist'
    playwright = E2E / 'node_modules/@playwright/test/cli.js'
    for path, instruction in (
        (jar, 'package the backend'),
        (dist / 'index.html', 'build the frontend'),
        (playwright, 'install the e2e npm dependencies'),
    ):
        if not path.is_file():
            raise SystemExit(f'Missing {path}. First {instruction}.')

    smoke = load_api_smoke()
    password = secrets.token_urlsafe(24)
    with tempfile.TemporaryDirectory(prefix='eventhub-browser-guest-') as directory:
        mailbox = Path(directory) / 'mailbox.jsonl'

        class VerificationSmtp(smoke.SMTP):
            messages = VerificationMailbox(mailbox)

        with socketserver.ThreadingTCPServer(('127.0.0.1', 0), VerificationSmtp) as smtp:
            smtp.daemon_threads = True
            server_thread = threading.Thread(target=smtp.serve_forever, daemon=True)
            server_thread.start()
            try:
                app_args = [
                    '--spring.profiles.active=e2e',
                    '--spring.datasource.url=jdbc:h2:mem:eventhub_e2e_guest;DB_CLOSE_DELAY=-1',
                    '--spring.datasource.driver-class-name=org.h2.Driver',
                    '--spring.datasource.username=sa',
                    '--spring.datasource.password=',
                    '--spring.jpa.hibernate.ddl-auto=create-drop',
                    '--server.servlet.session.cookie.secure=false',
                    '--spring.mail.host=127.0.0.1',
                    f'--spring.mail.port={smtp.server_address[1]}',
                    '--spring.mail.properties.mail.smtp.auth=false',
                    '--spring.mail.properties.mail.smtp.starttls.enable=false',
                    '--spring.mail.properties.mail.smtp.starttls.required=false',
                    '--app.guest-verification.from=e2e@example.test',
                ]
                with smoke.app(jar, app_args, {'APP_E2E_SEED_PASSWORD': password}):
                    wait_for_seed(smoke)
                    with serve_frontend(dist, urlparse(smoke.BASE).port) as base_url:
                        print(f'Guest browser tests on {base_url} with disposable H2 and local SMTP')
                        env = {
                            **os.environ,
                            'E2E_BASE_URL': base_url,
                            'E2E_CONFIRM_ISOLATED': 'yes',
                            'E2E_GUEST_MAILBOX': str(mailbox),
                            'E2E_SEED_PASSWORD': password,
                            'E2E_SUITE': 'guest',
                            'TZ': 'Asia/Bangkok',
                        }
                        return subprocess.call(
                            ['node', str(playwright), 'test', *playwright_args], cwd=E2E, env=env,
                        )
            finally:
                smtp.shutdown()
                server_thread.join()


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
