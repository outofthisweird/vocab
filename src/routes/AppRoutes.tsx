import { Navigate, Route, Routes } from "react-router-dom";
import { StudyPage } from "../pages/StudyPage";
import { TestPage } from "../pages/TestPage";
import { VocabularyPage } from "../pages/VocabularyPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/vocabulary" replace />} />
      <Route path="/vocabulary" element={<VocabularyPage />} />
      <Route path="/study" element={<StudyPage />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="*" element={<Navigate to="/vocabulary" replace />} />
    </Routes>
  );
}
