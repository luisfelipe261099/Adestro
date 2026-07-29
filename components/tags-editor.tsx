"use client";

import { useState } from "react";

export type TagsEditorProps = {
  clientId: string;
  initialTags: string[];
  className?: string;
  onChange?: (tags: string[]) => void;
};

const SUGGESTED = ["VIP", "Inadimplente", "Alta-complexidade", "Reativo", "Filhote", "Sênior"];

export function TagsEditor({ clientId, initialTags, className = "", onChange }: TagsEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function persist(nextTags: string[]) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/clients/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, tags: nextTags }),
      });
      if (!response.ok) throw new Error("Falha ao salvar tags");
      const data = await response.json();
      const final: string[] = Array.isArray(data.tags) ? data.tags : nextTags;
      setTags(final);
      onChange?.(final);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  function addTag(value: string) {
    const clean = value.trim();
    if (!clean) return;
    if (tags.includes(clean)) return;
    if (tags.length >= 12) {
      setError("Máximo de 12 tags por cliente");
      return;
    }
    persist([...tags, clean]);
    setDraft("");
  }

  function removeTag(value: string) {
    persist(tags.filter((tag) => tag !== value));
  }

  const remainingSuggestions = SUGGESTED.filter((s) => !tags.includes(s));

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-0.5 text-[12px] font-bold text-sky-900"
        >
          🏷️ {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            disabled={saving}
            className="ml-0.5 text-sky-700 hover:text-rose-600 disabled:opacity-40"
            aria-label={`Remover ${tag}`}
          >
            ✕
          </button>
        </span>
      ))}

      <details className="inline-block">
        <summary className="cursor-pointer list-none rounded-full border border-dashed border-slate-300 bg-white px-2 py-0.5 text-[12px] font-semibold text-slate-500 hover:border-sky-400 hover:text-sky-700">
          + tag
        </summary>
        <div className="absolute z-30 mt-1 w-56 rounded-md border border-[var(--border)] bg-white p-2 shadow-lg">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag(draft);
              }
            }}
            placeholder="Nova tag (Enter)"
            maxLength={40}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-sky-400"
          />
          {remainingSuggestions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {remainingSuggestions.slice(0, 6).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addTag(suggestion)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] text-slate-700 hover:bg-[var(--surface-2)]"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          {error ? <p className="mt-1 text-[12px] text-rose-700">{error}</p> : null}
        </div>
      </details>
    </div>
  );
}
