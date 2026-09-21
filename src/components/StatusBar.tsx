import { iosBattery, iosSignal, iosWifi } from "./icons";

export function StatusBar() {
  return (
    <div className="flex h-[44px] w-full shrink-0 items-center justify-between px-6 py-3">
      <p className="font-semibold text-[15px] text-ink">9:41</p>
      <div className="flex shrink-0 items-center gap-1.5">
        <img alt="" className="size-5" src={iosSignal} />
        <img alt="" className="size-5" src={iosWifi} />
        <img alt="" className="h-5 w-7" src={iosBattery} />
      </div>
    </div>
  );
}
