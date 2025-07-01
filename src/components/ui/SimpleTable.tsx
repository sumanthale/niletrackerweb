import React from 'react';
import { cn } from '../../lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
}

interface SimpleTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
}

export function SimpleTable<T>({ 
  data, 
  columns, 
  onRowClick, 
  className,
  emptyMessage = "No data available"
}: SimpleTableProps<T>) {
  return (
    <div className={cn("w-full", className)}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={index}
                  className={cn(
                    "transition-colors hover:bg-gray-50",
                    onRowClick && "cursor-pointer",
                    index % 2 === 0 ? "bg-white" : "bg-gray-25"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-4 text-sm text-gray-900"
                    >
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
    </div>
  );
}