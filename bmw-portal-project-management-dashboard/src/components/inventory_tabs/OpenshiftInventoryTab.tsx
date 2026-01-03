import React, { useState, useMemo, useContext } from 'react';
import { OPENSHIFT_INVENTORY_DATA } from '@/constants';
import { AuthContext } from '@/contexts/AuthContext';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { OpenshiftInventory } from '../../types';
import OpenshiftInventoryDetailModal from './OpenshiftInventoryDetailModal';

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

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[value] || 'bg-gray-100 text-gray-700'}`}
    >
      {value}
    </span>
  );
};

const PodsStatus: React.FC<{ status?: string }> = ({ status }) => {
    if (!status) return <span>-</span>;
    const parts = status.split(' / ');
    return (
        <div className="flex items-center space-x-2">
            {parts.map(part => {
                const [count, ...stateParts] = part.split(' ');
                const state = stateParts.join(' ');
                let color = 'bg-gray-100 text-gray-700';
                if (state.toLowerCase().includes('running')) color = 'bg-green-100 text-green-700';
                if (state.toLowerCase().includes('pending')) color = 'bg-yellow-100 text-yellow-700';
                if (state.toLowerCase().includes('error')) color = 'bg-red-100 text-red-700';
                return (
                    <span key={state} className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
                        {count} {state}
                    </span>
                );
            })}
        </div>
    );
};

const OpenshiftInventoryTab: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [query, setQuery] = useState('');
    const [envFilter, setEnvFilter] = useState('All');
    const [clusterFilter, setClusterFilter] = useState('All');
    const [selectedCluster, setSelectedCluster] = useState<OpenshiftInventory | null>(null);
    
    const data: OpenshiftInventory[] = OPENSHIFT_INVENTORY_DATA;

    const { clusters } = useMemo(() => {
        const clusters = ['All', ...Array.from(new Set(data.map(item => item.clusterName)))];
        return { clusters };
    }, [data]);

    const filteredData = useMemo(() => {
        return data
            .filter(row => envFilter === 'All' ? true : row.environment === envFilter)
            .filter(row => clusterFilter === 'All' ? true : row.clusterName === clusterFilter)
            .filter(row =>
                Object.values(row).some(val =>
                    val?.toString().toLowerCase().includes(query.toLowerCase())
                )
            )
            .sort((a, b) => a.clusterName.localeCompare(b.clusterName));
    }, [data, query, envFilter, clusterFilter]);
    
    const handleExport = () => {
        if (!data || data.length === 0) return;
        const headers = ["Environment", "Cluster Name", "Cluster Version", "Namespace", "Nodes", "Applications", "Pods", "Owner"].join(',');
        const rows = filteredData.map(row => 
            [row.environment, row.clusterName, row.clusterVersion, row.namespace, row.nodes, row.applications, row.pods, row.owner]
            .map(val => `"${val || ''}"`).join(',')
        );
        const csvContent = [headers, ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', 'openshift_inventory.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    if (!data || data.length === 0) {
      return (
        <div className="bg-white border rounded-xl p-6 text-center text-gray-500">
          No Openshift inventory data available
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
                        <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={clusterFilter} onChange={e => setClusterFilter(e.target.value)}>
                            {clusters.map(c => <option key={c} value={c}>{c === 'All' ? 'All Clusters' : c}</option>)}
                        </select>
                        {user?.role === 'Admin' && (
                            <button onClick={handleExport} className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                <ArrowDownTrayIcon className="w-4 h-4" /> Export
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl shadow-sm bg-white border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-3 text-left">Environment</th>
                                <th className="px-6 py-3 text-left">Cluster Name</th>
                                <th className="px-6 py-3 text-left">Cluster Version</th>
                                <th className="px-6 py-3 text-left">Namespace</th>
                                <th className="px-6 py-3 text-left">Nodes</th>
                                <th className="px-6 py-3 text-left">Applications</th>
                                <th className="px-6 py-3 text-left">Pods</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {filteredData.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedCluster(row)}>
                                    <td className="px-6 py-3"><EnvironmentBadge value={row.environment} /></td>
                                    <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{row.clusterName}</td>
                                    <td className="px-6 py-3 whitespace-nowrap">{row.clusterVersion}</td>
                                    <td className="px-6 py-3 whitespace-nowrap">{row.namespace}</td>
                                    <td className="px-6 py-3 whitespace-nowrap">{row.nodes}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-center">{row.applications}</td>
                                    <td className="px-6 py-3"><PodsStatus status={row.pods} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedCluster && (
                <OpenshiftInventoryDetailModal
                    cluster={selectedCluster}
                    isOpen={!!selectedCluster}
                    onClose={() => setSelectedCluster(null)}
                />
            )}
        </>
    );
};

export default OpenshiftInventoryTab;