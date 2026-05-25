import { ProgressBar } from "@/components/ui";

export function EvolutionChart({ data }: { data: Array<{ month: string; score: number; controls: number }> }) {
  const max = Math.max(...data.map((item) => item.controls), 1);
  return (
    <div className="surface rounded-lg p-5">
      <div className="flex h-56 items-end gap-3">
        {data.map((item) => (
          <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end rounded-lg bg-ink-100 px-1 dark:bg-white/10">
              <div className="w-full rounded-md bg-sentinel-600" style={{ height: `${Math.max(16, (item.controls / max) * 100)}%` }} />
            </div>
            <span className="text-xs font-medium text-ink-500 dark:text-ink-300">{item.month}</span>
            <span className="text-xs font-semibold text-ink-950 dark:text-white">{item.score}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeverityBars({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <div className="surface space-y-4 rounded-lg p-5">
      {data.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink-700 dark:text-ink-200">{item.label}</span>
            <span className="text-ink-500 dark:text-ink-300">{item.value}</span>
          </div>
          <ProgressBar value={(item.value / total) * 100} tone={item.color === "#f59e0b" ? "amber" : "red"} />
        </div>
      ))}
    </div>
  );
}
