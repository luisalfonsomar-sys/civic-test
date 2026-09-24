const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"];

export function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      {Array.from({ length }).map((_, i) => (
        <div
          className={`size-3.5 shrink-0 rounded-full border-2 ${
            i < filled ? "border-blue bg-blue" : "border-border bg-transparent"
          }`}
          key={i}
        />
      ))}
    </div>
  );
}

export function PinPad({
  onDigit,
  onBackspace,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
}) {
  return (
    <div className="grid w-full max-w-[280px] shrink-0 grid-cols-3 gap-3">
      {KEYS.map((k, i) => {
        if (k === "") return <div key={i} />;
        if (k === "backspace") {
          return (
            <button
              aria-label="Backspace"
              className="flex h-16 shrink-0 items-center justify-center rounded-2xl text-[20px] font-bold text-ink"
              key={i}
              onClick={onBackspace}
              type="button"
            >
              ⌫
            </button>
          );
        }
        return (
          <button
            className="flex h-16 shrink-0 items-center justify-center rounded-2xl bg-surface text-[22px] font-bold text-ink active:bg-border"
            key={i}
            onClick={() => onDigit(k)}
            type="button"
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
