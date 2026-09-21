import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PhoneFrame } from "./components/PhoneFrame";
import { touchStreak } from "./lib/progress";
import { HomeScreen } from "./screens/HomeScreen";
import { LessonScreen } from "./screens/LessonScreen";
import { MockSetupScreen } from "./screens/MockSetupScreen";
import { OralPracticeScreen } from "./screens/OralPracticeScreen";
import { ProgressScreen } from "./screens/ProgressScreen";

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
          <Route element={<OralPracticeScreen />} path="/oral-practice" />
          <Route element={<ProgressScreen />} path="/progress" />
        </Routes>
      </PhoneFrame>
    </BrowserRouter>
  );
}

export default App;
