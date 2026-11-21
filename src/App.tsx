import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { StorageBanner } from "./components/StorageBanner";
import { StoreProvider } from "./data/StoreProvider";
import { BoardPage } from "./pages/BoardPage";
import { BoardsPage } from "./pages/BoardsPage";

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <StorageBanner />
        <Routes>
          <Route path="/" element={<BoardsPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}