import { NavLink } from "react-router-dom";
import {
  bookActive,
  bookInactive,
  clipboardCheckActive,
  clipboardCheckInactive,
  routeActive,
  routeInactive,
  userStarActive,
  userStarInactive,
} from "./icons";

const TABS = [
  { to: "/", label: "Learn", active: routeActive, inactive: routeInactive },
  {
    to: "/study",
    label: "Study",
    active: bookActive,
    inactive: bookInactive,
  },
  {
    to: "/mock",
    label: "Mock",
    active: clipboardCheckActive,
    inactive: clipboardCheckInactive,
  },
  {
    to: "/progress",
    label: "Progress",
    active: userStarActive,
    inactive: userStarInactive,
  },
];

export function BottomNav() {
  return (
    <div className="flex w-full shrink-0 flex-col items-start border-t border-border">
      <div className="flex w-full shrink-0 items-center justify-between gap-1 bg-cream px-3 py-3">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex h-8 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    isActive ? "bg-blue-tint" : "bg-transparent"
                  }`}
                >
                  <img
                    alt=""
                    className={`size-[22px] ${isActive ? "icon-invert" : ""}`}
                    src={isActive ? tab.active : tab.inactive}
                  />
                </div>
                <p
                  className={`whitespace-nowrap text-[12px] font-semibold ${
                    isActive ? "text-ink" : "text-slate-light"
                  }`}
                >
                  {tab.label}
                </p>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
