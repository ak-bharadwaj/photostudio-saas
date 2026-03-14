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
          'border-b border-[var(--border-light)]',
          className,
        )}
        style={{ background: 'linear-gradient(to right, var(--surface-1), var(--surface-2))' }}
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
        className={cn(
          '[&_tr:last-child]:border-0',
          // Subtle striped rows
          '[&_tr:nth-child(even)]:bg-[var(--surface-1)]/40',
          className,
        )}
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
          'transition-all duration-150',
          'hover:bg-[var(--surface-1)] hover:shadow-[inset_2px_0_0_var(--primary)]',
          selected && 'bg-[var(--primary-light)]/70 border-[var(--primary)]/20 shadow-[inset_2px_0_0_var(--primary)]',
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
          'h-11 px-6 text-left align-middle',
          'text-[11px] font-black uppercase tracking-[0.2em]',
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
          'px-6 py-4 align-middle text-sm text-[var(--foreground)] font-medium',
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
      <td colSpan={colSpan} className="py-24 text-center">
        <div className="flex flex-col items-center gap-4">
          {icon && (
            <div
              className={cn(
                'flex items-center justify-center h-16 w-16 rounded-3xl',
                'text-[var(--foreground-tertiary)]',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--surface-2), var(--surface-3))',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border-light)',
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-[var(--foreground)]">{title}</p>
            {description && (
              <p className="mt-1 text-sm text-[var(--foreground-tertiary)] max-w-xs mx-auto">{description}</p>
            )}
          </div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </td>
    </tr>
  );
};
