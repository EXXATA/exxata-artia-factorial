import { getAutosaveStatusPresentation } from './tableAutosaveStatus.js';

const STATUS_TONE_CLASSNAME = Object.freeze({
  idle: 'text-slate-400 dark:text-slate-500',
  saved: 'text-slate-500 dark:text-slate-400',
  saving: 'text-sky-600 dark:text-sky-300',
  error: 'text-amber-600 dark:text-amber-300'
});

export default function TableAutosaveStatus({
  isSaving = false,
  lastSavedAt = null,
  lastErrorMessage = null
}) {
  const presentation = getAutosaveStatusPresentation({
    isSaving,
    lastSavedAt,
    lastErrorMessage
  });

  return (
    <div
      aria-live="polite"
      title={presentation.label}
      className={`px-1 text-[11px] ${STATUS_TONE_CLASSNAME[presentation.tone] || STATUS_TONE_CLASSNAME.idle}`}
    >
      {presentation.label}
    </div>
  );
}
