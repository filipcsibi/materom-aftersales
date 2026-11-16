"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_CATEGORIES, MAX_FILE_BYTES } from "@/lib/ticket-fields";
import { TECH_SOURCE, type Source } from "@/lib/sources";

type Category = { key: string; label: string; required: boolean };
import { formatBytes } from "@/lib/format";
import type { Attachment } from "@/lib/types";

function extension(name: string) {
  const m = /\.[A-Za-z0-9]{1,8}$/.exec(name);
  return m ? m[0].toLowerCase() : "";
}

export function AttachedList({
  ticketId,
  initial,
  editable,
  missing = [],
  source = TECH_SOURCE,
  categories = ATTACHMENT_CATEGORIES,
}: {
  ticketId: string;
  initial: Attachment[];
  editable: boolean;
  missing?: string[];
  source?: Source;
  categories?: readonly Category[];
}) {
  const { attachments: table, fk, bucket } = source;
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initial);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Signed URLs for anything we have not resolved yet (private bucket).
  useEffect(() => {
    const need = items.map((i) => i.storage_path).filter((p) => !(p in urls));
    if (need.length === 0) return;
    let cancelled = false;
    supabase.storage
      .from(bucket)
      .createSignedUrls(need, 3600)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setUrls((prev) => {
          const next = { ...prev };
          for (const d of data) if (d.path && d.signedUrl) next[d.path] = d.signedUrl;
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [items, urls, supabase, bucket]);

  async function upload(category: string, kind: "image" | "file", files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(`${category}:${kind}`);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) {
          setError(`"${file.name}" depășește limita de ${formatBytes(MAX_FILE_BYTES)}.`);
          continue;
        }
        const path = `${ticketId}/${category}/${crypto.randomUUID()}${extension(file.name)}`;
        const up = await supabase.storage
          .from(bucket)
          .upload(path, file, { contentType: file.type || undefined });
        if (up.error) {
          setError(`"${file.name}": ${up.error.message}`);
          continue;
        }
        const { data, error: insErr } = await supabase
          .from(table)
          .insert({
            [fk]: ticketId,
            category,
            kind,
            storage_path: path,
            file_name: file.name,
            mime_type: file.type || null,
            size_bytes: file.size,
          })
          .select("id, category, kind, storage_path, file_name, mime_type, size_bytes")
          .single();
        if (insErr || !data) {
          await supabase.storage.from(bucket).remove([path]);
          setError(`"${file.name}": ${insErr?.message ?? "nu a putut fi salvat"}`);
          continue;
        }
        setItems((prev) => [...prev, data as unknown as Attachment]);
      }
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: Attachment) {
    setError(null);
    const { error: delErr } = await supabase.from(table).delete().eq("id", item.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    await supabase.storage.from(bucket).remove([item.storage_path]);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

      {categories.map((cat) => {
        const images = items.filter((i) => i.category === cat.key && i.kind === "image");
        const files = items.filter((i) => i.category === cat.key && i.kind === "file");
        const isMissing = missing.includes(cat.key) && images.length + files.length === 0;
        if (!editable && images.length + files.length === 0) {
          return (
            <section key={cat.key} className="rounded-md border border-line">
              <h3 className="border-b border-line px-5 py-3 text-sm font-semibold">{cat.label}</h3>
              <p className="px-5 py-4 text-sm text-gray-400">Niciun fișier.</p>
            </section>
          );
        }
        return (
          <section key={cat.key} className={`rounded-md border ${isMissing ? "border-danger" : "border-line"}`}>
            <h3 className="border-b border-line px-5 py-3 text-sm font-semibold">
              {cat.required && <span className="mr-1 text-danger">*</span>}
              {cat.label}
            </h3>
            <div className="space-y-4 px-5 py-4">
              <div className="flex flex-wrap gap-3">
                {images.map((img) => (
                  <Thumb
                    key={img.id}
                    item={img}
                    url={urls[img.storage_path]}
                    onRemove={editable ? () => remove(img) : undefined}
                  />
                ))}
                {editable && (
                  <PickTile
                    busy={busy === `${cat.key}:image`}
                    onPick={(f) => upload(cat.key, "image", f)}
                  />
                )}
              </div>

              {(editable || files.length > 0) && <hr className="border-line" />}

              {files.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center gap-3">
                      <a
                        href={urls[f.storage_path] ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        {f.file_name}
                      </a>
                      <span className="shrink-0 text-xs text-gray-400">{formatBytes(f.size_bytes)}</span>
                      {editable && (
                        <button type="button" onClick={() => remove(f)} className="shrink-0 text-xs text-danger hover:underline">
                          Șterge
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {editable && (
                <PickButton busy={busy === `${cat.key}:file`} onPick={(f) => upload(cat.key, "file", f)} />
              )}
              {isMissing && <p className="text-xs text-danger">Cel puțin un fișier este obligatoriu.</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Thumb({ item, url, onRemove }: { item: Attachment; url?: string; onRemove?: () => void }) {
  const isVideo = item.mime_type?.startsWith("video/");
  return (
    <div className="group relative h-24 w-24 overflow-hidden rounded-md border border-line bg-gray-50">
      <a href={url ?? "#"} target="_blank" rel="noreferrer" title={item.file_name} className="block h-full w-full">
        {isVideo ? (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-center text-xs text-gray-600">
            <span className="text-xl">▶</span>
            <span className="line-clamp-2 break-all">{item.file_name}</span>
          </span>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={item.file_name} className="h-full w-full object-cover" />
        ) : null}
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Șterge ${item.file_name}`}
          className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}

function PickTile({ busy, onPick }: { busy: boolean; onPick: (f: FileList | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-600 transition hover:border-primary hover:text-primary disabled:opacity-60"
      >
        {busy ? (
          "Se încarcă…"
        ) : (
          <>
            <span className="text-lg leading-none">+</span>
            <span>Images</span>
            <span>Upload</span>
          </>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}

function PickButton({ busy, onPick }: { busy: boolean; onPick: (f: FileList | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn">
        {busy ? "Se încarcă…" : "+ Upload Attachment"}
      </button>
      <input
        ref={ref}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}
