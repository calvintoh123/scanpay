# Scanpay

A simple scan-to-pay demo:
- Backend: Django REST API
- Frontend: React (Vite)
- Device: polls for commands and can request invoices by `device_id`

## Requirements
- Python 3.9+ (3.10+ ok)
- Node.js + npm (Node 18+ recommended)

## Install (macOS)
```bash
Download the repository
Open the folder with VSCode/Terminal
cd scanpay
Delete the venv folder
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd frontend
npm install
cd ../backend
python3 manage.py makemigrations payments
python3 manage.py migrate
cd ..
```

## Install (Windows)
```bat
Download the repository
Open the folder with VSCode/Command Prompt
cd scanpay
Delete the venv folder
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd frontend
npm install
cd ..\backend
python3 manage.py makemigrations payments
python3 manage.py migrate
cd ..
```

## Run (dev)
Option A: run backend + frontend together (recommended)
```bash
cd backend
python manage.py runserver_with_frontend 0.0.0.0:8000 --frontend-dir ../frontend --vite-port 5173
```
This starts:
- Django API at `http://<server-ip>:8000`
- Vite at `http://<server-ip>:5173`

Option B: run separately
```bash
# backend
cd backend
python manage.py runserver 0.0.0.0:8000
```
```bash
# frontend
cd frontend
VITE_PUBLIC_BASE_URL=http://<server-ip>:5173 npm run dev -- --host 0.0.0.0 --port 5173
```

## Usage (frontend)
- Open `http://<server-ip>:5173`
- Home: create an invoice (amount, device_id, duration). A QR code appears.
- Pay page: scan the QR, then pay as guest or login to pay with wallet balance.
- Wallet: view balance, reload via payment-method page, see recent transactions.
- Device monitor: open `http://<server-ip>:5173/device` to poll the latest invoice for a device.

## Device API (backend)
Base URL: `http://<server-ip>:8000/api`

1) Request a new invoice for a device
```
POST /device/<device_id>/request-invoice/
Content-Type: application/json

{
  "amount": "5.00",
  "description": "Sim payment",
  "duration_sec": 240
}
```
Response includes `public_id`, `pay_url`, `token`.

2) Get latest invoice for a device
```
GET /device/<device_id>/latest-invoice/?only_pending=1
```

3) Device polls for commands
```
GET /device/<device_id>/next/
```

4) Device ACKs a command
```
POST /device/<device_id>/ack/
Content-Type: application/json

{ "command_id": 123 }
```

Notes:
- Device APIs use `device_id` only (no secret required).
- Endpoints include a trailing slash.

## Troubleshooting
- QR shows `localhost`: open the site via LAN IP, or set `VITE_PUBLIC_BASE_URL`.
- SQLite `database is locked`: reduce device polling frequency or move to Postgres.
