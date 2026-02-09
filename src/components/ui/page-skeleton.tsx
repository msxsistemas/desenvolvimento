import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  variant?: "table" | "cards" | "form" | "dashboard";
  rows?: number;
  columns?: number;
}

export function PageSkeleton({ variant = "table", rows = 5, columns = 4 }: PageSkeletonProps) {
  if (variant === "dashboard") {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header */}
        <div className="h-8 bg-muted rounded w-64" />
        
        {/* Cards grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
        
        {/* Charts */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-72 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-muted-foreground/20 rounded" />
            <div className="h-4 w-48 bg-muted-foreground/10 rounded" />
          </div>
          <div className="h-10 w-28 bg-muted-foreground/20 rounded" />
        </div>

        {/* Cards grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="space-y-6 animate-pulse max-w-2xl mx-auto">
        <div className="space-y-4 p-6 rounded-lg bg-muted">
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
              <div className="h-10 w-full bg-muted-foreground/10 rounded" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <div className="h-10 w-28 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Default: table
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-muted-foreground/20 rounded" />
          <div className="h-4 w-48 bg-muted-foreground/10 rounded" />
        </div>
        <div className="h-10 w-28 bg-muted-foreground/20 rounded" />
      </div>

      {/* Filters */}
      <div className="p-4 rounded-lg bg-muted">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-muted-foreground/10 rounded" />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 p-4 border-b border-border bg-muted/50">
          {[...Array(columns)].map((_, i) => (
            <div key={i} className="flex-1 h-4 bg-muted-foreground/20 rounded" />
          ))}
        </div>
        
        {/* Table rows */}
        {[...Array(rows)].map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 p-4 border-b border-border last:border-0">
            {[...Array(columns)].map((_, colIdx) => (
              <Skeleton key={colIdx} className="flex-1 h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
