import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";
import { getStreak } from "../lib/progress";

const TAB_ROUTES = ["/", "/study", "/mock", "/progress", "/settings"];

export function PhoneFrame({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isTabRoute = TAB_ROUTES.includes(location.pathname);

  return (
    // The tinted backdrop is invisible on an actual phone (the content column fills the whole
    // viewport there) — it only shows in the gutters on a wider window, so this has zero effect
    // on the mobile experience.
    <div className="flex min-h-dvh w-full justify-center bg-blue-tint md:items-center">
      <div
        className="relative flex h-dvh w-full max-w-[402px] flex-col overflow-hidden bg-cream sm:border-x sm:border-border md:h-[min(900px,100dvh)] md:max-w-[960px] md:flex-row-reverse md:rounded-2xl md:border md:border-border"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {isTabRoute && <AppHeader streak={getStreak()} hearts={5} />}
          {children}
        </div>
        {isTabRoute && <BottomNav />}
      </div>
    </div>
  );
}
