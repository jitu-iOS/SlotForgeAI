// Types for the 2D Assets guided wizard (Utility App / Board Game / future).
// The Q&A trees are static curated content authored in app/lib/qa/*. AI is only
// used at the END of the wizard to expand the gathered answers into a per-asset
// prompt list and run image generation.

export type BuildCategory = "utility-app" | "board-game";

// All question variants we support in the wizard. Adding a new type here means
// QuestionField.tsx must learn to render it.
export type QAQuestion =
  | { id: string; type: "text";         label: string; help?: string; placeholder?: string; required?: boolean; maxLength?: number }
  | { id: string; type: "longtext";     label: string; help?: string; placeholder?: string; required?: boolean; maxLength?: number; rows?: number }
  | { id: string; type: "number";       label: string; help?: string; min?: number; max?: number; step?: number; required?: boolean; suffix?: string }
  | { id: string; type: "radio";        label: string; help?: string; options: ChoiceOption[]; required?: boolean }
  | { id: string; type: "multi-select"; label: string; help?: string; options: ChoiceOption[]; required?: boolean; min?: number; max?: number }
  | { id: string; type: "color";        label: string; help?: string; required?: boolean }
  | { id: string; type: "toggle";       label: string; help?: string; defaultOn?: boolean }
  | { id: string; type: "toggle-group"; label: string; help?: string; options: ChoiceOption[]; required?: boolean }
  | { id: string; type: "file";         label: string; help?: string; accept: string; maxBytes?: number; required?: boolean }
  | { id: string; type: "url";          label: string; help?: string; placeholder?: string; required?: boolean };

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface QAStep {
  id: string;
  title: string;
  subtitle?: string;
  questions: QAQuestion[];
}

// Per-asset production specification. The prompt expander turns each entry
// into one image-generation request annotated with the dimensions + purpose.
export interface AssetSpec {
  id: string;
  label: string;
  group: string;            // e.g. "App icon", "Mockups", "Cards"
  width: number;
  height: number;
  format: "png" | "jpeg";
  dpi?: number;             // 300 for print-ready board-game assets
  notes?: string;           // hints injected into the prompt
}

export interface BuildCategoryDef {
  slug: BuildCategory;
  label: string;
  short: string;
  icon: string;
  tagline: string;
  description: string;
  steps: QAStep[];
  assets: AssetSpec[];
  // Estimated cost per build at default model (gpt-image-1 ~ $0.19/img). Used
  // to surface a one-line cost note in the wizard intro.
  estimatedAssetCount: number;
}

// All collected answers keyed by question.id.
export type BuildAnswers = Record<string, AnswerValue>;

export type AnswerValue =
  | string
  | string[]
  | number
  | boolean
  | { fileId: string; filename: string; bytes: number; mime: string }
  | undefined;

// What the wizard hands to /api/build/[category]/generate
export interface BuildSubmission {
  category: BuildCategory;
  answers: BuildAnswers;
  referenceUrl?: string;
  uploadedFileId?: string;
}

// What the prompt expander produces — one entry per AssetSpec.
export interface ExpandedAssetPrompt {
  specId: string;
  label: string;
  group: string;
  width: number;
  height: number;
  prompt: string;
}
