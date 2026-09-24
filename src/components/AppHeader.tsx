import { flame, hatLogo, heart } from "./icons";

type StatsProps = {
  streak: number;
  hearts: number;
};

function Stats({ streak, hearts }: StatsProps) {
  return (
    <div className="flex shrink-0 items-center gap-4">
      <div className="flex shrink-0 items-center gap-1">
        <img alt="" className="size-5" src={flame} />
        <p className="font-bold text-[15px] text-ink">{streak}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <img alt="" className="size-5" src={heart} />
        <p className="font-bold text-[15px] text-ink">{hearts}</p>
      </div>
    </div>
  );
}

export function AppHeader({ streak, hearts }: StatsProps) {
  return (
    <div className="sticky top-0 z-20 flex h-14 w-full shrink-0 items-center justify-between bg-cream px-6">
      <div className="flex shrink-0 items-center gap-2">
        <img alt="" className="h-6 w-auto shrink-0" src={hatLogo} />
        <p
          className="whitespace-nowrap text-[32px] text-logo"
          style={{ fontFamily: "var(--font-logo)" }}
        >
          civik
        </p>
      </div>
      <Stats streak={streak} hearts={hearts} />
    </div>
  );
}

export function ScreenHeader({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-10 flex w-full shrink-0 items-center bg-cream px-6 py-2">
      <p className="whitespace-nowrap font-bold text-[20px] text-ink">{title}</p>
    </div>
  );
}
