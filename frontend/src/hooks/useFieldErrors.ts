import { useCallback, useState } from 'react';

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

function focusField(field: string) {
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(`[data-field="${field}"]`);
    if (!target) return;
    target.focus();
    if (typeof (target as HTMLInputElement).select === 'function') {
      try {
        (target as HTMLInputElement).select();
      } catch {
        /* ignore non-selectable controls */
      }
    }
  });
}

export function useFieldErrors<T extends string>() {
  const [errors, setErrors] = useState<FieldErrors<T>>({});

  const clearError = useCallback((field: T) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldErrors = useCallback((next: FieldErrors<T>) => {
    setErrors(next);
    const firstInvalid = (Object.keys(next) as T[]).find((key) => Boolean(next[key]));
    if (firstInvalid) focusField(firstInvalid);
  }, []);

  return {
    errors,
    setFieldErrors,
    clearError,
    clearAllErrors,
  };
}
