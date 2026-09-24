import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    // The tinted backdrop is invisible on an actual phone (the content column fills the whole
    // viewport there) — it only shows in the gutters on a wider window, so this has zero effect
    // on the mobile experience.
    <div className="flex min-h-dvh w-full justify-center bg-blue-tint">
      <div
        className="relative flex h-dvh w-full max-w-[402px] flex-col overflow-hidden bg-cream sm:border-x sm:border-border"
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
