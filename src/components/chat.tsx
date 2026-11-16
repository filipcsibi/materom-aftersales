"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_FILE_BYTES } from "@/lib/ticket-fields";
import { TECH_SOURCE, type Source } from "@/lib/sources";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { Role } from "@/lib/auth";
import type { Message, MessageFile } from "@/lib/types";

const COLUMNS = "id, sender_id, sender_role, sender_name, body, attachments, created_at";

function extension(name: string) {
  const m = /\.[A-Za-z0-9]{1,8}$/.exec(name);
  return m ? m[0].toLowerCase() : "";
}

export function Chat({
  ticketId,
  initial,
  myId,
  canPost,
  myRole,
  source = TECH_SOURCE,
}: {
  ticketId: string;
  initial: Message[];
  myId: string;
  canPost: boolean;
  myRole: Role;
  source?: Source;
}) {
  const { messages: table = "tech_messages", fk, bucket } = source;
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function add(incoming: Message[]) {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }

  useEffect(() => {
    // Catch up on anything sent while the live subscription was not ready yet:
    // after the server render, and again after every reconnect.
    const catchUp = async () => {
      const { data } = await supabase
        .from(table)
        .select(COLUMNS)
        .eq(fk, ticketId)
        .order("created_at");
      if (data) add(data as Message[]);
    };
    const channel = supabase
      .channel(`${table}:${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `${fk}=eq.${ticketId}` },
        (payload) => add([payload.new as Message]),
      )
      // The database side of the subscription becomes ready a moment after the
      // socket reports SUBSCRIBED; this event marks that point.
      .on("system", {}, (payload: { extension?: string; status?: string }) => {
        if (payload.extension === "postgres_changes" && payload.status === "ok") catchUp();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") catchUp();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, ticketId, table, fk]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  // Turn-based: the importer can always write; the dealer only in reply to the importer.
  const last = messages[messages.length - 1];
  const myTurn = myRole === "importer" || last?.sender_role === "importer";

  async function send() {
    const body = text.trim();
    if ((!body && files.length === 0) || sending || !myTurn) return;
    setSending(true);
    setError(null);
    try {
      const uploaded: MessageFile[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" depășește ${formatBytes(MAX_FILE_BYTES)}.`);
        const path = `${ticketId}/chat/${crypto.randomUUID()}${extension(file.name)}`;
        const up = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
        if (up.error) throw new Error(`"${file.name}": ${up.error.message}`);
        uploaded.push({ path, name: file.name, mime: file.type || null, size: file.size });
      }
      // sender_* are filled in by a database trigger from the session.
      const { data, error: insErr } = await supabase
        .from(table)
        .insert({ [fk]: ticketId, sender_id: myId, body, attachments: uploaded })
        .select(COLUMNS)
        .single();
      if (insErr) throw new Error(insErr.message);
      add([data as Message]);
      setText("");
      setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mesajul nu a putut fi trimis.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">Niciun mesaj încă.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <span className="mb-0.5 text-xs text-gray-500">
                {m.sender_name} · {roleLabel(m.sender_role)} · {formatDateTime(m.created_at)}
              </span>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  mine ? "bg-primary text-white" : "bg-gray-100 text-gray-900"
                }`}
              >
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {m.attachments.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${m.body ? "mt-2" : ""}`}>
                    {m.attachments.map((f) => (
                      <ChatFile key={f.path} file={f} mine={mine} bucket={bucket} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canPost && !myTurn ? (
        <p className="border-t border-line p-4 text-center text-sm text-gray-500">
          {last
            ? "Mesajul a fost trimis. Poți scrie din nou după ce răspunde importatorul."
            : "Solicitarea a fost trimisă. Vei putea scrie un mesaj după ce răspunde importatorul."}
        </p>
      ) : canPost ? (
        <div className="border-t border-line p-3">
          {error && <p className="mb-2 text-xs text-danger">{error}</p>}
          {files.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2 text-xs">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1">
                  <span className="max-w-40 truncate">{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Elimină ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-gray-500 hover:text-danger"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Scrie un mesaj… (Enter trimite, Shift+Enter rând nou)"
            className="input resize-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="btn" disabled={sending}>
              Atașează
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || (!text.trim() && files.length === 0)}
              className="btn btn-primary ml-auto"
            >
              {sending ? "Se trimite…" : "Trimite"}
            </button>
          </div>
        </div>
      ) : (
        <p className="border-t border-line p-4 text-center text-sm text-gray-500">
          Tichetul este închis. Nu se mai pot trimite mesaje.
        </p>
      )}
    </div>
  );
}

function roleLabel(role: Role) {
  return role === "importer" ? "Importator" : "Dealer";
}

function ChatFile({ file, mine, bucket }: { file: MessageFile; mine: boolean; bucket: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [url, setUrl] = useState<string | null>(null);
  const isImage = file.mime?.startsWith("image/") ?? false;

  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from(bucket)
      .createSignedUrl(file.path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, file.path, bucket]);

  if (isImage) {
    return (
      <a href={url ?? "#"} target="_blank" rel="noreferrer" title={file.name}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} className="h-28 w-28 rounded object-cover" />
        ) : (
          <span className="block h-28 w-28 rounded bg-black/10" />
        )}
      </a>
    );
  }
  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className={`rounded border px-2 py-1 text-xs underline-offset-2 hover:underline ${
        mine ? "border-white/40" : "border-gray-300 bg-white"
      }`}
    >
      {file.name} <span className="opacity-70">{formatBytes(file.size)}</span>
    </a>
  );
}
