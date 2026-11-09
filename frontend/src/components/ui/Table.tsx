import type { ReactNode } from 'react';
import './Table.css';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found',
}: TableProps<T>) {
  if (rows.length === 0) {
    return <div className="ui-table__empty">{emptyMessage}</div>;
  }

  return (
    <div className="ui-table__wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
