function buildHelperText(value, allowDayEnd) {
  if (value === '24:00') {
    return 'Encerrando no fim do dia.';
  }

  if (allowDayEnd) {
    return 'Precisao de 1 minuto. Use 24:00 para fechar o dia.';
  }

  return 'Precisao de 1 minuto.';
}

export default function MinuteTimeField({
  allowDayEnd = false,
  disabled = false,
  label,
  onChange,
  value
}) {
  const isDayEnd = value === '24:00';

  return (
    <div className="space-y-2">
      <label className="ui-label">{label}</label>
      {isDayEnd ? (
        <div className="ui-input flex min-h-[44px] items-center justify-between gap-3">
          <span className="ui-mono font-medium">24:00</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Fim do dia</span>
        </div>
      ) : (
        <input
          type="time"
          step="60"
          value={value}
          onChange={(inputEvent) => onChange(inputEvent.target.value)}
          className="ui-input w-full"
          disabled={disabled}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{buildHelperText(value, allowDayEnd)}</span>
        {allowDayEnd ? (
          <button
            type="button"
            onClick={() => onChange(isDayEnd ? '23:59' : '24:00')}
            disabled={disabled}
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            {isDayEnd ? 'Usar 23:59' : 'Usar 24:00'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
