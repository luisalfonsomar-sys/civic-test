import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { chevronLeft } from "../components/icons";
import { PinDots, PinPad } from "../components/PinPad";
import { hasPin, setPin, verifyPin } from "../lib/settings";

const PIN_LENGTH = 4;

type Stage = "verify" | "new" | "confirm";

export function PinSetupScreen() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>(hasPin() ? "verify" : "new");
  const [input, setInput] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const titles: Record<Stage, string> = {
    verify: "Enter your current PIN",
    new: "Choose a new PIN",
    confirm: "Confirm your new PIN",
  };

  async function handleComplete(pin: string) {
    if (stage === "verify") {
      setChecking(true);
      const ok = await verifyPin(pin);
      setChecking(false);
      if (!ok) {
        setError("That PIN isn't right — try again.");
        setInput("");
        return;
      }
      setError("");
      setInput("");
      setStage("new");
      return;
    }

    if (stage === "new") {
      setFirstPin(pin);
      setError("");
      setInput("");
      setStage("confirm");
      return;
    }

    // stage === "confirm"
    if (pin !== firstPin) {
      setError("PINs didn't match — start over.");
      setInput("");
      setFirstPin("");
      setStage("new");
      return;
    }
    setChecking(true);
    await setPin(pin);
    setChecking(false);
    navigate("/settings");
  }

  function handleDigit(d: string) {
    if (checking || input.length >= PIN_LENGTH) return;
    const next = input + d;
    setInput(next);
    if (next.length === PIN_LENGTH) {
      void handleComplete(next);
    }
  }

  function handleBackspace() {
    if (checking) return;
    setInput((v) => v.slice(0, -1));
    setError("");
  }

  return (
    <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
      <div className="sticky top-0 z-10 flex w-full shrink-0 items-center gap-4 bg-cream px-6 py-3">
        <button
          aria-label="Back"
          className="flex size-6 shrink-0 items-center justify-center"
          onClick={() => (stage === "verify" ? navigate("/settings") : navigate(-1))}
          type="button"
        >
          <img alt="" className="size-6" src={chevronLeft} />
        </button>
        <p className="font-extrabold text-[20px] text-ink">App Lock</p>
      </div>

      <div className="flex w-full flex-1 shrink-0 flex-col items-center gap-8 p-6 pt-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-extrabold text-[20px] text-ink">{titles[stage]}</p>
          <p className="min-h-[18px] text-[13px] font-semibold text-red">{error}</p>
        </div>

        <PinDots filled={input.length} length={PIN_LENGTH} />

        <PinPad onBackspace={handleBackspace} onDigit={handleDigit} />
      </div>
    </div>
  );
}
