"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setMessage({ ok: false, text: "Parola trebuie să aibă cel puțin 10 caractere." });
    if (password !== confirm) return setMessage({ ok: false, text: "Parolele nu coincid." });
    setPending(true);
    const { error } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (error) return setMessage({ ok: false, text: error.message });
    setPassword("");
    setConfirm("");
    setMessage({ ok: true, text: "Parola a fost schimbată." });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
          Parolă nouă
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">
          Confirmă parola
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input"
        />
      </div>
      {message && (
        <p role="status" className={`text-sm ${message.ok ? "text-green-700" : "text-danger"}`}>
          {message.text}
        </p>
      )}
      <button disabled={pending} className="btn btn-primary">
        {pending ? "Se salvează…" : "Schimbă parola"}
      </button>
    </form>
  );
}
