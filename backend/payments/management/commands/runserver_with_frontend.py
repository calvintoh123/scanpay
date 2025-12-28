import os
import subprocess
import sys
import time
from django.core.management.commands.runserver import Command as RunserverCommand

class Command(RunserverCommand):
    help = "Run Django dev server and also start React (Vite) dev server."

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument("--frontend-dir", default="../frontend", help="Path to frontend directory")
        parser.add_argument("--vite-port", dest="vite_port", default="5173", help="Vite port")

    def handle(self, *args, **options):
        frontend_dir = options["frontend_dir"]
        vite_port = options["vite_port"]

        env = os.environ.copy()
        env["BROWSER"] = "none"

        cmd = ["npm", "run", "dev", "--", "--port", str(vite_port), "--host", "127.0.0.1"]

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
