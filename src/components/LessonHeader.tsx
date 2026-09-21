import { useNavigate } from "react-router-dom";
import { heart, xCircle } from "./icons";

export function LessonHeader({ progress, lives }: { progress: number; lives: number }) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-10 flex w-full shrink-0 items-center gap-4 bg-cream px-6 py-3">
      <button
        aria-label="Exit lesson"
        className="flex size-6 shrink-0 items-center justify-center"
        onClick={() => navigate("/")}
        type="button"
      >
        <img alt="" className="size-6" src={xCircle} />
      </button>
      <div className="h-3 flex-1 shrink-0 overflow-hidden rounded-md bg-border">
        <div
          className="h-full bg-blue transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <img alt="" className="size-5" src={heart} />
        <p className="whitespace-nowrap font-bold text-[14px] text-ink">{lives}</p>
      </div>
    </div>
  );
}
