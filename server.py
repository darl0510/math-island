import http.server
import socketserver
import os
import sys
import json
import urllib.parse
import uuid
from datetime import datetime

PORT = 8000
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "admin_store.json")

def load_store():
    if not os.path.exists(DATA_FILE):
        return {"students": [], "records": []}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"students": [], "records": []}

def save_store(data):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    temp_file = DATA_FILE + ".tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(temp_file, DATA_FILE)

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length <= 0:
                return {}
            raw = self.rfile.read(content_length).decode('utf-8')
            return json.loads(raw)
        except Exception:
            return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/students':
            store = load_store()
            return self._send_json(200, {"success": True, "students": store.get("students", [])})

        if path == '/api/records':
            store = load_store()
            records = store.get("records", [])
            kid = query.get('student_id', [None])[0]
            if kid:
                records = [r for r in records if r.get('student_id') == kid]
            return self._send_json(200, {"success": True, "records": records})

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/students':
            body = self._read_json_body()
            name = (body.get('name') or '').strip()
            if not name:
                return self._send_json(400, {"success": False, "error": "Name is required"})
            
            store = load_store()
            student = {
                "id": f"kid_{uuid.uuid4().hex[:8]}",
                "name": name,
                "avatar": body.get('avatar', '🌟'),
                "created_at": datetime.now().isoformat(timespec='seconds')
            }
            store.setdefault("students", []).append(student)
            save_store(store)
            return self._send_json(201, {"success": True, "student": student})

        if path == '/api/records':
            body = self._read_json_body()
            student_id = body.get('student_id')
            if not student_id:
                return self._send_json(400, {"success": False, "error": "student_id is required"})
            
            store = load_store()
            record = {
                "id": f"rec_{uuid.uuid4().hex[:8]}",
                "student_id": student_id,
                "student_name": body.get('student_name', ''),
                "subject": body.get('subject', 'math'),
                "grade": body.get('grade', 1),
                "level_id": body.get('level_id'),
                "level_title": body.get('level_title', ''),
                "score": body.get('score', 0),
                "stars": body.get('stars', 0),
                "duration_seconds": body.get('duration_seconds', 0),
                "errors": body.get('errors', []),
                "timestamp": datetime.now().isoformat(timespec='seconds')
            }
            store.setdefault("records", []).append(record)
            save_store(store)
            return self._send_json(201, {"success": True, "record": record})

        self._send_json(404, {"success": False, "error": "Endpoint not found"})

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/students':
            body = self._read_json_body()
            kid = body.get('id')
            if not kid:
                return self._send_json(400, {"success": False, "error": "Student id is required"})
            
            name = (body.get('name') or '').strip()
            avatar = body.get('avatar')
            
            store = load_store()
            found = False
            for s in store.get("students", []):
                if s.get("id") == kid:
                    if name:
                        s["name"] = name
                    if avatar:
                        s["avatar"] = avatar
                    s["updated_at"] = datetime.now().isoformat(timespec='seconds')
                    found = True
                    break
            
            if not found:
                return self._send_json(404, {"success": False, "error": "Student not found"})
            
            save_store(store)
            return self._send_json(200, {"success": True, "message": "Student updated"})

        self._send_json(404, {"success": False, "error": "Endpoint not found"})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/students':
            kid = query.get('id', [None])[0]
            if not kid:
                return self._send_json(400, {"success": False, "error": "Student id query parameter is required"})
            
            store = load_store()
            orig_len = len(store.get("students", []))
            store["students"] = [s for s in store.get("students", []) if s.get("id") != kid]
            if len(store["students"]) == orig_len:
                return self._send_json(404, {"success": False, "error": "Student not found"})
            
            save_store(store)
            return self._send_json(200, {"success": True, "deleted_id": kid})

        if path == '/api/records':
            rec_id = query.get('id', [None])[0]
            student_id = query.get('student_id', [None])[0]
            store = load_store()
            
            if rec_id:
                store["records"] = [r for r in store.get("records", []) if r.get("id") != rec_id]
                save_store(store)
                return self._send_json(200, {"success": True, "deleted_record_id": rec_id})
            elif student_id:
                store["records"] = [r for r in store.get("records", []) if r.get("student_id") != student_id]
                save_store(store)
                return self._send_json(200, {"success": True, "cleared_student_id": student_id})
            else:
                return self._send_json(400, {"success": False, "error": "Missing id or student_id parameter"})

        self._send_json(404, {"success": False, "error": "Endpoint not found"})

    def guess_type(self, path):
        if path.endswith('.js'):
            return 'application/javascript; charset=utf-8'
        if path.endswith('.json'):
            return 'application/json; charset=utf-8'
        if path.endswith('.css'):
            return 'text/css; charset=utf-8'
        if path.endswith('.mp3'):
            return 'audio/mpeg'
        return super().guess_type(path)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    for port in range(PORT, PORT + 20):
        try:
            with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
                print(f"[OK] 奇幻數學島伺服器啟動於: http://127.0.0.1:{port}")
                sys.stdout.flush()
                httpd.serve_forever()
                break
        except OSError:
            continue
