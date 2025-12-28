import os
import socket
import subprocess
import sys
import time
from django.core.management.commands.runserver import Command as RunserverCommand

def _detect_lan_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()

class Command(RunserverCommand):
    help = "Run Django dev server and also start React (Vite) dev server."

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument("--frontend-dir", default="../frontend", help="Path to frontend directory")
        parser.add_argument("--vite-port", dest="vite_port", default="5173", help="Vite port")
        parser.add_argument("--vite-host", dest="vite_host", default="0.0.0.0", help="Vite host")

    def handle(self, *args, **options):
        frontend_dir = options["frontend_dir"]
        vite_port = str(options["vite_port"])
        vite_host = options["vite_host"]

        env = os.environ.copy()
        env["BROWSER"] = "none"
        if "VITE_PUBLIC_BASE_URL" not in env:
            lan_ip = _detect_lan_ip()
            env["VITE_PUBLIC_BASE_URL"] = f"http://{lan_ip}:{vite_port}"
            self.stdout.write(self.style.WARNING(
                f"Using VITE_PUBLIC_BASE_URL={env['VITE_PUBLIC_BASE_URL']} for QR codes."
            ))

        cmd = ["npm", "run", "dev", "--", "--port", vite_port, "--host", vite_host]

        self.stdout.write(self.style.WARNING(f"Starting React dev server in {frontend_dir} ..."))
        try:
            p = subprocess.Popen(cmd, cwd=frontend_dir, env=env)
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR("npm not found. Install Node.js and npm."))
            sys.exit(1)

        time.sleep(0.8)
        self.stdout.write(self.style.SUCCESS("React dev server started."))

        try:
            super().handle(*args, **options)
        finally:
            self.stdout.write(self.style.WARNING("Stopping React dev server..."))
            p.terminate()
