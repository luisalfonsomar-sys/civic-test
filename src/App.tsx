import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PhoneFrame } from "./components/PhoneFrame";
import { touchStreak } from "./lib/progress";
import { AmendmentsScreen } from "./screens/AmendmentsScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LessonScreen } from "./screens/LessonScreen";
import { LiveInterviewScreen } from "./screens/LiveInterviewScreen";
import { MockSetupScreen } from "./screens/MockSetupScreen";
import { OralPracticeScreen } from "./screens/OralPracticeScreen";
import { PrivacyPolicyScreen } from "./screens/PrivacyPolicyScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { StudyModuleScreen } from "./screens/StudyModuleScreen";
import { StudyScreen } from "./screens/StudyScreen";

function App() {
  useEffect(() => {
    touchStreak();
  }, []);

  return (
    <BrowserRouter>
      <PhoneFrame>
        <Routes>
          <Route element={<HomeScreen />} path="/" />
          <Route element={<LessonScreen />} path="/lesson/:moduleId" />
          <Route element={<MockSetupScreen />} path="/mock" />
          <Route element={<LiveInterviewScreen />} path="/interview" />
          <Route element={<OralPracticeScreen />} path="/oral-practice" />
          <Route element={<ProgressScreen />} path="/progress" />
          <Route element={<SettingsScreen />} path="/settings" />
          <Route element={<PrivacyPolicyScreen />} path="/settings/privacy" />
          <Route element={<StudyScreen />} path="/study" />
          <Route element={<AmendmentsScreen />} path="/study/amendments" />
          <Route element={<StudyModuleScreen />} path="/study/:moduleId" />
        </Routes>
      </PhoneFrame>
    </BrowserRouter>
  );
}

export default App;
