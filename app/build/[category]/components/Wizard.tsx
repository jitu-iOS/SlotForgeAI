"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BuildAnswers, BuildCategoryDef, QAQuestion } from "@/app/types/build";
import QuestionField from "./QuestionField";

type Theme = "midnight-indigo" | "slate-sapphire" | "obsidian-gold" | "forest-emerald" | "dusk-rose";
const THEME_STORAGE_KEY = "slotforge.theme";

export default function Wizard({ categoryDef }: { categoryDef: BuildCategoryDef }) {
  const router = useRouter();
  const persistKey = `slotforge.wizard.${categoryDef.slug}`;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<BuildAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme + persistence
  useEffect(() => {
    const t = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? "midnight-indigo";
    document.documentElement.dataset.theme = t;
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) setAnswers(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [persistKey]);

  // Persist answers on every change so refresh recovers in-progress sessions
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      try { localStorage.setItem(persistKey, JSON.stringify(answers)); } catch { /* ignore */ }
    }
  }, [answers, persistKey]);

  const totalSteps = categoryDef.steps.length;
  const currentStep = categoryDef.steps[step];

  const validation = useMemo(() => validateStep(currentStep.questions, answers), [currentStep, answers]);

  function setAnswer(id: string, value: BuildAnswers[string]) {
    setAnswers((cur) => ({ ...cur, [id]: value }));
  }

  function next() {
    if (!validation.ok) return;
    setError(null);
    if (step < totalSteps - 1) setStep(step + 1);
  }

  function prev() {
    setError(null);
    if (step > 0) setStep(step - 1);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/build/${categoryDef.slug}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not generate assets");
      const handoff = {
        category: categoryDef.slug,
        label: categoryDef.label,
        answers,
        assets: data.assets,
        generatedAt: new Date().toISOString(),
      };
      sessionStorage.setItem("slotforge.lastBuild", JSON.stringify(handoff));
      try { localStorage.removeItem(persistKey); } catch { /* ignore */ }
      router.push(`/build/${categoryDef.slug}/results`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  }

  const progressPct = ((step + 1) / totalSteps) * 100;
  const isLastStep = step === totalSteps - 1;

  return (
    <main className="min-h-screen bg-[var(--bg-page)] text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--bg-page)]/70 border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
            >
              {categoryDef.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">2D Assets · Wizard</p>
              <p className="text-sm font-semibold tracking-tight truncate">{categoryDef.label}</p>
            </div>
          </div>
          <a href="/project" className="text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.18] transition-colors">
            ← Back to Studio
          </a>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/[0.05]">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--accent-from), var(--accent-to))" }}
          />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
        {/* Intro on step 0 */}
        {step === 0 && (
          <div className="mb-8" style={{ animation: "var(--animate-slide-up)" }}>
            <h1 className="text-3xl font-semibold tracking-tight">{categoryDef.label}</h1>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed max-w-2xl">
              {categoryDef.description} We&apos;ll ask {countQuestions(categoryDef)} questions across {totalSteps} steps, then generate {categoryDef.estimatedAssetCount} production-ready assets.
            </p>
            <p className="text-[11px] text-zinc-500 mt-3">
              Estimated cost: ~${(categoryDef.estimatedAssetCount * 0.19).toFixed(2)} on GPT-Image-1, or free on Pollinations fallback.
            </p>
          </div>
        )}

        {/* Step heading */}
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Step {step + 1} of {totalSteps}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{currentStep.title}</h2>
            {currentStep.subtitle && <p className="text-sm text-zinc-400 mt-1">{currentStep.subtitle}</p>}
          </div>
          <div className="text-[11px] text-zinc-500">{validation.answeredCount} / {validation.requiredCount} required answered</div>
        </div>

        {/* Questions */}
        <div key={step} className="space-y-5" style={{ animation: "var(--animate-slide-up)" }}>
          {currentStep.questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">
            {error}
          </div>
        )}

        {!validation.ok && validation.missing.length > 0 && (
          <p className="mt-4 text-[12px] text-amber-300/80">Missing: {validation.missing.join(", ")}</p>
        )}

        {/* Footer nav */}
        <div className="mt-10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0 || submitting}
            className="h-11 px-5 rounded-xl text-sm text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.22] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Back
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`block h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-[var(--accent-text)]" : i < step ? "w-3 bg-emerald-400" : "w-3 bg-white/15"}`}
              />
            ))}
          </div>

          {isLastStep ? (
            <button
              type="button"
              onClick={submit}
              disabled={!validation.ok || submitting}
              className="h-11 px-6 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
            >
              {submitting ? "Generating… (~1–2 min)" : "Generate assets →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={!validation.ok}
              className="h-11 px-6 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function countQuestions(def: BuildCategoryDef): number {
  return def.steps.reduce((acc, s) => acc + s.questions.length, 0);
}

function isAnswered(q: QAQuestion, v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (q.type === "multi-select" && q.min && Array.isArray(v) && v.length < q.min) return false;
  return true;
}

function validateStep(questions: QAQuestion[], answers: BuildAnswers) {
  const required = questions.filter((q) => "required" in q && q.required === true);
  const missing: string[] = [];
  for (const q of required) {
    if (!isAnswered(q, answers[q.id])) missing.push(q.label);
  }
  const answeredCount = required.filter((q) => isAnswered(q, answers[q.id])).length;
  return { ok: missing.length === 0, missing, requiredCount: required.length, answeredCount };
}
