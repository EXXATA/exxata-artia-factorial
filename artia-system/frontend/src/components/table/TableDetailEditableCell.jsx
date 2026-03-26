export default function TableDetailEditableCell({
  active = false,
  children,
  className = '',
  columnKey,
  editable = false,
  hasError = false,
  isSaving = false,
  onActivate,
  onBlur,
  onKeyDown
}) {
  const cellClassName = [
    'ui-table-cell',
    editable ? 'ui-table-cell-editable' : '',
    active ? 'ui-table-cell-active' : '',
    isSaving ? 'ui-table-cell-saving' : '',
    hasError ? 'ui-table-cell-error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      data-column-key={columnKey}
      className={cellClassName}
      onBlur={editable ? (focusEvent) => {
        if (focusEvent.currentTarget.contains(focusEvent.relatedTarget)) {
          return;
        }

        onBlur?.();
      } : undefined}
      onKeyDown={editable ? onKeyDown : undefined}
      onMouseDown={editable ? (mouseEvent) => {
        if (active) {
          return;
        }

        const activationMode = onActivate?.();
        if (activationMode !== 'queued') {
          mouseEvent.preventDefault();
        }
      } : undefined}
    >
      {children}
    </div>
  );
}
