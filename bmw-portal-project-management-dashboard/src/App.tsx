import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "@/components/LoginPage";
import DashboardPage from "@/components/DashboardPage";
import EnvanterPage from "@/components/EnvanterPage";
import ImportantLinksPage from "@/components/ImportantLinksPage";
import DutyRosterPage from "@/components/DutyRosterPage";
import AskGTPage from "@/components/AskGTPage";
import PerformancePage from "@/components/PerformancePage";
import PageComponent from "@/components/PageComponent";
import ForbiddenPage from "@/components/ForbiddenPage";
import SelfServicePage from "@/components/SelfServicePage";
import { PAGE_CONFIG } from "@/constants";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import AppLayout from "./layouts/AppLayout";

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/login" element={<LoginPage />} />

      {/* protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* pages */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/envanter" element={<EnvanterPage />} />
          <Route path="/important-links" element={<ImportantLinksPage />} />
          <Route path="/duty-roster" element={<DutyRosterPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/askgt" element={<AskGTPage />} />

          {/* 403 */}
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Self Service */}
          <Route path="/self-service" element={<SelfServicePage />} />

          {/* ✅ Admin-only: Ansible */}
          <Route element={<AdminRoute />}>
            <Route
              path="/ansible"
              element={
                <PageComponent
                  title="Ansible"
                  tabsConfig={PAGE_CONFIG["Ansible"].tabs}
                />
              }
            />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}