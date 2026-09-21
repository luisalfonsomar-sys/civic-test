import { flame, heart } from "./icons";

function LincolnMark() {
  return (
    <div className="relative flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-ink">
      <div className="relative size-5">
        <div className="absolute left-[5px] top-[2px] h-2 w-2.5 rounded-t-[2px] bg-white" />
        <div className="absolute left-[3px] top-3 h-[3px] w-3.5 rounded-[2px] bg-white" />
      </div>
    </div>
  );
}

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
        <LincolnMark />
        <p className="whitespace-nowrap font-extrabold text-[20px] text-ink">Honest Abe</p>
      </div>
      <Stats streak={streak} hearts={hearts} />
    </div>
  );
}

export function ScreenHeader({
  title,
  streak,
  hearts,
}: StatsProps & { title: string }) {
  return (
    <div className="sticky top-0 z-10 flex w-full shrink-0 items-center justify-between bg-cream px-6 py-2">
      <p className="whitespace-nowrap font-bold text-[20px] text-ink">{title}</p>
      <Stats streak={streak} hearts={hearts} />
    </div>
  );
}
