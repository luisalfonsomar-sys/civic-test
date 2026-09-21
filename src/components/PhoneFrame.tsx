import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-border p-0 sm:p-6">
      <div
        className="flex h-dvh w-full max-w-[402px] flex-col overflow-hidden bg-cream shadow-none sm:h-[874px] sm:rounded-[32px] sm:shadow-2xl"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
