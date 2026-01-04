import React, { useState, useMemo, useContext } from 'react';
import { JAVA_CERTIFICATE_DATA } from '@/constants';
import { JavaCertificate } from "@/types";
import { AuthContext } from '@/contexts/AuthContext';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import JavaCertificateDetailModal from './JavaCertificateDetailModal';
import { openExternalUrl } from "@/utils/url";
interface CertWithStatus extends JavaCertificate {
    daysToExpiry: number;
    status: 'Expired' | 'Expiring Soon' | 'Valid';
}

const getCertStatus = (validTo: string): CertWithStatus['status'] => {
    const now = new Date();
    const expiry = new Date(validTo);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Expired';
    if (diffDays <= 30) return 'Expiring Soon';
    return 'Valid';
};

const getDaysToExpiry = (validTo: string): number => {
    const now = new Date();
    const expiry = new Date(validTo);
    // Return negative days if expired for sorting
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const ExpiryBadge: React.FC<{ days: number, status: CertWithStatus['status'] }> = ({ days, status }) => {
  const colorMap: Record<CertWithStatus['status'], string> = {
    Valid: "bg-green-100 text-green-700",
    'Expiring Soon': "bg-yellow-100 text-yellow-700",
    Expired: "bg-red-100 text-red-700",
  };
  const label = status === 'Expired' ? `Expired (${Math.abs(days)}d ago)` : `${days} days`;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[status]}`}>
      {label}
    </span>
  );
};

const EnvironmentBadge: React.FC<{ value: string }> = ({ value }) => {
  const colorMap: { [key: string]: string } = {
    Prod: "bg-red-100 text-red-700",
    Test: "bg-yellow-100 text-yellow-700",
    Dev: "bg-green-100 text-green-700",
    QA: "bg-blue-100 text-blue-700",
    Lab: "bg-indigo-100 text-indigo-700",
    Edu: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[value] || 'bg-gray-100 text-gray-700'}`}>
      {value}
    </span>
  );
};


const JavaCertificateTab: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [query, setQuery] = useState('');
    const [envFilter, setEnvFilter] = useState('All');
    const [sortKey, setSortKey] = useState('daysToExpiry');
    const [selectedCert, setSelectedCert] = useState<CertWithStatus | null>(null);
    
    const data: JavaCertificate[] = JAVA_CERTIFICATE_DATA;

    const augmentedData: CertWithStatus[] = useMemo(() => {
        return data.map(cert => ({
            ...cert,
            daysToExpiry: getDaysToExpiry(cert.validTo),
            status: getCertStatus(cert.validTo),
        }));
    }, [data]);

    const filteredData = useMemo(() => {
        return augmentedData
            .filter(cert => {
                const matchesEnv = envFilter === 'All' || cert.environment === envFilter;
                const matchesSearch = query === '' || 
                    Object.values(cert).some(val => 
                        String(val).toLowerCase().includes(query.toLowerCase())
                    );
                return matchesEnv && matchesSearch;
            })
            .sort((a, b) => {
                if (sortKey === 'daysToExpiry') {
                    return a.daysToExpiry - b.daysToExpiry;
                }
                const aVal = a[sortKey as keyof typeof a];
                const bVal = b[sortKey as keyof typeof b];
                return String(aVal).localeCompare(String(bVal));
            });
    }, [augmentedData, query, envFilter, sortKey]);

    const handleExport = () => {
        const headers = ["Environment", "Server", "Java Home", "Alias Name", "Issuer", "Subject", "Valid To", "Days to Expiry", "Status"].join(',');
        const rows = filteredData.map(row => 
            [row.environment, row.server, row.javaHome, row.aliasName, row.issuer, row.subject, row.validTo, row.daysToExpiry, row.status]
            .map(val => `"${val || ''}"`).join(',')
        );
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        openExternalUrl(url);
        URL.revokeObjectURL(url);
    };

    if (!data || data.length === 0) {
      return (
        <div className="bg-white border rounded-xl p-6 text-center text-gray-500">
          No Java certificate data available
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
                        <select value={envFilter} onChange={e => setEnvFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
                            <option value="All">All Environments</option>
                            <option value="Prod">Prod</option>
                            <option value="Test">Test</option>
                            <option value="Dev">Dev</option>
                            <option value="QA">QA</option>
                            <option value="Lab">Lab</option>
                            <option value="Edu">Edu</option>
                        </select>
                         <select className="border rounded-lg px-3 py-2 text-sm bg-white" value={sortKey} onChange={e => setSortKey(e.target.value)}>
                            <option value="daysToExpiry">Sort by Expiry</option>
                            <option value="server">Sort by Server</option>
                            <option value="environment">Sort by Environment</option>
                            <option value="issuer">Sort by Issuer</option>
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
                                <th className="px-6 py-3 text-left">Java Home</th>
                                <th className="px-6 py-3 text-left">Alias Name</th>
                                <th className="px-6 py-3 text-left">Issuer (CA)</th>
                                <th className="px-6 py-3 text-left">Subject (CN)</th>
                                <th className="px-6 py-3 text-left">Valid To</th>
                                <th className="px-6 py-3 text-left">Days to Expiry</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {filteredData.map(cert => (
                                <tr key={cert.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedCert(cert)}>
                                    <td className="px-6 py-3 whitespace-nowrap"><EnvironmentBadge value={cert.environment} /></td>
                                    <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{cert.server}</td>
                                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap truncate max-w-xs">{cert.javaHome}</td>
                                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{cert.aliasName}</td>
                                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{cert.issuer}</td>
                                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{cert.subject}</td>
                                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{cert.validTo}</td>
                                    <td className="px-6 py-3 whitespace-nowrap"><ExpiryBadge days={cert.daysToExpiry} status={cert.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedCert && (
                <JavaCertificateDetailModal
                    cert={selectedCert}
                    isOpen={!!selectedCert}
                    onClose={() => setSelectedCert(null)}
                />
            )}
        </>
    );
};

export default JavaCertificateTab;