import React, { useMemo } from 'react';
import { KdbCertificate, JavaCertificate } from '../types';

interface CertificateSummaryWidgetProps {
  data: (KdbCertificate | JavaCertificate)[];
  title: string;
  onNavigate: (page: string) => void;
}

const isExpired = (dateStr: string) => new Date(dateStr) < new Date();
const isExpiringSoon = (dateStr: string, days = 30) => {
    if (isExpired(dateStr)) return false;
    const expiryDate = new Date(dateStr);
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + days);
    return expiryDate <= soonDate;
};

const CertificateSummaryWidget: React.FC<CertificateSummaryWidgetProps> = ({ data, title, onNavigate }) => {
    
    const summaryStats = useMemo(() => {
        // FIX: The property for expiry date on both KdbCertificate and JavaCertificate is `validTo`, not `expireDate`.
        const expired = data.filter(c => isExpired(c.validTo)).length;
        const expiringSoon = data.filter(c => isExpiringSoon(c.validTo)).length;
        const total = data.length;
        const valid = total - expired - expiringSoon;
        return { total, expiringSoon, expired, valid };
    }, [data]);

    const stats = [
        { label: 'Total Certificates', value: summaryStats.total, color: 'text-gray-700', dotColor: 'bg-blue-500' },
        { label: 'Valid', value: summaryStats.valid, color: 'text-green-700', dotColor: 'bg-green-500' },
        { label: 'Expiring Soon (<30d)', value: summaryStats.expiringSoon, color: 'text-yellow-700', dotColor: 'bg-yellow-500' },
        { label: 'Expired', value: summaryStats.expired, color: 'text-red-700', dotColor: 'bg-red-500' }
    ];

    return (
        <div 
            className="bg-white p-6 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => onNavigate('Envanter')}
        >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
            <ul className="space-y-3">
                {stats.map(stat => (
                    <li key={stat.label} className="flex justify-between items-center text-sm">
                        <span className="flex items-center text-gray-600">
                            <span className={`w-2 h-2 rounded-full mr-2 ${stat.dotColor}`}></span>
                            {stat.label}
                        </span>
                        <span className={`font-bold ${stat.color}`}>{stat.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CertificateSummaryWidget;