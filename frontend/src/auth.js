const KEY = "scanpay_token";

export function setAccessToken(token) {
  localStorage.setItem(KEY, token);
}
export function getAccessToken() {
  return localStorage.getItem(KEY);
}
export function logout() {
  localStorage.removeItem(KEY);
}
