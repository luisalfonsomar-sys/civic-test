import { NavLink } from "react-router-dom";
import {
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
    to: "/mock",
    label: "Mock Test",
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
    <div className="flex w-full shrink-0 flex-col items-start">
      <div className="flex w-full shrink-0 items-center justify-between bg-cream px-6 py-3">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className="flex w-20 shrink-0 flex-col items-center gap-1"
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
                    className="size-[22px]"
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
      <div className="flex w-full shrink-0 items-start justify-center bg-cream pb-2">
        <div className="h-[5px] w-[134px] shrink-0 rounded-[10px] bg-ink" />
      </div>
    </div>
  );
}
