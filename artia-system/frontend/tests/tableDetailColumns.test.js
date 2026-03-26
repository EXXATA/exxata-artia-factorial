import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TABLE_DETAIL_COLUMNS,
  TABLE_DETAIL_TABLE_MIN_WIDTH,
  getInlineEditorClassName,
  getInlineEditorStackClassName
} from '../src/components/table/tableDetailColumns.js';

test('table detail columns keep a fixed-width layout contract for the detailed table', () => {
  assert.equal(TABLE_DETAIL_COLUMNS.length, 13);
  assert.equal(TABLE_DETAIL_COLUMNS[0].key, 'day');
  assert.equal(TABLE_DETAIL_COLUMNS.at(-1).key, 'activityId');
  assert.equal(TABLE_DETAIL_TABLE_MIN_WIDTH, '1640px');

  for (const column of TABLE_DETAIL_COLUMNS) {
    assert.match(column.width, /^\d+px$/);
  }
});

test('inline editors use compact width-constrained classes', () => {
  const baseClassName = getInlineEditorClassName();
  assert.match(baseClassName, /\bw-full\b/);
  assert.match(baseClassName, /\bmin-w-0\b/);
  assert.doesNotMatch(baseClassName, /min-w-\[/);

  const stackedClassName = getInlineEditorStackClassName();
  assert.match(stackedClassName, /\bmin-w-0\b/);
  assert.match(stackedClassName, /\bw-full\b/);
});
