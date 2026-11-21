/**
 * PIN-Encrypted Survivor Black Box Vault (Web Crypto API AES-256-GCM + PBKDF2)
 * Zero plaintext or PIN is ever stored. Uses random 16-byte salt & fresh 12-byte IV per save.
 */

export const BLACKBOX_STORAGE_KEY = 'apex_blackbox_vault_v1';

export interface RadioFreqEntry {
  id: string;
  label: string;
  frequency: string;
  notes: string;
}

export interface SecretCacheEntry {
  id: string;
  label: string;
  lat: string;
  lon: string;
  notes: string;
}

export interface BlackBoxPayload {
  callsign: string;
  bloodType: string;
  emergencyContact: string;
  allergies: string;
  medications: string;
  medicalNotes: string;
  radios: RadioFreqEntry[];
  caches: SecretCacheEntry[];
  updatedAt: string;
}

interface EncryptedEnvelope {
  version: 1;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  updatedAt: string;
}

export const DEFAULT_BLACKBOX_PAYLOAD: BlackBoxPayload = {
  callsign: '',
  bloodType: 'Unknown',
  emergencyContact: '',
  allergies: '',
  medications: '',
  medicalNotes: '',
  radios: [
    {
      id: 'rf-1',
      label: 'FRS / GMRS Calling Ch 1',
      frequency: '462.5625 MHz',
      notes: 'Monitor top of every hour',
    },
    {
      id: 'rf-2',
      label: 'VHF 2m National Simplex',
      frequency: '146.520 MHz',
      notes: 'Line-of-sight emergency relay',
    },
  ],
  caches: [],
  updatedAt: new Date().toISOString(),
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function deriveAesKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`APEX-BLACKBOX-V1:${pin}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 150000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function isWebCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  );
}

export function hasStoredBlackBox(): boolean {
  try {
    const raw = localStorage.getItem(BLACKBOX_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<EncryptedEnvelope>;
    return Boolean(parsed.salt && parsed.iv && parsed.ciphertext);
  } catch {
    return false;
  }
}

export function getStoredBlackBoxUpdatedAt(): string | null {
  try {
    const raw = localStorage.getItem(BLACKBOX_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EncryptedEnvelope>;
    return parsed.updatedAt || null;
  } catch {
    return null;
  }
}

export async function saveEncryptedBlackBox(
  pin: string,
  payload: BlackBoxPayload
): Promise<string> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits.');
  }
  if (!isWebCryptoAvailable()) {
    throw new Error('Web Crypto API is unavailable in this browser context.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(pin, salt);

  const nowIso = new Date().toISOString();
  const toEncrypt: BlackBoxPayload = { ...payload, updatedAt: nowIso };
  const plaintextBytes = new TextEncoder().encode(JSON.stringify(toEncrypt));

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plaintextBytes
  );

  const envelope: EncryptedEnvelope = {
    version: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuffer)),
    updatedAt: nowIso,
  };

  localStorage.setItem(BLACKBOX_STORAGE_KEY, JSON.stringify(envelope));
  return nowIso;
}

export async function unlockEncryptedBlackBox(
  pin: string
): Promise<BlackBoxPayload> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('Enter a 4-digit PIN.');
  }
  if (!isWebCryptoAvailable()) {
    throw new Error('Web Crypto API is unavailable in this browser context.');
  }

  const raw = localStorage.getItem(BLACKBOX_STORAGE_KEY);
  if (!raw) {
    throw new Error('No encrypted vault found on this device.');
  }

  const envelope = JSON.parse(raw) as EncryptedEnvelope;
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);

  const key = await deriveAesKey(pin, salt);
  try {
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource
    );
    const json = new TextDecoder().decode(plainBuffer);
    return JSON.parse(json) as BlackBoxPayload;
  } catch {
    throw new Error('Incorrect PIN — decryption authentication failed.');
  }
}

export function wipeBlackBox(): void {
  try {
    localStorage.removeItem(BLACKBOX_STORAGE_KEY);
  } catch {
    // Ignore storage error
  }
}
