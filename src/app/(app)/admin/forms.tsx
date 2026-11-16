"use client";

import { useActionState, useState } from "react";
import { createDealer, createUser, resetPassword, type ActionState } from "./actions";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm ${state.ok ? "text-green-700" : "text-danger"}`}>
      {state.message}
    </p>
  );
}

export function DealerForm() {
  const [state, action, pending] = useActionState(createDealer, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="dealer-name" className="mb-1 block text-sm font-medium">
          Nume dealer
        </label>
        <input id="dealer-name" name="name" required className="input" />
      </div>
      <div>
        <label htmlFor="dealer-code" className="mb-1 block text-sm font-medium">
          Cod dealer <span className="font-normal text-gray-400">(opțional)</span>
        </label>
        <input id="dealer-code" name="code" className="input" />
      </div>
      <Feedback state={state} />
      <button disabled={pending} className="btn btn-primary">
        {pending ? "Se adaugă…" : "Adaugă dealer"}
      </button>
    </form>
  );
}

export function UserForm({ dealers }: { dealers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createUser, null);
  const [role, setRole] = useState<"dealer" | "importer">("dealer");
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="user-role" className="mb-1 block text-sm font-medium">
            Tip cont
          </label>
          <select
            id="user-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "dealer" | "importer")}
            className="input"
          >
            <option value="dealer">Dealer</option>
            <option value="importer">Importator</option>
          </select>
        </div>
        {role === "dealer" && (
          <div>
            <label htmlFor="user-dealer" className="mb-1 block text-sm font-medium">
              Dealer
            </label>
            <select id="user-dealer" name="dealer_id" required defaultValue="" className="input">
              <option value="" disabled>
                Alege…
              </option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="user-name" className="mb-1 block text-sm font-medium">
          Nume și prenume
        </label>
        <input id="user-name" name="full_name" required className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="user-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input id="user-email" name="email" type="email" required autoComplete="off" className="input" />
        </div>
        <div>
          <label htmlFor="user-password" className="mb-1 block text-sm font-medium">
            Parolă inițială
          </label>
          <input
            id="user-password"
            name="password"
            type="text"
            required
            minLength={10}
            autoComplete="off"
            className="input font-mono"
          />
        </div>
      </div>
      <Feedback state={state} />
      <button disabled={pending} className="btn btn-primary">
        {pending ? "Se creează…" : "Creează cont"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-primary hover:underline">
        Resetează parola
      </button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <input
        name="password"
        type="text"
        required
        minLength={10}
        placeholder="Parolă nouă"
        aria-label="Parolă nouă"
        autoComplete="off"
        className="input w-44 font-mono"
      />
      <button disabled={pending} className="btn">
        {pending ? "…" : "Salvează"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
