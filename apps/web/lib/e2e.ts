const DB_NAME = "chatapp-e2e";
const STORE = "keys";
const KEY_ID_PREFIX = "identity:";

export type E2EIdentity = { publicKey: string; privateKey: JsonWebKey };

function b64(bytes: ArrayBuffer | Uint8Array) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(s: string) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function readIdentity(userId: string): Promise<E2EIdentity | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY_ID_PREFIX + userId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function saveIdentity(userId: string, value: E2EIdentity) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, KEY_ID_PREFIX + userId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getOrCreateIdentity(userId: string): Promise<E2EIdentity> {
  const existing = await readIdentity(userId);
  if (existing) return existing;
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const publicRaw = await crypto.subtle.exportKey("raw", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const identity = { publicKey: b64(publicRaw), privateKey: privateJwk };
  await saveIdentity(userId, identity);
  return identity;
}

async function sharedKey(privateJwk: JsonWebKey, otherPublicB64: string, conversationId: string) {
  const privateKey = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const publicKey = await crypto.subtle.importKey("raw", unb64(otherPublicB64), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const base = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("ChatApp-E2E-v1"), info: new TextEncoder().encode(conversationId) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(text: string, identity: E2EIdentity, otherPublicKey: string, conversationId: string) {
  const key = await sharedKey(identity.privateKey, otherPublicKey, conversationId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return `e2e:v1:${b64(iv)}:${b64(data)}`;
}

export async function decryptText(payload: string, identity: E2EIdentity, otherPublicKey: string, conversationId: string) {
  if (!payload.startsWith("e2e:v1:")) return payload;
  const [, , ivB64, dataB64] = payload.split(":");
  const key = await sharedKey(identity.privateKey, otherPublicKey, conversationId);
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(ivB64) }, key, unb64(dataB64));
  return new TextDecoder().decode(data);
}

export async function encryptBlob(blob: Blob, identity: E2EIdentity, otherPublicKey: string, conversationId: string) {
  const key = await sharedKey(identity.privateKey, otherPublicKey, conversationId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await blob.arrayBuffer());
  const out = new Uint8Array(12 + data.byteLength);
  out.set(iv, 0); out.set(new Uint8Array(data), 12);
  return new Blob([out], { type: "application/octet-stream" });
}

export async function decryptBlob(blob: Blob, identity: E2EIdentity, otherPublicKey: string, conversationId: string, mime: string) {
  const raw = new Uint8Array(await blob.arrayBuffer());
  if (raw.length < 13) throw new Error("فایل رمزنگاری‌شده نامعتبر است");
  const key = await sharedKey(identity.privateKey, otherPublicKey, conversationId);
  const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12));
  return new Blob([data], { type: mime || "application/octet-stream" });
}
