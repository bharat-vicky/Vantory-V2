#!/usr/bin/env python3
"""Run on the dedicated host as root; never prints service credentials."""
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.request

root = Path('/opt/vantory-judge0')
base = (root / 'endpoint.env').read_text().strip().split('=', 1)[1]
config = (root / 'judge0-v1.13.1/judge0.conf').read_text()
token = re.search(r'^AUTHN_TOKEN=(.+)$', config, re.M).group(1)


def request(path, body=None, authenticated=True):
    headers = {'Content-Type': 'application/json'}
    if authenticated:
        headers['X-Auth-Token'] = token
    req = urllib.request.Request(base + path, headers=headers,
                                 data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        # Do not dump bodies, headers, or credentials in failure diagnostics.
        return error.code, None


def run(language, source, expected=None, status=3, stdin=None):
    http, result = request('/submissions?base64_encoded=false&wait=true', {
        'language_id': language, 'source_code': source, 'stdin': stdin,
        'cpu_time_limit': 2, 'wall_time_limit': 5, 'memory_limit': 128000,
        'max_file_size': 1024, 'max_processes_and_or_threads': 8,
        'enable_network': False,
    })
    assert http == 201, f'Submission HTTP status: {http}'
    assert result.get('status', {}).get('id') == status, 'Unexpected execution status'
    if expected is not None:
        assert (result.get('stdout') or '').strip() == expected, 'Unexpected output'


for attempt in range(30):
    try:
        status, _ = request('/languages', authenticated=False)
        if status == 401:
            break
        if status == 200:
            raise AssertionError('Unauthenticated access was allowed')
    except urllib.error.URLError:
        pass  # Wait for initial certificate issuance; never bypass TLS validation.
    time.sleep(2)
else:
    raise AssertionError('HTTPS and the authenticated API did not become ready')
http, languages = request('/languages')
assert http == 200, 'Authenticated language lookup failed'
by_id = {language['id']: language['name'] for language in languages}
assert 'Python' in by_id.get(71, ''), 'Check the Python language ID'
assert 'SQL' in by_id.get(82, ''), 'Check the SQL language ID'
print('HTTPS, token enforcement, and language IDs: PASS')

python = '''import json, sys
seen = set()
answer = None
for value in json.load(sys.stdin):
    if value in seen:
        answer = value
        break
    seen.add(value)
print(json.dumps(answer))
'''
for data, expected in [('[2,1,2,1]', '2'), ('[]', 'null'),
                       ('[-1,0,3,-1]', '-1'), ('[1,2,3]', 'null')]:
    run(71, python, expected, stdin=data)
print('Python exercise, including edge cases: PASS')

schema = 'CREATE TABLE customers(id INTEGER,name TEXT); CREATE TABLE orders(id INTEGER,customer_id INTEGER,total INTEGER);'
query = 'SELECT c.name, COALESCE(SUM(o.total),0) FROM customers c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id,c.name ORDER BY c.id;'
run(82, schema + "INSERT INTO customers VALUES(1,'A'),(2,'B'); INSERT INTO orders VALUES(1,1,10),(2,1,20);" + query, 'A|30\nB|0')
run(82, schema + "INSERT INTO customers VALUES(1,'A');" + query, 'A|0')
print('SQL exercise, including customers without orders: PASS')

run(71, 'print(1/0)', status=11)
run(71, 'while True: pass', status=5)
run(71, "import os; print(any(k in os.environ for k in ['AUTHN_TOKEN','REDIS_PASSWORD','POSTGRES_PASSWORD','AWS_ACCESS_KEY_ID']))", 'False')
http, _ = request('/submissions?base64_encoded=false&wait=true', {
    'language_id': 71, 'source_code': 'print(1)', 'enable_network': True,
})
assert http == 422, 'Execution was allowed to enable networking'
print('Runtime failures, CPU limit, secret isolation, and network setting enforcement: PASS')
