const KEY = "scanpay_token";
const AUTH_EVENT = "scanpay_auth_change";

export function setAccessToken(token) {
  localStorage.setItem(KEY, token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}
export function getAccessToken() {
  return localStorage.getItem(KEY);
}
export function logout() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}
export function onAuthChange(handler) {
  window.addEventListener(AUTH_EVENT, handler);
  return () => window.removeEventListener(AUTH_EVENT, handler);
}
