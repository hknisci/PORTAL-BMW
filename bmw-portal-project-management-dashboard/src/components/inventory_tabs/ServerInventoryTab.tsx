import React, { useState, useMemo, useContext } from "react";
import { SERVER_INVENTORY_DATA } from "@/constants";
import { ServerInventory } from "../../types";
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
import ServerInventoryDetailModal from './ServerInventoryDetailModal';

const Badge: React.FC<{ value: ServerInventory['environment'] }> = ({ value }) => {
  const colorMap: Record<ServerInventory['environment'], string> = {
    Prod: "bg-red-500 text-white",
    Test: "bg-amber-500 text-white",
    Dev: "bg-green-500 text-white",
    QA: "bg-blue-500 text-white",
    Lab: "bg-indigo-500 text-white",
    Edu: "bg-purple-500 text-white",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${colorMap[value] || 'bg-gray-500 text-white'}`}
    >
      {value}
    </span>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusMap: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    'Active': { bg: 'bg-green-500', text: 'text-white', icon: <div className="w-2 h-2 bg-white rounded-full" /> },
    'Inactive': { bg: 'bg-red-500', text: 'text-white', icon: <div className="w-2 h-2 bg-white rounded-full" /> },
    'Maintenance': { bg: 'bg-amber-500', text: 'text-white', icon: <div className="w-2 h-2 bg-white rounded-full" /> },
    'Unknown': { bg: 'bg-gray-500', text: 'text-white', icon: <div className="w-2 h-2 bg-white rounded-full" /> },
  };

  const config = statusMap[status] || statusMap['Unknown'];

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {status}
    </span>
  );
};

const VersionBadge: React.FC<{ version: string; type: 'jboss' | 'websphere' | 'java' | 'apache' | 'nginx' | 'other' }> = ({ version, type }) => {
  const getVersionColor = (version: string, type: string) => {
    // Version analysis for color coding
    const versionNum = parseFloat(version.split('.')[0] + '.' + version.split('.')[1]);
    
    switch (type) {
      case 'jboss':
        if (versionNum >= 7.4) return 'bg-green-100 text-green-800 border-green-200';
        if (versionNum >= 7.0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
      case 'websphere':
        if (versionNum >= 9.0) return 'bg-green-100 text-green-800 border-green-200';
        if (versionNum >= 8.5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
      case 'java':
        if (versionNum >= 11.0) return 'bg-green-100 text-green-800 border-green-200';
        if (versionNum >= 8.0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const colorClass = getVersionColor(version, type);

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${colorClass}`}>
      🎯 {version}
    </span>
  );
};


const ServerInventoryTab = () => {
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("All");
  const [techFilter, setTechFilter] = useState("All");
  const [selectedServer, setSelectedServer] = useState<ServerInventory | null>(null);

  const data: ServerInventory[] = SERVER_INVENTORY_DATA;

  const filteredData = useMemo(() => {
    return data
        .filter(row => envFilter === "All" ? true : row.environment === envFilter)
        .filter(row => {
            if (techFilter === "All") return true;
            // Check if the property for the selected technology exists and is not empty/null
            return !!row[techFilter as keyof ServerInventory];
        })
        .filter((row) => {
            if (!row) return false;
            return Object.values(row).some((val) =>
                val?.toString().toLowerCase().includes(query.toLowerCase())
            );
        })
        .sort((a, b) => a.hostname.localeCompare(b.hostname));
  }, [data, query, envFilter, techFilter]);

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const headers = ["Environment", "Hostname", "OS", "Java Version", "JBoss Version", "WebSphere Version", "Nginx/Apache Version", "Hazelcast Version", "CTG Version", "Owner"].join(',');
    const rows = filteredData.map(row => 
        [row.environment, row.hostname, row.os, row.javaVersion, row.jbossVersion, row.webSphereVersion, row.apacheVersion, row.hazelcastVersion, row.ctgVersion, row.owner]
        .map(val => `"${val || ''}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "server_inventory.csv";
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

        {/* Filters - Resimdeki gibi düzenleme */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Sol taraf - Boş bırakıyoruz */}
            <div></div>
            
            {/* Sağ taraf - Search, Environment, Technology ve Export */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search servers..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                value={envFilter} 
                onChange={(e) => setEnvFilter(e.target.value)}
              >
                <option value="All">All Environments</option>
                <option value="Prod">Production</option>
                <option value="Test">Test</option>
                <option value="Dev">Development</option>
                <option value="QA">QA</option>
                <option value="Lab">Lab</option>
                <option value="Edu">Education</option>
              </select>
              <select 
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                value={techFilter} 
                onChange={e => setTechFilter(e.target.value)}
              >
                <option value="All">All Technologies</option>
                <option value="javaVersion">Java</option>
                <option value="jbossVersion">JBoss</option>
                <option value="webSphereVersion">WebSphere</option>
                <option value="webLogicVersion">WebLogic</option>
                <option value="apacheVersion">Apache</option>
                <option value="nginxVersion">Nginx</option>
                <option value="hazelcastVersion">Hazelcast</option>
                <option value="ctgVersion">CTG</option>
                <option value="mqVersion">MQ</option>
                <option value="kafkaVersion">Kafka</option>
                <option value="redisVersion">Redis</option>
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
                    🖥️ Server
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    Environment
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    IP
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    OS
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    Java
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    App Server
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    Web Server
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    Other MW
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    Owner
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    Status
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((row) => (
                <tr 
                  key={row.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer" 
                  onClick={() => setSelectedServer(row)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{row.hostname}</div>
                      {row.description && (
                        <div className="text-xs text-gray-500">{row.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge value={row.environment} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.ipAddress}</td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm text-gray-900">{row.os}</div>
                      {row.kernelPatchLevel && (
                        <div className="text-xs text-gray-500">{row.kernelPatchLevel}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {row.javaVersion ? (
                      <VersionBadge version={row.javaVersion} type="java" />
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {row.jbossVersion ? (
                      <VersionBadge version={row.jbossVersion} type="jboss" />
                    ) : row.webSphereVersion ? (
                      <VersionBadge version={row.webSphereVersion} type="websphere" />
                    ) : row.webLogicVersion ? (
                      <VersionBadge version={row.webLogicVersion} type="other" />
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {row.apacheVersion ? (
                      <VersionBadge version={row.apacheVersion} type="apache" />
                    ) : row.nginxVersion ? (
                      <VersionBadge version={row.nginxVersion} type="nginx" />
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {row.hazelcastVersion && (
                        <VersionBadge version={row.hazelcastVersion} type="other" />
                      )}
                      {row.ctgVersion && (
                        <VersionBadge version={row.ctgVersion} type="other" />
                      )}
                      {row.mqVersion && (
                        <VersionBadge version={row.mqVersion} type="other" />
                      )}
                      {row.kafkaVersion && (
                        <VersionBadge version={row.kafkaVersion} type="other" />
                      )}
                      {row.redisVersion && (
                        <VersionBadge version={row.redisVersion} type="other" />
                      )}
                      {!row.hazelcastVersion && !row.ctgVersion && !row.mqVersion && !row.kafkaVersion && !row.redisVersion && '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.owner || '-'}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={row.owner ? 'Active' : 'Unknown'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedServer && (
        <ServerInventoryDetailModal 
          server={selectedServer}
          isOpen={!!selectedServer}
          onClose={() => setSelectedServer(null)}
        />
      )}
    </>
  );
};

export default ServerInventoryTab;