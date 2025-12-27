import React, { useContext } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './components/DashboardPage';
import PageComponent from './components/PageComponent';
import ImportantLinksPage from './components/ImportantLinksPage';
import DutyRosterPage from './components/DutyRosterPage';
import EnvanterPage from './components/EnvanterPage';
import LoginPage from './components/LoginPage';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import AskGTPage from "./components/AskGTPage";
import { AuthContext } from './contexts/AuthContext';
import { PAGE_CONFIG } from './constants';
import PerformancePage from './components/PerformancePage';

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = React.useState('Dashboard');

  const renderContent = () => {
    if (activePage === 'Dashboard') {
      return <DashboardPage onNavigate={setActivePage} />;
    }

    if (activePage === 'Envanter') {
      return <EnvanterPage />;
    }
    
    if (activePage === 'Önemli Linkler') {
      return <ImportantLinksPage />;
    }

    if (activePage === 'Nöbet Listesi') {
      return <DutyRosterPage />;
    }
    
    if (activePage === 'Performance') {
      return <PerformancePage />;
    }

    if (activePage === 'AskGT') {
      return <AskGTPage />;
    }

    const config = PAGE_CONFIG[activePage];
    
    if (config) {
        return <PageComponent title={activePage} tabsConfig={config.tabs} />;
    }

    return <PageComponent title={activePage} tabsConfig={[]} />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Sidebar activeItem={activePage} onNavigate={setActivePage} />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};


const App: React.FC = () => {
  const { isAuthenticated, showTimeoutModal, extendSession, logout, countdown } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      <AppContent />
      <SessionTimeoutModal
        isOpen={showTimeoutModal}
        countdown={countdown}
        onExtend={extendSession}
        onLogout={logout}
      />
    </>
  );
};

export default App;