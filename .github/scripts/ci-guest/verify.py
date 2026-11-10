import contextlib
import http.cookiejar
import json
import os
import re
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PASSWORD = 'Isolated-Test-Password-123!'
BASE = None

class Client:
    def __init__(self):
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def request(self, path, expected=200, data=None, headers=None):
        req = urllib.request.Request(BASE + path, data=None if data is None else json.dumps(data).encode(),
                                     headers={'Content-Type': 'application/json', **(headers or {})})
        try:
            response = self.opener.open(req, timeout=5)
        except urllib.error.HTTPError as e:
            response = e
        body = response.read().decode()
        if response.status != expected:
            raise AssertionError(f'{path}: expected {expected}, got {response.status}: {body[:500]}')
        return json.loads(body) if body else None

    def post(self, path, expected, data=None, headers=None):
        csrf = self.request('/api/auth/csrf')
        return self.request(path, expected, data if data is not None else {},
                            {csrf['headerName']: csrf['token'], **(headers or {})})

@contextlib.contextmanager
def app(jar, args, env=None):
    global BASE
    with tempfile.TemporaryDirectory(prefix='eventhub-log-') as logdir, open(Path(logdir) / 'app.log', 'w', encoding='utf-8') as log:
        logpath = Path(logdir) / 'app.log'
        process = subprocess.Popen(['java', '-jar', str(jar), '--server.address=127.0.0.1', '--server.port=0', *args],
                                   stdout=log, stderr=subprocess.STDOUT, env={**os.environ, **(env or {})})
        try:
            deadline = time.monotonic() + 120
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    break
                output = logpath.read_text(encoding='utf-8', errors='replace')
                match = re.search(r'Tomcat started on port (\d+)', output)
                if match:
                    BASE = f'http://127.0.0.1:{match.group(1)}'
                    try:
                        Client().request('/actuator/health')
                        break
                    except (OSError, AssertionError):
                        pass
                time.sleep(0.5)
            else:
                raise RuntimeError('Application startup timed out')
            if process.poll() is not None:
                raise RuntimeError('Application exited before readiness')
            yield
        except Exception:
            print(logpath.read_text(encoding='utf-8', errors='replace')[-12000:], file=sys.stderr)
            raise
        finally:
            process.terminate()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()

class SMTP(socketserver.StreamRequestHandler):
    messages = []
    def handle(self):
        self.wfile.write(b'220 localhost test sink\r\n')
        while line := self.rfile.readline():
            cmd = line.decode(errors='replace').strip().upper()
            if cmd.startswith(('EHLO', 'HELO')):
                self.wfile.write(b'250 localhost\r\n')
            elif cmd.startswith('DATA'):
                self.wfile.write(b'354 End with dot\r\n')
                message = []
                while (part := self.rfile.readline()) != b'.\r\n':
                    if not part:
                        return
                    message.append(part)
                self.messages.append(b''.join(message).decode(errors='replace'))
                self.wfile.write(b'250 Queued\r\n')
            elif cmd.startswith('QUIT'):
                self.wfile.write(b'221 Bye\r\n')
                return
            else:
                self.wfile.write(b'250 OK\r\n')


def smoke(jar):
    with socketserver.ThreadingTCPServer(('127.0.0.1', 0), SMTP) as smtp:
        smtp.daemon_threads = True
        thread = threading.Thread(target=smtp.serve_forever, daemon=True)
        thread.start()
        env = {'SPRING_PROFILES_ACTIVE': 'e2e', 'APP_E2E_SEED_PASSWORD': PASSWORD,
               'SPRING_MAIL_HOST': '127.0.0.1', 'SPRING_MAIL_PORT': str(smtp.server_address[1]),
               'APP_GUEST_VERIFICATION_FROM': 'test@example.com', 'APP_GUEST_SMTP_AUTH': 'false',
               'APP_GUEST_SMTP_STARTTLS_ENABLE': 'false', 'APP_GUEST_SMTP_STARTTLS_REQUIRED': 'false'}
        try:
            with app(jar, ['--spring.datasource.url=jdbc:h2:mem:eventhub_e2e_ci;DB_CLOSE_DELAY=-1'], env):
                admin = Client()
                admin.post('/api/auth/login', 200, {'email': 'e2e.admin@example.com', 'password': PASSWORD})
                event = admin.post('/api/admin/events', 200, {
                    'title': 'CI Guest Verification', 'description': 'Disposable API smoke fixture',
                    'location': 'CI', 'category': 'TECH', 'capacity': 5,
                    'startsAt': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%S'),
                    'imageUrl': '', 'detailImages': [], 'ticketTypes': [
                        {'name': 'Free', 'description': 'CI', 'price': 0, 'capacity': 5}]})
                for index, (email, existing) in enumerate([
                        ('ci-guest@example.com', False), ('e2e.user@example.com', True)]):
                    guest = Client()
                    receipt = guest.post(f"/api/guest/events/{event['id']}/registrations", 201,
                        {'displayName': 'CI Guest', 'email': email, 'ticketTypeId': event['ticketTypes'][0]['id'],
                         'quantity': 1}, {'Idempotency-Key': f'ci-guest-booking-{index}'})
                    assert receipt['ticketCode'] and receipt['status'] == 'CONFIRMED'
                    member = Client()
                    if existing:
                        member.post('/api/auth/login', 200, {'email': email, 'password': PASSWORD})
                    else:
                        member.post('/api/auth/signup', 201, {'name': 'CI Guest', 'email': email, 'password': PASSWORD})
                    assert member.request('/api/registrations/me') == []
                    member.post('/api/auth/email-verification/request', 202)
                    assert len(SMTP.messages) == index + 1
                    message = SMTP.messages[index]
                    assert email in message
                    match = re.search(r'verification code is (\d{6})', message)
                    assert match, 'Verification code missing from local SMTP message'
                    member.post('/api/auth/email-verification/confirm', 204, {'code': match.group(1)})
                    result = member.post('/api/registrations/claim-guest', 200)
                    assert result['claimedRegistrations'] == 1
                    history = member.request('/api/registrations/me')
                    assert len(history) == 1
                    assert history[0]['id'] == receipt['registrationId']
                    assert history[0]['ticketCode'] == receipt['ticketCode']
                    assert history[0]['quantity'] == 1
                print('PASS: guest booking, SMTP OTP, claim and authenticated ticket history')
        finally:
            smtp.shutdown()
            thread.join()

