import hmac, hashlib, base64, json, time
from django.conf import settings

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def _b64urldecode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)

def sign_invoice_token(public_id: str, exp_seconds: int = 900) -> str:
    payload = {"pid": public_id, "exp": int(time.time()) + exp_seconds}
    payload_b = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    sig = hmac.new(settings.SECRET_KEY.encode(), payload_b, hashlib.sha256).digest()
    return _b64url(payload_b) + "." + _b64url(sig)

def verify_invoice_token(token: str, expected_public_id: str) -> bool:
    try:
        p_b64, s_b64 = token.split(".", 1)
        payload_b = _b64urldecode(p_b64)
        sig = _b64urldecode(s_b64)
        good = hmac.new(settings.SECRET_KEY.encode(), payload_b, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, good):
            return False
        payload = json.loads(payload_b.decode())
        if payload.get("pid") != expected_public_id:
            return False
        if int(payload.get("exp", 0)) < int(time.time()):
            return False
        return True
    except Exception:
        return False
