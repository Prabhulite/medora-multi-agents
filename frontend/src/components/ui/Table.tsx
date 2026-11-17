import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader } from './Loader';
import './Table.css';

export interface TableColumn<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T, index: number) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  onRefresh?: () => void;
  showIndex?: boolean;
  loading?: boolean;
  serverPagination?: { page: number; pageSize: number; total: number; search: string; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void; onSearchChange: (search: string) => void };
}

const PAGE_SIZES = [10, 25, 50, 100];

function EmptyInboxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 8.5h15v9.2a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V8.5z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 8.5 7.2 4.8h9.6l2.7 3.7"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.2 12.2h5.6M4.5 12.2h3.2l1.4 2.2h5.8l1.4-2.2h3.2"
      />
    </svg>
  );
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'No records found',
  searchPlaceholder = 'Search...',
  searchText,
  onRefresh,
  showIndex = true,
  loading = false,
  serverPagination,
}: TableProps<T>) {
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    if (serverPagination) return rows;
    const normalized = query.trim().toLowerCase();
    if (!normalized || !searchText) return rows;
    return rows.filter((row) => searchText(row).toLowerCase().includes(normalized));
  }, [query, rows, searchText, serverPagination]);

  const effectivePage = serverPagination?.page ?? page;
  const effectivePageSize = serverPagination?.pageSize ?? pageSize;
  const effectiveTotal = serverPagination?.total ?? filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / effectivePageSize));

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, rows]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    if (serverPagination) return filteredRows;
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize, serverPagination]);

  const rangeStart = effectiveTotal === 0 ? 0 : (effectivePage - 1) * effectivePageSize + 1;
  const rangeEnd = Math.min(effectivePage * effectivePageSize, effectiveTotal);

  return (
    <div className="ui-table-panel">
      <div className="ui-table-toolbar">
        <div className="ui-table-toolbar__left">
          <label className="ui-table-toolbar__entries">
            Show
            <select
              value={effectivePageSize}
              onChange={(event) => serverPagination ? serverPagination.onPageSizeChange(Number(event.target.value)) : setPageSize(Number(event.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            entries
          </label>
          <span className="ui-table-toolbar__count">{effectiveTotal} records.</span>
        </div>

        <div className="ui-table-toolbar__right">
          {searchText || serverPagination ? (
            <div className="ui-table-search">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
              <input
                value={serverPagination?.search ?? query}
                onChange={(event) => serverPagination ? serverPagination.onSearchChange(event.target.value) : setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Search table"
              />
            </div>
          ) : null}

          {onRefresh ? (
            <button type="button" className="ui-table-refresh" onClick={onRefresh}>
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-4.9 6.1l-1.42.7A7 7 0 1 0 17.65 6.35z"
                />
              </svg>
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      <div className="ui-table__wrap">
        <table className="ui-table">
          <thead>
            <tr>
              {showIndex ? <th style={{ width: 64 }}>#</th> : null}
              {columns.map((column) => (
                <th key={column.key} style={column.width ? { width: column.width } : undefined}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="ui-table__state-row">
                <td colSpan={(showIndex ? 1 : 0) + columns.length}>
                  <div className="ui-table__empty ui-table__empty--loading">
                    <Loader size="md" variant="block" label="Loading records…" />
                  </div>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr className="ui-table__state-row">
                <td colSpan={(showIndex ? 1 : 0) + columns.length}>
                  <div className="ui-table__empty" role="status">
                    <span className="ui-table__empty-icon">
                      <EmptyInboxIcon />
                    </span>
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row, rowIndex) => {
                const absoluteIndex = (effectivePage - 1) * effectivePageSize + rowIndex;
                return (
                  <tr key={rowKey(row)}>
                    {showIndex ? (
                      <td>
                        <div className="ui-table__index">{absoluteIndex + 1}</div>
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column.key}>{column.render(row, absoluteIndex)}</td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="ui-table-footer">
        <span>
          Showing <strong>{rangeStart}</strong> to <strong>{rangeEnd}</strong> of{' '}
          <strong>{effectiveTotal}</strong> entries
        </span>
        <div className="ui-table-pager">
          <button
            type="button"
            disabled={effectivePage <= 1 || loading || effectiveTotal === 0}
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(effectivePage - 1)
                : setPage((p) => p - 1)
            }
          >
            Prev
          </button>
          <button type="button" className="is-active">
            {effectivePage}
          </button>
          <button
            type="button"
            disabled={effectivePage >= totalPages || loading || effectiveTotal === 0}
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(effectivePage + 1)
                : setPage((p) => p + 1)
            }
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
