'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, KeyRound, Loader2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F2D24]/65 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-[#163D32]/15 bg-[#F5F0E6] p-6 shadow-2xl text-[#26312D] tule-modal-pop"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                tone === 'danger'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-[#163D32]/10 text-[#163D32]'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 id={titleId} className="text-lg font-extrabold text-[#163D32] leading-snug">
              {title}
            </h2>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Close dialog"
            className="rounded-xl p-1.5 text-[#52645D] hover:bg-[#163D32]/10 hover:text-[#163D32] transition disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p id={descId} className="mt-3 text-sm leading-relaxed text-[#26312D]/85">
          {description}
        </p>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-[#163D32]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#26312D] hover:bg-[#EDE8DC] transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#F5F0E6] shadow-md transition disabled:opacity-60 ${
              tone === 'danger'
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-[#163D32] hover:bg-[#0F2D24]'
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PromptDialogProps {
  open: boolean;
  title: string;
  description: string;
  inputLabel: string;
  inputType?: 'text' | 'password';
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  minLength?: number;
  busy?: boolean;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
}

export function PromptDialog({
  open,
  title,
  description,
  inputLabel,
  inputType = 'text',
  placeholder = '',
  confirmLabel = 'Submit',
  cancelLabel = 'Cancel',
  minLength = 1,
  busy = false,
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const titleId = useId();
  const inputId = useId();
  const [value, setValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      setValue('');
      setValidationError(null);
      inputRef.current?.focus();
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      setValidationError(`Please enter at least ${minLength} characters.`);
      return;
    }
    setValidationError(null);
    await onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F2D24]/65 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-[#163D32]/15 bg-[#F5F0E6] p-6 shadow-2xl text-[#26312D] tule-modal-pop"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#163D32]/10 text-[#163D32]">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 id={titleId} className="text-lg font-extrabold text-[#163D32] leading-snug">
              {title}
            </h2>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Close dialog"
            className="rounded-xl p-1.5 text-[#52645D] hover:bg-[#163D32]/10 hover:text-[#163D32] transition disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#26312D]/85">{description}</p>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor={inputId}
              className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-[#52645D]"
            >
              {inputLabel}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type={inputType}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={placeholder}
              disabled={busy}
              className="w-full rounded-xl border border-[#163D32]/20 bg-white px-3.5 py-2.5 text-sm text-[#26312D] outline-none focus:border-[#163D32] focus:ring-2 focus:ring-[#163D32]/15"
            />
            {validationError && (
              <p role="alert" className="mt-1.5 text-xs font-semibold text-red-700">
                {validationError}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl border border-[#163D32]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#26312D] hover:bg-[#EDE8DC] transition disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#163D32] hover:bg-[#0F2D24] px-5 py-2.5 text-sm font-bold text-[#F5F0E6] shadow-md transition disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

