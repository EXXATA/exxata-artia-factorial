import { useEffect, useRef } from 'react';
import { WORKPLACE_OPTIONS } from './tableEditingUtils.js';
import { getInlineEditorClassName, getInlineEditorStackClassName } from './tableDetailColumns.js';

function focusElement(element, { selectText = false, openPicker = false } = {}) {
  if (!element) {
    return;
  }

  element.focus();

  if (selectText && typeof element.select === 'function') {
    element.select();
  }

  if (openPicker && typeof element.showPicker === 'function') {
    try {
      element.showPicker();
    } catch (error) {
      // Ignore browsers that block picker opening without a direct gesture.
    }
  }
}

function useAutofocus(ref, { enabled = false, selectText = false, openPicker = false } = {}) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const frameId = requestAnimationFrame(() => {
      focusElement(ref.current, { selectText, openPicker });
    });

    return () => cancelAnimationFrame(frameId);
  }, [enabled, openPicker, ref, selectText]);
}

export function InlineInput({ autoFocus = false, className = '', type = 'text', ...props }) {
  const inputRef = useRef(null);
  useAutofocus(inputRef, {
    enabled: autoFocus,
    selectText: type === 'text',
    openPicker: type === 'date' || type === 'time'
  });

  return (
    <input
      {...props}
      ref={inputRef}
      type={type}
      className={getInlineEditorClassName(className)}
    />
  );
}

export function InlineSelect({
  autoFocus = false,
  autoOpen = false,
  children,
  className = '',
  ...props
}) {
  const selectRef = useRef(null);
  useAutofocus(selectRef, {
    enabled: autoFocus,
    openPicker: autoOpen
  });

  return (
    <select
      {...props}
      ref={selectRef}
      className={getInlineEditorClassName(className)}
    >
      {children}
    </select>
  );
}

export function InlineStatusEditor({ autoFocus = false, draft, onDraftChange }) {
  const checkboxRef = useRef(null);
  useAutofocus(checkboxRef, { enabled: autoFocus });

  return (
    <div className={getInlineEditorStackClassName()}>
      <label className="inline-flex items-center gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={draft.artiaLaunched}
          onChange={(inputEvent) => onDraftChange({
            artiaLaunched: inputEvent.target.checked,
            workplace: draft.workplace
          })}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
        />
        <span>Lancado no Artia</span>
      </label>
      <InlineSelect
        value={draft.workplace}
        onChange={(inputEvent) => onDraftChange({
          artiaLaunched: draft.artiaLaunched,
          workplace: inputEvent.target.value
        })}
      >
        <option value="">Sem local definido</option>
        {WORKPLACE_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </InlineSelect>
    </div>
  );
}