def migration(current, baseline):
    with tempfile.TemporaryDirectory(prefix='eventhub-migration-') as temp:
        db = 'jdbc:h2:file:' + (Path(temp) / 'baseline').as_posix()
        common = [f'--spring.datasource.url={db}', '--spring.datasource.username=sa',
                  '--spring.datasource.password=', '--spring.jpa.open-in-view=false']
        with app(baseline, [*common, '--spring.jpa.hibernate.ddl-auto=create']):
            member = Client()
            member.post('/api/auth/signup', 201, {'name': 'Migration Member',
                        'email': 'migration@example.com', 'password': PASSWORD})
        with zipfile.ZipFile(current) as boot:
            h2 = next(name for name in boot.namelist() if re.fullmatch(r'BOOT-INF/lib/h2-[^/]+\.jar', name))
            h2path = Path(temp) / 'h2.jar'
            h2path.write_bytes(boot.read(h2))
        command = ['java', '-cp', str(h2path), 'org.h2.tools.RunScript', '-url', db,
                   '-user', 'sa', '-password', '', '-script']
        fixture = Path(temp) / 'fixture.sql'
        fixture.write_text("""INSERT INTO events (title, description, location, starts_at, capacity, category)
            VALUES ('Migration event', 'CI fixture', 'CI', TIMESTAMP '2099-01-01 10:00:00', 10, 'TECH');
            INSERT INTO registrations (user_id, active_user_id, event_id, registered_at, quantity, ticket_code, status,
                purchased_ticket_name, purchased_unit_price)
            SELECT u.id, u.id, e.id, CURRENT_TIMESTAMP, 2, 'GTH-CIMIGRATION', 'CONFIRMED', 'General', 0
            FROM users u CROSS JOIN events e WHERE u.email = 'migration@example.com' AND e.title = 'Migration event';
            """, encoding='utf-8')
        subprocess.run([*command, str(fixture)], check=True)
        with app(baseline, [*common, '--spring.jpa.hibernate.ddl-auto=validate']):
            member = Client()
            member.post('/api/auth/login', 200, {'email': 'migration@example.com', 'password': PASSWORD})
            before = member.request('/api/registrations/me')
            assert len(before) == 1 and before[0]['ticketCode'] == 'GTH-CIMIGRATION' and before[0]['quantity'] == 2
        migration_sql = ROOT / 'backend/migrations/2026-11-10-guest-phase2-h2.sql'
        subprocess.run([*command, str(migration_sql)], check=True)
        subprocess.run([*command, str(migration_sql)], check=True)  # Documented rerun safety.
        with app(current, [*common, '--spring.jpa.hibernate.ddl-auto=validate']):
            member = Client()
            member.post('/api/auth/login', 200, {'email': 'migration@example.com', 'password': PASSWORD})
            after = member.request('/api/registrations/me')
            assert len(after) == 1
            for field in ('id', 'ticketCode', 'quantity'):
                assert after[0][field] == before[0][field], f'Migration changed {field}'
        print('PASS: baseline H2 migration, rerun, schema validation and preserved member')

if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == 'smoke':
        smoke(Path(sys.argv[2]).resolve())
    elif len(sys.argv) == 4 and sys.argv[1] == 'migration':
        migration(Path(sys.argv[2]).resolve(), Path(sys.argv[3]).resolve())
    else:
        raise SystemExit('Usage: verify.py smoke CURRENT.jar | migration CURRENT.jar BASELINE.jar')
