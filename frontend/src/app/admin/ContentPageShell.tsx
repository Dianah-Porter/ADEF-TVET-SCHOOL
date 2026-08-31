import { type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { PageHeader } from './AdminLayout';
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Panel,
  SearchInput,
  SegmentedControl,
  Table,
  TableSkeleton,
  Toolbar,
} from './ui';

type Visibility = 'all' | 'live' | 'hidden';

/**
 * The frame every content screen shares: heading, filter toolbar, and one
 * panel holding the listing.
 *
 * Having it in one place is what makes the screens feel like one product —
 * the search box, the Live/Hidden filter and the "New" button are in the same
 * position on all of them, so moving between screens needs no relearning.
 */
export function ContentPageShell({
  title,
  description,
  newLabel,
  onNew,
  searchPlaceholder,
  resource,
  columns,
  empty,
  children,
  /** Content types with no published flag (working hours) hide the filter. */
  showVisibilityFilter = true,
}: {
  title: string;
  description: string;
  newLabel: string;
  onNew: () => void;
  searchPlaceholder: string;
  resource: {
    loading: boolean;
    error: string | null;
    filtered: unknown[];
    items: unknown[];
    isFiltered: boolean;
    counts: { all: number; live: number; hidden: number };
    search: string;
    setSearch: (value: string) => void;
    visibility: Visibility;
    setVisibility: (value: Visibility) => void;
    reload: () => void;
  };
  columns: number;
  empty: { icon: ReactNode; title: string; description: string };
  children: ReactNode;
  showVisibilityFilter?: boolean;
}) {
  const { loading, error, filtered, items, isFiltered, counts } = resource;

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={onNew}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {newLabel}
          </Button>
        }
      />

      <Toolbar>
        <SearchInput
          value={resource.search}
          onChange={resource.setSearch}
          placeholder={searchPlaceholder}
          className="w-full sm:max-w-xs"
        />

        {showVisibilityFilter && (
          <SegmentedControl
            label="Filter by visibility"
            value={resource.visibility}
            onChange={resource.setVisibility}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'live', label: 'Live', count: counts.live },
              { value: 'hidden', label: 'Hidden', count: counts.hidden },
            ]}
          />
        )}
      </Toolbar>

      {error && !loading ? (
        <ErrorState message={error} onRetry={resource.reload} />
      ) : (
        <Panel>
          {loading ? (
            <Table>
              <TableSkeleton rows={4} columns={columns} />
            </Table>
          ) : items.length === 0 ? (
            <EmptyState
              icon={empty.icon}
              title={empty.title}
              description={empty.description}
              action={
                <Button onClick={onNew}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {newLabel}
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={empty.icon}
              title="Nothing matches"
              description="No items match the current search or filter. Try widening it."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    resource.setSearch('');
                    resource.setVisibility('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              {children}
              {isFiltered && (
                <p className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">
                  Showing {filtered.length} of {items.length}. Reordering is disabled while a
                  filter is active.
                </p>
              )}
            </>
          )}
        </Panel>
      )}
    </>
  );
}

/**
 * The up/down pair that sets display order.
 *
 * Dragging is faster with a mouse but impossible with a keyboard, and these
 * lists are short enough that two buttons are no real hardship — so ordering
 * is done this way everywhere rather than being drag-only.
 */
export function ReorderButtons({
  onUp,
  onDown,
  disabled,
  isFirst,
  isLast,
  label,
}: {
  onUp: () => void;
  onDown: () => void;
  disabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex">
      <IconButton
        label={`Move ${label} up`}
        disabled={disabled || isFirst}
        onClick={onUp}
        title={disabled ? 'Clear the filter to reorder' : `Move ${label} up`}
      >
        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
      </IconButton>
      <IconButton
        label={`Move ${label} down`}
        disabled={disabled || isLast}
        onClick={onDown}
        title={disabled ? 'Clear the filter to reorder' : `Move ${label} down`}
      >
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </IconButton>
    </span>
  );
}
