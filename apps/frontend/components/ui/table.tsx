import React from 'react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="w-full overflow-auto rounded-[var(--radius-lg)]">
        <table
          ref={ref}
          className={cn('w-full caption-bottom text-sm', className)}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },
);

Table.displayName = 'Table';

/* -------------------------------------------------------------------------- */
/*  Table Header                                                              */
/* -------------------------------------------------------------------------- */

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn(
          'bg-[var(--surface-1)] border-b border-[var(--border-light)]',
          className,
        )}
        {...props}
      >
        {children}
      </thead>
    );
  },
);

TableHeader.displayName = 'TableHeader';

/* -------------------------------------------------------------------------- */
/*  Table Body                                                                */
/* -------------------------------------------------------------------------- */

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={cn('[&_tr:last-child]:border-0', className)}
        {...props}
      >
        {children}
      </tbody>
    );
  },
);

TableBody.displayName = 'TableBody';

/* -------------------------------------------------------------------------- */
/*  Table Row                                                                 */
/* -------------------------------------------------------------------------- */

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  /** Highlight the row as selected */
  selected?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, children, selected, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          'border-b border-[var(--border-light)]',
          'transition-colors duration-[var(--transition-fast)]',
          'hover:bg-[var(--overlay-light)]',
          selected && 'bg-[var(--primary-light)]',
          className,
        )}
        {...props}
      >
        {children}
      </tr>
    );
  },
);

TableRow.displayName = 'TableRow';

/* -------------------------------------------------------------------------- */
/*  Table Head (th)                                                           */
/* -------------------------------------------------------------------------- */

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          'h-11 px-4 text-left align-middle',
          'text-xs font-semibold uppercase tracking-wider',
          'text-[var(--foreground-secondary)]',
          className,
        )}
        {...props}
      >
        {children}
      </th>
    );
  },
);

TableHead.displayName = 'TableHead';

/* -------------------------------------------------------------------------- */
/*  Table Cell (td)                                                           */
/* -------------------------------------------------------------------------- */

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          'px-4 py-3 align-middle text-sm text-[var(--foreground)]',
          className,
        )}
        {...props}
      >
        {children}
      </td>
    );
  },
);

TableCell.displayName = 'TableCell';

/* -------------------------------------------------------------------------- */
/*  Empty Table State                                                         */
/* -------------------------------------------------------------------------- */

export interface TableEmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  colSpan?: number;
}

export const TableEmpty: React.FC<TableEmptyProps> = ({
  icon,
  title,
  description,
  action,
  colSpan = 1,
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          {icon && (
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--surface-2)] text-[var(--foreground-tertiary)]">
              {icon}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
            {description && (
              <p className="mt-1 text-sm text-[var(--foreground-tertiary)]">{description}</p>
            )}
          </div>
          {action && <div className="mt-2">{action}</div>}
        </div>
      </td>
    </tr>
  );
};
