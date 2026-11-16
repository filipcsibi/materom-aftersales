"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="shrink-0 rounded border border-line px-1.5 text-xs text-gray-500 opacity-0 transition hover:border-primary hover:text-primary focus:opacity-100 group-hover:opacity-100"
    >
      {done ? "Copiat" : "Copy"}
    </button>
  );
}
