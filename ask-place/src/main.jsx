import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import HomePage from "./pages/HomePage.jsx";
import RoomsListPage from "./pages/RoomsListPage.jsx";
import RoomDetailPage from "./pages/RoomDetailPage.jsx";
import AdminRouter from "./pages/admin/AdminRouter.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms" element={<RoomsListPage />} />
          <Route path="/room/:id" element={<RoomDetailPage />} />
          <Route path="/admin/*" element={<AdminRouter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
