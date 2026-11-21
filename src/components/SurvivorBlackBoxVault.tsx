import React, { useEffect, useState } from 'react';
import {
  Check,
  Crosshair,
  Delete,
  HeartPulse,
  KeyRound,
  Lock,
  MapPin,
  Plus,
  Radio,
  Save,
  Shield,
  Trash2,
  Unlock,
} from 'lucide-react';
import {
  DEFAULT_BLACKBOX_PAYLOAD,
  getStoredBlackBoxUpdatedAt,
  hasStoredBlackBox,
  isWebCryptoAvailable,
  saveEncryptedBlackBox,
  unlockEncryptedBlackBox,
  wipeBlackBox,
  type BlackBoxPayload,
} from '../utils/blackBoxCrypto';

const BLOOD_TYPES = [
  'Unknown',
  'O-',
  'O+',
  'A-',
  'A+',
  'B-',
  'B+',
  'AB-',
  'AB+',
];

export const SurvivorBlackBoxVault: React.FC = () => {
  const cryptoOk = isWebCryptoAvailable();
  const [vaultExists, setVaultExists] = useState<boolean>(() =>
    hasStoredBlackBox()
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(() =>
    getStoredBlackBoxUpdatedAt()
  );

  // Lock / setup states
  const [mode, setMode] = useState<'locked' | 'setup-pin' | 'confirm-pin' | 'unlocked' | 'change-pin'>(() =>
    hasStoredBlackBox() ? 'locked' : 'setup-pin'
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [pendingPin, setPendingPin] = useState<string>('');
  const [activePin, setActivePin] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState<boolean>(false);

  // Decrypted payload (kept strictly in React memory while unlocked)
  const [data, setData] = useState<BlackBoxPayload>(DEFAULT_BLACKBOX_PAYLOAD);

  // New radio / cache row inputs
  const [newRadioLabel, setNewRadioLabel] = useState('');
  const [newRadioFreq, setNewRadioFreq] = useState('');
  const [newRadioNotes, setNewRadioNotes] = useState('');

  const [newCacheLabel, setNewCacheLabel] = useState('');
  const [newCacheLat, setNewCacheLat] = useState('');
  const [newCacheLon, setNewCacheLon] = useState('');
  const [newCacheNotes, setNewCacheNotes] = useState('');
  const [grabbingGps, setGrabbingGps] = useState(false);

  // Auto-lock vault after 5 minutes of being unlocked for physical security
  useEffect(() => {
    if (mode !== 'unlocked') return;
    const timer = setTimeout(() => {
      handleLockVault();
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [mode, data]);

  const handleLockVault = () => {
    setActivePin('');
    setPinInput('');
    setPendingPin('');
    setData(DEFAULT_BLACKBOX_PAYLOAD);
    setSaveBanner(null);
    setErrorMsg(null);
    setMode(hasStoredBlackBox() ? 'locked' : 'setup-pin');
  };

  const handlePinDigit = async (digit: string) => {
    if (busy || pinInput.length >= 4) return;
    setErrorMsg(null);
    const next = pinInput + digit;
    setPinInput(next);

    if (next.length === 4) {
      if (mode === 'locked') {
        setBusy(true);
        try {
          const decrypted = await unlockEncryptedBlackBox(next);
          setData(decrypted);
          setActivePin(next);
          setPinInput('');
          setMode('unlocked');
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Incorrect 4-digit PIN.'
          );
          setPinInput('');
        } finally {
          setBusy(false);
        }
      } else if (mode === 'setup-pin') {
        setPendingPin(next);
        setPinInput('');
        setMode('confirm-pin');
      } else if (mode === 'confirm-pin') {
        if (next !== pendingPin) {
          setErrorMsg('PINs did not match. Start again.');
          setPendingPin('');
          setPinInput('');
          setMode('setup-pin');
          return;
        }
        setBusy(true);
        try {
          const iso = await saveEncryptedBlackBox(next, DEFAULT_BLACKBOX_PAYLOAD);
          setVaultExists(true);
          setLastUpdated(iso);
          setActivePin(next);
          setData(DEFAULT_BLACKBOX_PAYLOAD);
          setPinInput('');
          setPendingPin('');
          setMode('unlocked');
          setSaveBanner('Vault initialized & encrypted with AES-256-GCM.');
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Failed to initialize vault.'
          );
          setPinInput('');
        } finally {
          setBusy(false);
        }
      } else if (mode === 'change-pin') {
        setBusy(true);
        try {
          const iso = await saveEncryptedBlackBox(next, data);
          setActivePin(next);
          setLastUpdated(iso);
          setPinInput('');
          setMode('unlocked');
          setSaveBanner('New 4-digit PIN applied & re-encrypted.');
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Failed to update PIN.'
          );
          setPinInput('');
        } finally {
          setBusy(false);
        }
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setPinInput((p) => p.slice(0, -1));
  };

  const persistData = async (nextPayload: BlackBoxPayload, msg?: string) => {
    if (!activePin) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const iso = await saveEncryptedBlackBox(activePin, nextPayload);
      setData(nextPayload);
      setVaultExists(true);
      setLastUpdated(iso);
      setSaveBanner(msg || 'Encrypted AES-256-GCM · Saved Locally');
      setTimeout(() => setSaveBanner(null), 2600);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Encryption save failed.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddRadio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRadioLabel.trim() || !newRadioFreq.trim()) return;
    const next: BlackBoxPayload = {
      ...data,
      radios: [
        ...data.radios,
        {
          id: `rf-${Date.now()}`,
          label: newRadioLabel.trim(),
          frequency: newRadioFreq.trim(),
          notes: newRadioNotes.trim(),
        },
      ],
    };
    setNewRadioLabel('');
    setNewRadioFreq('');
    setNewRadioNotes('');
    await persistData(next, 'Radio channel encrypted & saved.');
  };

  const handleDeleteRadio = async (id: string) => {
    const next: BlackBoxPayload = {
      ...data,
      radios: data.radios.filter((r) => r.id !== id),
    };
    await persistData(next, 'Radio channel removed.');
  };

  const handleGrabCurrentGps = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setErrorMsg('Geolocation unavailable on this device.');
      return;
    }
    setGrabbingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewCacheLat(pos.coords.latitude.toFixed(5));
        setNewCacheLon(pos.coords.longitude.toFixed(5));
        setGrabbingGps(false);
      },
      () => {
        setErrorMsg('Could not acquire GPS fix. Enter coordinates manually.');
        setGrabbingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddCache = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCacheLabel.trim() || !newCacheLat.trim() || !newCacheLon.trim())
      return;
    const next: BlackBoxPayload = {
      ...data,
      caches: [
        ...data.caches,
        {
          id: `sc-${Date.now()}`,
          label: newCacheLabel.trim(),
          lat: newCacheLat.trim(),
          lon: newCacheLon.trim(),
          notes: newCacheNotes.trim(),
        },
      ],
    };
    setNewCacheLabel('');
    setNewCacheLat('');
    setNewCacheLon('');
    setNewCacheNotes('');
    await persistData(next, 'Secret supply cache encrypted & saved.');
  };

  const handleDeleteCache = async (id: string) => {
    const next: BlackBoxPayload = {
      ...data,
      caches: data.caches.filter((c) => c.id !== id),
    };
    await persistData(next, 'Cache coordinate removed.');
  };

  const handleEmergencyWipe = () => {
    wipeBlackBox();
    setVaultExists(false);
    setLastUpdated(null);
    setConfirmWipe(false);
    setActivePin('');
    setPinInput('');
    setPendingPin('');
    setData(DEFAULT_BLACKBOX_PAYLOAD);
    setErrorMsg(null);
    setMode('setup-pin');
  };

  const keypadPrompt =
    mode === 'locked'
      ? 'Enter 4-Digit PIN to Decrypt Black Box'
      : mode === 'setup-pin'
        ? 'Create 4-Digit Vault PIN (AES-256-GCM)'
        : mode === 'confirm-pin'
          ? 'Re-Enter 4-Digit PIN to Confirm'
          : 'Enter New 4-Digit PIN';

  return (
    <section className="rounded-2xl bg-[#0A0A0A] border border-[#222222] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-wide text-[#F5F5F5]">
            Survivor Black Box Vault
          </h2>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">
            Web Crypto AES-256-GCM encrypted dossier · Blood type, allergies,
            radio freqs & secret caches
          </p>
        </div>
        {mode === 'unlocked' ? (
          <Unlock className="w-6 h-6 text-[#22C55E] shrink-0" />
        ) : (
          <Lock className="w-6 h-6 text-[#FFB300] shrink-0" />
        )}
      </div>

      {!cryptoOk ? (
        <div className="mt-4 rounded-xl bg-[#1C0706] border border-[#FF3B30]/50 p-3.5 text-xs text-[#F5F5F5]">
          Web Crypto API requires HTTPS or localhost to run AES-GCM encryption.
        </div>
      ) : mode !== 'unlocked' ? (
        /* LOCKED / PIN SETUP / CHANGE-PIN KEYPAD */
        <div className="mt-4 rounded-xl bg-black border border-[#222222] p-4 sm:p-5 flex flex-col items-center">
          <div className="text-xs font-semibold text-[#FFB300] text-center">
            {keypadPrompt}
          </div>
          {lastUpdated && mode === 'locked' && (
            <div className="mt-0.5 font-mono text-[11px] text-[#737373] tabular-nums">
              Encrypted vault stored · Last saved{' '}
              {new Date(lastUpdated).toLocaleDateString()}
            </div>
          )}

          {/* 4-Dot PIN Indicator */}
          <div className="mt-4 flex items-center gap-4">
            {[0, 1, 2, 3].map((idx) => {
              const filled = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition ${
                    filled
                      ? 'bg-[#FFB300] border-[#FFB300]'
                      : 'bg-transparent border-[#3A3A3A]'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg && (
            <div className="mt-3 text-xs text-[#FF3B30] font-medium text-center">
              {errorMsg}
            </div>
          )}

          {/* Tactile 3x4 PIN Keypad */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                disabled={busy}
                onClick={() => handlePinDigit(d)}
                className="min-h-[52px] rounded-xl bg-[#0F0F0F] border border-[#262626] font-mono text-xl font-bold text-[#F5F5F5] hover:border-[#FFB300] hover:text-[#FFB300] active:scale-[0.96] transition cursor-pointer disabled:opacity-50"
              >
                {d}
              </button>
            ))}

            {mode === 'change-pin' ? (
              <button
                type="button"
                onClick={() => {
                  setPinInput('');
                  setMode('unlocked');
                }}
                className="min-h-[52px] rounded-xl bg-[#0F0F0F] border border-[#222222] text-xs font-semibold text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <div className="min-h-[52px] flex items-center justify-center text-[10px] font-mono text-[#525252]">
                AES-GCM
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => handlePinDigit('0')}
              className="min-h-[52px] rounded-xl bg-[#0F0F0F] border border-[#262626] font-mono text-xl font-bold text-[#F5F5F5] hover:border-[#FFB300] hover:text-[#FFB300] active:scale-[0.96] transition cursor-pointer disabled:opacity-50"
            >
              0
            </button>

            <button
              type="button"
              disabled={busy || pinInput.length === 0}
              onClick={handleBackspace}
              aria-label="Backspace PIN digit"
              className="min-h-[52px] rounded-xl bg-[#0F0F0F] border border-[#222222] text-[#A3A3A3] hover:text-[#FF3B30] flex items-center justify-center cursor-pointer disabled:opacity-35"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {vaultExists && mode === 'locked' && (
            <div className="mt-5 pt-3 border-t border-[#1A1A1A] w-full flex justify-center">
              {confirmWipe ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEmergencyWipe}
                    className="min-h-[36px] px-3 rounded-lg bg-[#FF3B30] text-white text-xs font-bold cursor-pointer"
                  >
                    Confirm Wipe Vault
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmWipe(false)}
                    className="min-h-[36px] px-3 rounded-lg bg-[#161616] text-xs text-[#A3A3A3] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="text-[11px] text-[#737373] hover:text-[#FF3B30] transition cursor-pointer"
                >
                  Forgot PIN? Wipe & Reset Vault
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* UNLOCKED ENCRYPTED DOSSIER */
        <div className="mt-4 space-y-4">
          {/* Vault Controls Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black border border-[#222222] px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-[#22C55E] font-semibold">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Unlocked · Auto-locks in 5m</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPinInput('');
                  setMode('change-pin');
                }}
                className="min-h-[36px] px-2.5 rounded-lg bg-[#141414] border border-[#262626] text-xs text-[#A3A3A3] hover:text-[#FFB300] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change PIN</span>
              </button>
              <button
                type="button"
                onClick={handleLockVault}
                className="min-h-[36px] px-3 rounded-lg bg-[#FFB300] text-black text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#FFC433] cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Now</span>
              </button>
            </div>
          </div>

          {saveBanner && (
            <div className="rounded-xl bg-[#071A0E] border border-[#22C55E]/40 px-3.5 py-2 text-xs text-[#22C55E] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{saveBanner}</span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl bg-[#1C0706] border border-[#FF3B30]/50 px-3.5 py-2 text-xs text-[#FF3B30]">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Medical ID, Blood Type & Allergies */}
          <div className="rounded-xl bg-black border border-[#222222] p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FF3B30]">
              <HeartPulse className="w-4 h-4" />
              <span>Medical ID, Blood Type & Allergies</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-[#737373] mb-1">
                  Survivor Name / Callsign
                </label>
                <input
                  type="text"
                  value={data.callsign}
                  onChange={(e) =>
                    setData((d) => ({ ...d, callsign: e.target.value }))
                  }
                  placeholder="e.g., Nomad-01"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#0B0B0B] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#737373] mb-1">
                  Blood Type
                </label>
                <select
                  value={data.bloodType}
                  onChange={(e) =>
                    setData((d) => ({ ...d, bloodType: e.target.value }))
                  }
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#0B0B0B] border border-[#262626] font-mono text-xs font-bold text-[#FF3B30] focus:outline-none focus:border-[#FFB300]"
                >
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#737373] mb-1">
                  Emergency Contact / Rally Point
                </label>
                <input
                  type="text"
                  value={data.emergencyContact}
                  onChange={(e) =>
                    setData((d) => ({ ...d, emergencyContact: e.target.value }))
                  }
                  placeholder="Name / Callsign / Frequency"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#0B0B0B] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-[#737373] mb-1">
                  Medical Allergies (Drugs / Food)
                </label>
                <textarea
                  rows={2}
                  value={data.allergies}
                  onChange={(e) =>
                    setData((d) => ({ ...d, allergies: e.target.value }))
                  }
                  placeholder="e.g., Penicillin (anaphylaxis), sulfa drugs, peanuts..."
                  className="w-full p-2.5 rounded-xl bg-[#0B0B0B] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#737373] mb-1">
                  Critical Medications & Conditions
                </label>
                <textarea
                  rows={2}
                  value={data.medications}
                  onChange={(e) =>
                    setData((d) => ({ ...d, medications: e.target.value }))
                  }
                  placeholder="e.g., Asthma inhaler, insulin dosage, blood thinners..."
                  className="w-full p-2.5 rounded-xl bg-[#0B0B0B] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => persistData(data)}
              className="w-full sm:w-auto min-h-[42px] px-4 rounded-xl bg-[#FFB300] text-black text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:bg-[#FFC433] transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Encrypt & Save Medical Profile</span>
            </button>
          </div>

          {/* Section 2: Emergency Radio Frequencies */}
          <div className="rounded-xl bg-black border border-[#222222] p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFB300]">
              <Radio className="w-4 h-4" />
              <span>Emergency Radio Frequencies ({data.radios.length})</span>
            </div>

            <div className="divide-y divide-[#181818]">
              {data.radios.map((r) => (
                <div
                  key={r.id}
                  className="py-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#F5F5F5] truncate">
                      {r.label}{' '}
                      <span className="font-mono text-[#FFB300]">
                        · {r.frequency}
                      </span>
                    </div>
                    {r.notes && (
                      <div className="text-[11px] text-[#737373] truncate">
                        {r.notes}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRadio(r.id)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#737373] hover:text-[#FF3B30] cursor-pointer shrink-0"
                    aria-label={`Delete ${r.label}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddRadio}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-[#1A1A1A]"
            >
              <input
                type="text"
                value={newRadioLabel}
                onChange={(e) => setNewRadioLabel(e.target.value)}
                placeholder="Channel / Group"
                className="sm:col-span-4 min-h-[40px] px-2.5 rounded-lg bg-[#0B0B0B] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
              />
              <input
                type="text"
                value={newRadioFreq}
                onChange={(e) => setNewRadioFreq(e.target.value)}
                placeholder="446.00625 MHz"
                className="sm:col-span-3 min-h-[40px] px-2.5 rounded-lg bg-[#0B0B0B] border border-[#262626] font-mono text-xs text-[#FFB300] focus:outline-none focus:border-[#FFB300]"
              />
              <input
                type="text"
                value={newRadioNotes}
                onChange={(e) => setNewRadioNotes(e.target.value)}
                placeholder="CTCSS tone / schedule"
                className="sm:col-span-3 min-h-[40px] px-2.5 rounded-lg bg-[#0B0B0B] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
              />
              <button
                type="submit"
                disabled={!newRadioLabel.trim() || !newRadioFreq.trim() || busy}
                className="sm:col-span-2 min-h-[40px] rounded-lg bg-[#1A1A1A] border border-[#333333] text-xs font-bold text-[#FFB300] hover:border-[#FFB300] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Section 3: Secret Supply Cache Coordinates */}
          <div className="rounded-xl bg-black border border-[#222222] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#22C55E]">
                <MapPin className="w-4 h-4" />
                <span>Secret Supply Cache Coordinates ({data.caches.length})</span>
              </div>
              <button
                type="button"
                onClick={handleGrabCurrentGps}
                disabled={grabbingGps}
                className="min-h-[34px] px-2.5 rounded-lg bg-[#111111] border border-[#262626] text-[11px] font-semibold text-[#FFB300] hover:border-[#FFB300] inline-flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                <span>{grabbingGps ? 'Fixing...' : 'Grab GPS'}</span>
              </button>
            </div>

            {data.caches.length === 0 ? (
              <p className="text-xs text-[#737373]">
                No encrypted supply caches logged yet. Save buried caches or
                fallback rally coordinates here.
              </p>
            ) : (
              <div className="divide-y divide-[#181818]">
                {data.caches.map((c) => (
                  <div
                    key={c.id}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#F5F5F5] truncate">
                        {c.label}
                      </div>
                      <div className="font-mono text-[11px] text-[#22C55E] tabular-nums">
                        {c.lat}, {c.lon}
                      </div>
                      {c.notes && (
                        <div className="text-[11px] text-[#737373] truncate">
                          {c.notes}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCache(c.id)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#737373] hover:text-[#FF3B30] cursor-pointer shrink-0"
                      aria-label={`Delete cache ${c.label}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleAddCache}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-[#1A1A1A]"
            >
              <input
                type="text"
                value={newCacheLabel}
                onChange={(e) => setNewCacheLabel(e.target.value)}
                placeholder="Cache name (e.g., Pine Ridge Tube)"
                className="sm:col-span-4 min-h-[40px] px-2.5 rounded-lg bg-[#0B0B0B] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
              />
              <input
                type="text"
                value={newCacheLat}
                onChange={(e) => setNewCacheLat(e.target.value)}
                placeholder="Lat (28.6139)"
                className="sm:col-span-2 min-h-[40px] px-2.5 rounded-lg bg-[#0B0B0B] border border-[#262626] font-mono text-xs text-[#22C55E] focus:outline-none focus:border-[#FFB300]"
              />
              <input
                type="text"
                value={newCacheLon}
                onChange={(e) => setNewCacheLon(e.target.value)}
                placeholder="Lon (77.2090)"
                className="sm:col-span-2 min-h-[40px] px-2.5 rounded-lg bg-[#0B0B0B] border border-[#262626] font-mono text-xs text-[#22C55E] focus:outline-none focus:border-[#FFB300]"
              />
              <input
                type="text"
                value={newCacheNotes}
                onChange={(e) => setNewCacheNotes(e.target.value)}
                placeholder="Depth / landmark"
                className="sm:col-span-2 min-h-[40px] px-2.5 rounded-lg bg-[#0B0B0B] border border-[#262626] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#FFB300]"
              />
              <button
                type="submit"
                disabled={
                  !newCacheLabel.trim() ||
                  !newCacheLat.trim() ||
                  !newCacheLon.trim() ||
                  busy
                }
                className="sm:col-span-2 min-h-[40px] rounded-lg bg-[#1A1A1A] border border-[#333333] text-xs font-bold text-[#22C55E] hover:border-[#22C55E] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Store</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
