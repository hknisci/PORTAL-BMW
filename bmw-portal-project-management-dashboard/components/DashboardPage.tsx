import React from 'react';
import StatsOverview from './StatCard';
import CertificateSummaryWidget from './CertificateSummaryWidget';
import ActiveProjectsTable from './TotalRevenueChart';
import TodayOnCallCard from './TodayOnCallCard';
import RecentArticlesWidget from './RecentArticlesWidget';
import { 
    JAVA_CERTIFICATE_DATA, 
    KDB_CERTIFICATE_DATA,
    ACTIVE_PROJECTS_DATA 
} from '../constants';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        <StatsOverview />
        <ActiveProjectsTable projects={ACTIVE_PROJECTS_DATA} />
      </div>

      {/* Right Sidebar */}
      <div className="lg:col-span-1 space-y-8">
          <CertificateSummaryWidget
              title="KDB Sertifika"
              data={KDB_CERTIFICATE_DATA}
              onNavigate={onNavigate}
          />
          <CertificateSummaryWidget
              title="Java Sertifika"
              data={JAVA_CERTIFICATE_DATA}
              onNavigate={onNavigate}
          />
          <RecentArticlesWidget />
          <TodayOnCallCard />
      </div>
    </div>
  );
};

export default DashboardPage;