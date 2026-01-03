import React from "react";
import { useNavigate } from "react-router-dom";
import StatsOverview from "./StatCard";
import CertificateSummaryWidget from "./CertificateSummaryWidget";
import ActiveProjectsTable from "./TotalRevenueChart";
import TodayOnCallCard from "./TodayOnCallCard";
import RecentArticlesWidget from "./RecentArticlesWidget";
import { JAVA_CERTIFICATE_DATA, KDB_CERTIFICATE_DATA, ACTIVE_PROJECTS_DATA } from "@/constants";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <StatsOverview />
        <ActiveProjectsTable projects={ACTIVE_PROJECTS_DATA} />
      </div>

      <div className="lg:col-span-1 space-y-8">
        <CertificateSummaryWidget
          title="KDB Sertifika"
          data={KDB_CERTIFICATE_DATA}
          onNavigate={() => navigate("/envanter")}
        />
        <CertificateSummaryWidget
          title="Java Sertifika"
          data={JAVA_CERTIFICATE_DATA}
          onNavigate={() => navigate("/envanter")}
        />
        <RecentArticlesWidget />
        <TodayOnCallCard />
      </div>
    </div>
  );
};

export default DashboardPage;