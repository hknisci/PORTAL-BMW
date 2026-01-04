import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChartDataItem } from "@/types";
import { SERVER_INVENTORY_DATA, APPLICATION_INVENTORY_DATA } from '@/constants';

const StatsOverview: React.FC = () => {

    const jbossMigrationChartData = useMemo(() => {
        const total70x = SERVER_INVENTORY_DATA.filter(
            s => s.jbossVersion && s.jbossVersion.startsWith('7.') && !s.jbossVersion.startsWith('7.4')
        ).length;
        const total74x = SERVER_INVENTORY_DATA.filter(
            s => s.jbossVersion && s.jbossVersion.startsWith('7.4')
        ).length;
        const completed = SERVER_INVENTORY_DATA.filter(
            s => s.jbossVersion && s.jbossVersion.startsWith('8.')
        ).length;
        
        return [
            { name: 'Jboss EAP 7.0.X', value: total70x, color: '#EF4444' }, // red-500
            { name: 'Jboss EAP 7.4.X', value: total74x, color: '#FBBF24' }, // amber-400
            { name: 'Jboss EAP 8.X', value: completed, color: '#22C55E' },// green-500
        ];
    }, []);

    const allServerChartData = useMemo(() => {
        const linuxCount = SERVER_INVENTORY_DATA.filter(s => 
            s.os.toLowerCase().includes('rhel') || s.os.toLowerCase().includes('ubuntu')
        ).length;
    
        const jbossCount = SERVER_INVENTORY_DATA.filter(s => s.jbossVersion).length;
    
        const nginxCount = new Set(
            APPLICATION_INVENTORY_DATA
                .filter(app => app.middlewareInfo?.toLowerCase().includes('nginx'))
                .map(app => app.hostname)
        ).size;
    
        const hazelcastCount = new Set(
            APPLICATION_INVENTORY_DATA
                .filter(app => app.middlewareInfo?.toLowerCase().includes('hazelcast'))
                .map(app => app.hostname)
        ).size;
    
        return [
            { name: 'Linux', value: linuxCount, color: '#14B8A6' }, // teal-500
            { name: 'Jboss', value: jbossCount, color: '#3B82F6' }, // blue-500
            { name: 'Nginx', value: nginxCount, color: '#A855F7' }, // purple-500
            { name: 'Hazelcast', value: hazelcastCount, color: '#F97316' }, // orange-500
        ];
    }, []);
    
    const applicationStats = useMemo(() => {
        const serverMap = new Map(SERVER_INVENTORY_DATA.map(s => [s.hostname, s]));

        const jbossCount = APPLICATION_INVENTORY_DATA.filter(
            app => serverMap.get(app.hostname)?.jbossVersion
        ).length;
        const websphereCount = APPLICATION_INVENTORY_DATA.filter(
            app => serverMap.get(app.hostname)?.webSphereVersion
        ).length;
        const nginxCount = APPLICATION_INVENTORY_DATA.filter(
            app => app.middlewareInfo?.toLowerCase().includes('nginx')
        ).length;

        return [
            { label: 'Jboss Uygulama', value: jbossCount, color: '#3B82F6' }, // blue-500
            { label: 'WebSphere', value: websphereCount, color: '#22C55E' }, // green-500
            { label: 'Nginx', value: nginxCount, color: '#14B8A6' }, // teal-500
        ];
    }, []);

    const renderChart = (data: ChartDataItem[], title: string) => (
        <div className="flex flex-col items-center">
            <h4 className="text-sm font-medium text-gray-500 mb-2">{title}</h4>
            <div className="w-24 h-24">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={40}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
             <div className="mt-2 text-xs text-gray-600 w-full">
                {data.map(item => (
                    <div key={item.name} className="flex justify-between items-center">
                        <span>
                            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                            {item.name}
                        </span>
                        <span className="font-semibold">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                {/* Jboss EAP 8.X Geçiş */}
                <div className="py-4 md:py-0 md:pr-8 flex flex-col">
                    {renderChart(jbossMigrationChartData, 'Jboss EAP 8.X Geçiş')}
                </div>

                {/* All Server */}
                <div className="py-4 md:py-0 md:px-8">
                    {renderChart(allServerChartData, 'All Server')}
                </div>

                {/* Uygulamalar */}
                <div className="py-4 md:py-0 md:pl-8">
                     <h4 className="text-sm font-medium text-gray-500 mb-4">Uygulamalar</h4>
                     <ul className="space-y-3">
                         {applicationStats.map(item => (
                             <li key={item.label} className="flex justify-between items-center text-sm">
                                 <span className="text-gray-600">{item.label}</span>
                                 <span className="font-semibold text-white text-xs rounded-full px-2 py-0.5" style={{ backgroundColor: item.color }}>{item.value}</span>
                             </li>
                         ))}
                     </ul>
                </div>
            </div>
        </div>
    );
};

export default StatsOverview;