import { useState } from "react";
import { hatLogo } from "../components/icons";
import { PinDots, PinPad } from "../components/PinPad";
import { verifyPin } from "../lib/settings";

const PIN_LENGTH = 4;

export function UnlockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleDigit(d: string) {
    if (checking || input.length >= PIN_LENGTH) return;
    const next = input + d;
    setInput(next);
    if (next.length === PIN_LENGTH) {
      setChecking(true);
      const ok = await verifyPin(next);
      setChecking(false);
      if (ok) {
        onUnlock();
        return;
      }
      setError("Wrong PIN — try again.");
      setInput("");
    }
  }

  function handleBackspace() {
    if (checking) return;
    setInput((v) => v.slice(0, -1));
    setError("");
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center gap-8 bg-cream p-6 pt-20">
      <div className="flex flex-col items-center gap-3">
        <img alt="" className="h-12 w-auto" src={hatLogo} />
        <p className="font-extrabold text-[20px] text-ink">Enter your PIN</p>
        <p className="min-h-[18px] text-[13px] font-semibold text-red">{error}</p>
      </div>

      <PinDots filled={input.length} length={PIN_LENGTH} />

      <PinPad onBackspace={handleBackspace} onDigit={handleDigit} />
    </div>
  );
}
