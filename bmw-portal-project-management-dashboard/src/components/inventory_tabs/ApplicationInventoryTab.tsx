import React, { useState, useMemo, useContext } from "react";
import { APPLICATION_INVENTORY_DATA, SERVER_INVENTORY_DATA } from "@/constants";
import { ApplicationInventory, ApplicationStatus, ServerInventory } from "../../types";
import { AuthContext } from "@/contexts/AuthContext";
import { 
  ArrowDownTrayIcon, 
  MagnifyingGlassIcon,
  ServerIcon,
  DocumentIcon,
  CpuChipIcon,
  CircleStackIcon,
  CloudIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import ApplicationInventoryDetailModal from './ApplicationInventoryDetailModal';

interface AugmentedApp extends ApplicationInventory {
    environment: ServerInventory['environment'] | 'Unknown';
    javaVersion?: string;
    jbossVersion?: string;
    websphereVersion?: string;
}

const StatusBadge: React.FC<{ value: ApplicationStatus }> = ({ value }) => {
  const statusMap: Record<ApplicationStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    'Running': { bg: 'bg-green-500', text: 'text-white', icon: <div className="w-2 h-2 bg-white rounded-full" /> },
    'Stopped': { bg: 'bg-gray-500', text: 'text-white', icon: <div className="w-2 h-2 bg-white rounded-full" /> },
    'Starting': { bg: 'bg-amber-500', text: 'text-white', icon: <div className="w-2 h-2 bg-white rounded-full" /> },
    'Error': { bg: 'bg-red-500', text: 'text-white', icon: <div className="w-2 h-2 bg-white rounded-full" /> },
  };

  const config = statusMap[value] || statusMap['Stopped'];

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {value}
    </span>
  );
};

const EnvironmentBadge: React.FC<{ value: string }> = ({ value }) => {
  const colorMap: { [key: string]: string } = {
    Prod: "bg-red-500 text-white",
    Test: "bg-amber-500 text-white",
    Dev: "bg-green-500 text-white",
    QA: "bg-blue-500 text-white",
    Lab: "bg-indigo-500 text-white",
    Edu: "bg-purple-500 text-white",
    Unknown: 'bg-gray-500 text-white',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${colorMap[value] || 'bg-gray-500 text-white'}`}
    >
      {value}
    </span>
  );
};

const ApplicationInventoryTab = () => {
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedApp, setSelectedApp] = useState<AugmentedApp | null>(null);

  const data: ApplicationInventory[] = APPLICATION_INVENTORY_DATA;

  const serverMap = useMemo(() => {
    return new Map<string, ServerInventory>(
        SERVER_INVENTORY_DATA.map(server => [server.hostname, server])
    );
  }, []);

  const augmentedData: AugmentedApp[] = useMemo(() => {
    return data.map(app => {
      const server = serverMap.get(app.hostname);
      return {
        ...app,
        environment: server?.environment || 'Unknown',
        javaVersion: server?.javaVersion,
        jbossVersion: server?.jbossVersion,
        websphereVersion: server?.webSphereVersion,
      };
    });
  }, [data, serverMap]);

  const filteredData = useMemo(() => {
    return augmentedData
      .filter(row => envFilter === "All" ? true : row.environment === envFilter)
      .filter(row => statusFilter === "All" ? true : row.status === statusFilter)
      .filter(row => {
        if (!query) return true;
        const lowerCaseQuery = query.toLowerCase();
        // Search only on specific string/number properties to avoid errors with objects
        const searchableValues = [
            row.environment,
            row.hostname,
            row.applicationName,
            row.version,
            row.status,
            row.ownerTeam,
            row.javaVersion,
            row.jbossVersion,
            row.websphereVersion,
        ];
        return searchableValues.some(val =>
            val?.toString().toLowerCase().includes(lowerCaseQuery)
        );
      })
      .sort((a, b) => a.applicationName.localeCompare(b.applicationName));
  }, [augmentedData, query, envFilter, statusFilter]);

  const handleExport = () => {
    const headers = ["Environment", "Server", "Application Name", "Version", "Deployment Date", "Status", "JBoss Version", "WebSphere Version", "Java Version", "Owner Team"].join(',');
    const rows = filteredData.map(row => [row.environment, row.hostname, row.applicationName, row.version, row.deploymentDate, row.status, row.jbossVersion, row.websphereVersion, row.javaVersion, row.ownerTeam].map(val => `"${val || ''}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "application_inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-6 text-center text-gray-500">
        No inventory data available
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm">
        {/* Filters - Sunucu Envanter gibi düzenleme */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Sol taraf - Boş bırakıyoruz */}
            <div></div>
            
            {/* Sağ taraf - Search, Environment, Status ve Export */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                value={envFilter} 
                onChange={e => setEnvFilter(e.target.value)}
              >
                {['All', 'Prod', 'Test', 'Dev', 'QA', 'Lab', 'Edu'].map(e => <option key={e} value={e}>{e === 'All' ? 'All Environments' : e}</option>)}
              </select>
              <select 
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
              >
                {['All', 'Running', 'Stopped', 'Starting', 'Error'].map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
              {user?.role === "Admin" && (
                <button 
                  onClick={handleExport} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 text-gray-500" /> 
                  Export
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <DocumentIcon className="h-4 w-4" />
                    Application
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <ServerIcon className="h-4 w-4" />
                    Environment
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <CpuChipIcon className="h-4 w-4" />
                    Server
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <CircleStackIcon className="h-4 w-4" />
                    Version
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <CloudIcon className="h-4 w-4" />
                    Application Server
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="h-4 w-4" />
                    Java Runtime
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4" />
                    Status
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    Deployed
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((row) => (
                <tr 
                  key={row.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer" 
                  onClick={() => setSelectedApp(row)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <DocumentIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{row.applicationName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <EnvironmentBadge value={row.environment} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.hostname}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.version}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {row.jbossVersion ? `JBoss Version ${row.jbossVersion}` : 
                     row.websphereVersion ? `WebSphere Version ${row.websphereVersion}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {row.javaVersion || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge value={row.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(row.deploymentDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedApp && (
        <ApplicationInventoryDetailModal
          app={selectedApp}
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </>
  );
};

export default ApplicationInventoryTab;