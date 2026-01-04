import React, { useState, useMemo, useContext } from 'react';
import { DATASOURCE_INVENTORY_DATA } from '@/constants';
import { AuthContext } from '@/contexts/AuthContext';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { DatasourceInventory, DatasourceStatus } from "@/types";
import DatasourceInventoryDetailModal from './DatasourceInventoryDetailModal';
import { openExternalUrl } from "@/utils/url";
import { downloadBlob } from "@/utils/file";

const EnvironmentBadge: React.FC<{ value: string }> = ({ value }) => {
  const colorMap: { [key: string]: string } = {
    Prod: "bg-red-100 text-red-700",
    Test: "bg-yellow-100 text-yellow-700",
    Dev: "bg-green-100 text-green-700",
    QA: "bg-blue-100 text-blue-700",
    Lab: "bg-indigo-100 text-indigo-700",
    Edu: "bg-purple-100 text-purple-700",
    Unknown: 'bg-gray-100 text-gray-700',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[value] || 'bg-gray-100 text-gray-700'}`}>{value}</span>;
};

const StatusBadge: React.FC<{ value: DatasourceStatus }> = ({ value }) => {
  const colorMap: Record<DatasourceStatus, string> = {
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-gray-100 text-gray-700",
    Error: "bg-red-100 text-red-700",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[value] || 'bg-gray-100 text-gray-700'}`}>{value}</span>;
};


const DatasourceInventoryTab: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [query, setQuery] = useState('');
    const [envFilter, setEnvFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState<"All" | DatasourceStatus>('All');
    const [sortKey, setSortKey] = useState('datasourceName');
    const [selectedDatasource, setSelectedDatasource] = useState<DatasourceInventory | null>(null);

    const data: DatasourceInventory[] = DATASOURCE_INVENTORY_DATA;

    const filteredData = useMemo(() => {
        return data
            .filter(row => envFilter === 'All' ? true : row.environment === envFilter)
            .filter(row => statusFilter === 'All' ? true : row.status === statusFilter)
            .filter(item =>
                Object.values(item).some(value =>
                    value?.toString().toLowerCase().includes(query.toLowerCase())
                )
            )
            .sort((a, b) => {
                const aVal = a[sortKey as keyof DatasourceInventory] || '';
                const bVal = b[sortKey as keyof DatasourceInventory] || '';
                return String(aVal).localeCompare(String(bVal));
            });
    }, [data, query, envFilter, statusFilter, sortKey]);
    
    const handleExport = () => {
        if (filteredData.length === 0) return;
        const headers = ["Environment", "Server", "Application Name", "Datasource Name", "DB Type", "Connection URL", "User", "Status"].join(',');
        const rows = filteredData.map(row => 
            [row.environment, row.server, row.applicationName, row.datasourceName, row.dbType, row.connectionURL, row.user, row.status]
            .map(val => `"${val || ''}"`).join(',')
        );
        const csvContent = [headers, ...rows].join('\n');
        
        downloadBlob(
        csvContent,
        "openshift_inventory.csv",
        "text/csv;charset=utf-8;"
        );
    };

    if (!data || data.length === 0) {
      return (
        <div className="bg-white border rounded-xl p-6 text-center text-gray-500">
          No datasource inventory data available
        </div>
      );
    }

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border rounded-xl shadow-sm">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-auto bg-white"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                        <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={envFilter} onChange={e => setEnvFilter(e.target.value)}>
                            {['All', 'Prod', 'Test', 'Dev', 'QA', 'Lab', 'Edu'].map(e => <option key={e} value={e}>{e === 'All' ? 'All Environments' : e}</option>)}
                        </select>
                        <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                            {['All', 'Active', 'Inactive', 'Error'].map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
                        </select>
                        <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={sortKey} onChange={e => setSortKey(e.target.value)}>
                            <option value="datasourceName">Sort by Datasource Name</option>
                            <option value="dbType">Sort by DB Type</option>
                            <option value="user">Sort by User</option>
                        </select>
                        {user?.role === 'Admin' && <button onClick={handleExport} className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"><ArrowDownTrayIcon className="w-4 h-4" /> Export</button>}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl shadow-sm bg-white border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-3 text-left">Environment</th>
                                <th className="px-6 py-3 text-left">Server</th>
                                <th className="px-6 py-3 text-left">Application Name</th>
                                <th className="px-6 py-3 text-left">Datasource Name</th>
                                <th className="px-6 py-3 text-left">DB Type</th>
                                <th className="px-6 py-3 text-left">Connection URL</th>
                                <th className="px-6 py-3 text-left">User</th>
                                <th className="px-6 py-3 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {filteredData.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDatasource(item)}>
                                    <td className="px-6 py-3"><EnvironmentBadge value={item.environment} /></td>
                                    <td className="px-6 py-3 whitespace-nowrap text-gray-900 font-medium">{item.server}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-gray-600">{item.applicationName}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-gray-600">{item.datasourceName}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-gray-600">{item.dbType}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-gray-600 truncate max-w-xs">{item.connectionURL}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-gray-600">{item.user}</td>
                                    <td className="px-6 py-3"><StatusBadge value={item.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedDatasource && (
                <DatasourceInventoryDetailModal
                    datasource={selectedDatasource}
                    isOpen={!!selectedDatasource}
                    onClose={() => setSelectedDatasource(null)}
                />
            )}
        </>
    );
};

export default DatasourceInventoryTab;