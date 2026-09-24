import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PhoneFrame } from "./components/PhoneFrame";
import { hasPin } from "./lib/settings";
import { touchStreak } from "./lib/progress";
import { AmendmentsScreen } from "./screens/AmendmentsScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LessonScreen } from "./screens/LessonScreen";
import { LiveInterviewScreen } from "./screens/LiveInterviewScreen";
import { MockSetupScreen } from "./screens/MockSetupScreen";
import { OralPracticeScreen } from "./screens/OralPracticeScreen";
import { PinSetupScreen } from "./screens/PinSetupScreen";
import { PrivacyPolicyScreen } from "./screens/PrivacyPolicyScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { StudyModuleScreen } from "./screens/StudyModuleScreen";
import { StudyScreen } from "./screens/StudyScreen";
import { UnlockScreen } from "./screens/UnlockScreen";

function App() {
  // Only relevant when a PIN is set — starts locked so a fresh app load always requires it.
  // Unlocking is a session-only state (not persisted), so reloading re-locks by design.
  const [unlocked, setUnlocked] = useState(() => !hasPin());

  useEffect(() => {
    touchStreak();
  }, []);

  return (
    <BrowserRouter>
      <PhoneFrame>
        {!unlocked ? (
          <UnlockScreen onUnlock={() => setUnlocked(true)} />
        ) : (
          <Routes>
            <Route element={<HomeScreen />} path="/" />
            <Route element={<LessonScreen />} path="/lesson/:moduleId" />
            <Route element={<MockSetupScreen />} path="/mock" />
            <Route element={<LiveInterviewScreen />} path="/interview" />
            <Route element={<OralPracticeScreen />} path="/oral-practice" />
            <Route element={<ProgressScreen />} path="/progress" />
            <Route element={<SettingsScreen />} path="/settings" />
            <Route element={<PinSetupScreen />} path="/settings/pin" />
            <Route element={<PrivacyPolicyScreen />} path="/settings/privacy" />
            <Route element={<StudyScreen />} path="/study" />
            <Route element={<AmendmentsScreen />} path="/study/amendments" />
            <Route element={<StudyModuleScreen />} path="/study/:moduleId" />
          </Routes>
        )}
      </PhoneFrame>
    </BrowserRouter>
  );
}

export default App;
