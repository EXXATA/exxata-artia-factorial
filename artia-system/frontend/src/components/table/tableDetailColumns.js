export const TABLE_DETAIL_TABLE_MIN_WIDTH = '1640px';

export const TABLE_DETAIL_COLUMNS = Object.freeze([
  { key: 'day', label: 'Data', width: '112px' },
  { key: 'source', label: 'Origem', width: '80px' },
  { key: 'project', label: 'Projeto', width: '210px' },
  { key: 'start', label: 'Hora inicio', width: '92px' },
  { key: 'end', label: 'Hora de termino', width: '92px' },
  { key: 'effort', label: 'Esforco', width: '80px' },
  { key: 'dayEffort', label: 'Esforco dia', width: '90px' },
  { key: 'factorial', label: 'Factorial dia', width: '90px' },
  { key: 'activity', label: 'Atividade', width: '220px' },
  { key: 'notes', label: 'Observacao', width: '190px' },
  { key: 'status', label: 'Status Artia', width: '200px' },
  { key: 'remoteEntry', label: 'Registro Artia', width: '100px' },
  { key: 'activityId', label: 'ID', width: '84px' }
]);

export function getInlineEditorClassName(extraClassName = '') {
  return [
    'ui-table-cell-input',
    'w-full',
    'min-w-0',
    'max-w-full',
    extraClassName
  ].filter(Boolean).join(' ');
}

export function getInlineEditorStackClassName(extraClassName = '') {
  return [
    'flex',
    'w-full',
    'min-w-0',
    'flex-col',
    'gap-2',
    extraClassName
  ].filter(Boolean).join(' ');
}

export function getReadOnlyClampClassName(extraClassName = '') {
  return [
    'block',
    'overflow-hidden',
    'text-ellipsis',
    'whitespace-nowrap',
    extraClassName
  ].filter(Boolean).join(' ');
}
