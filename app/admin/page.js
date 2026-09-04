'use client';
import { useState, useEffect } from 'react';
import { PinEntry } from './components/PinEntry.js';
import { AdminShell } from './components/AdminShell.js';

const AUTH_KEY = 'admin_auth';
const AUTH_TTL = 4 * 60 * 60 * 1000;

export default function AdminPage() {
  const [passcode, setPasscode] = useState(null);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (cached && Date.now() - cached.ts < AUTH_TTL) {
        setPasscode(cached.passcode);
      } else {
        localStorage.removeItem(AUTH_KEY);
      }
    } catch {}
  }, []);

  const handleSuccess = (pin) => {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({ passcode: pin, ts: Date.now() })); } catch {}
    setPasscode(pin);
  };

  return passcode ? <AdminShell passcode={passcode} /> : <PinEntry onSuccess={handleSuccess} />;
}
