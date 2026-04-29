"use client";

import { useState } from "react";
import type { QAQuestion, AnswerValue, ChoiceOption } from "@/app/types/build";

export default function QuestionField({
  question, value, onChange,
}: {
  question: QAQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <label className="text-sm font-semibold tracking-tight text-zinc-100">
          {question.label}
          {"required" in question && question.required && <span className="text-rose-300 ml-1">*</span>}
        </label>
        {question.type === "multi-select" && (
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">multi-select</span>
        )}
      </div>
      {question.help && <p className="text-xs text-zinc-500 -mt-1 mb-3 leading-relaxed">{question.help}</p>}

      {renderControl(question, value, onChange)}
    </div>
  );
}

function renderControl(q: QAQuestion, value: AnswerValue, onChange: (v: AnswerValue) => void) {
  switch (q.type) {
    case "text":
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder}
          maxLength={q.maxLength}
          className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none px-3.5 text-sm"
        />
      );

    case "longtext":
      return (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder}
          maxLength={q.maxLength}
          rows={q.rows ?? 3}
          className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none px-3.5 py-2.5 text-sm leading-relaxed resize-y"
        />
      );

    case "number":
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            min={q.min}
            max={q.max}
            step={q.step ?? 1}
            className="w-32 h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none px-3.5 text-sm"
          />
          {q.suffix && <span className="text-xs text-zinc-400">{q.suffix}</span>}
        </div>
      );

    case "color":
      return (
        <ColorPicker value={typeof value === "string" ? value : "#6366f1"} onChange={(v) => onChange(v)} />
      );

    case "radio":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {q.options.map((o) => <Chip key={o.value} option={o} active={value === o.value} onClick={() => onChange(o.value)} />)}
        </div>
      );

    case "multi-select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {q.options.map((o) => {
            const isOn = selected.includes(o.value);
            return (
              <Chip
                key={o.value}
                option={o}
                active={isOn}
                onClick={() => {
                  if (isOn) onChange(selected.filter((x) => x !== o.value));
                  else if (!q.max || selected.length < q.max) onChange([...selected, o.value]);
                }}
              />
            );
          })}
        </div>
      );
    }

    case "toggle":
      return (
        <Toggle on={Boolean(value ?? q.defaultOn)} onToggle={(v) => onChange(v)} label={q.label} />
      );

    case "toggle-group": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-2">
          {q.options.map((o) => {
            const isOn = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(isOn ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
                className={`text-xs font-medium px-3 py-2 rounded-lg border transition ${
                  isOn ? "bg-[var(--accent-text)]/15 border-[var(--accent-text)] text-white" : "bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-white/[0.22]"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "url":
      return (
        <input
          type="url"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder ?? "https://…"}
          className="w-full h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none px-3.5 text-sm font-mono"
        />
      );

    case "file":
      return <FileField q={q} value={value} onChange={onChange} />;

    default:
      return null;
  }
}

function Chip({ option, active, onClick }: { option: ChoiceOption; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border px-3 py-2.5 transition ${
        active
          ? "bg-[var(--accent-text)]/15 border-[var(--accent-text)] shadow-[0_0_0_1px_var(--accent-text)] text-white"
          : "bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-white/[0.22] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center gap-2">
        {option.icon && <span className="text-base">{option.icon}</span>}
        <span className="text-sm font-medium">{option.label}</span>
        {active && <span className="ml-auto text-emerald-300 text-xs">✓</span>}
      </div>
      {option.description && <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{option.description}</p>}
    </button>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-16 rounded-xl bg-transparent border border-white/[0.08] cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:outline-none px-3.5 text-sm font-mono"
      />
    </div>
  );
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onToggle(!on)}
      className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-white/[0.12]"}`}
    >
      <span className={`absolute h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function FileField({
  q, value, onChange,
}: {
  q: Extract<QAQuestion, { type: "file" }>;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const current = value && typeof value === "object" && "filename" in value ? value : null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (q.maxBytes && file.size > q.maxBytes) {
      setErr(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB · max ${(q.maxBytes / 1024 / 1024).toFixed(0)} MB)`);
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/build/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      onChange({ fileId: data.fileId, filename: data.filename, bytes: file.size, mime: file.type });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block">
        <input
          type="file"
          accept={q.accept}
          onChange={onPick}
          disabled={uploading}
          className="hidden"
        />
        <div className={`rounded-xl border-2 border-dashed px-5 py-6 text-center cursor-pointer transition ${
          current ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/[0.12] hover:border-[var(--accent-text)] bg-white/[0.02]"
        }`}>
          {uploading ? (
            <p className="text-sm text-zinc-400">Uploading…</p>
          ) : current ? (
            <>
              <p className="text-sm text-emerald-200 font-medium">✓ {current.filename}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{(current.bytes / 1024).toFixed(0)} KB · click to replace</p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-300 font-medium">Click or drop a file</p>
              <p className="text-[11px] text-zinc-500 mt-1">Accepted: {q.accept}{q.maxBytes ? ` · max ${(q.maxBytes / 1024 / 1024).toFixed(0)} MB` : ""}</p>
            </>
          )}
        </div>
      </label>
      {err && <p className="text-[11px] text-rose-300 mt-2">{err}</p>}
      {current && (
        <button type="button" onClick={() => onChange(undefined)} className="text-[11px] text-zinc-500 hover:text-zinc-200 mt-2">
          Remove
        </button>
      )}
    </div>
  );
}
