import React, { useState } from 'react';
import Tabs from './common/Tabs';
import HttpdTabContent from './performance_tabs/HttpdTabContent';
import NginxTabContent from './performance_tabs/NginxTabContent';
import JbossTabContent from './performance_tabs/JbossTabContent';
import WebsphereTabContent from './performance_tabs/WebsphereTabContent';
import CtgTabContent from './performance_tabs/CtgTabContent';
import HazelcastTabContent from './performance_tabs/HazelcastTabContent';
import ProvenirTabContent from './performance_tabs/ProvenirTabContent';
import PerformanceDetailModal from './PerformanceDetailModal';

const PerformancePage: React.FC = () => {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        tab: string | null;
        widgetTitle: string | null;
    }>({
        isOpen: false,
        tab: null,
        widgetTitle: null,
    });

    const handleWidgetClick = (tab: string, widgetTitle: string) => {
        setModalState({ isOpen: true, tab, widgetTitle });
    };

    const handleCloseModal = () => {
        setModalState({ isOpen: false, tab: null, widgetTitle: null });
    };

    const tabs = [
        { label: 'HTTPD', content: <HttpdTabContent onWidgetClick={(title) => handleWidgetClick('HTTPD', title)} /> },
        { label: 'NGINX', content: <NginxTabContent onWidgetClick={(title) => handleWidgetClick('NGINX', title)} /> },
        { label: 'JBoss', content: <JbossTabContent onWidgetClick={(title) => handleWidgetClick('JBoss', title)} /> },
        { label: 'WebSphere', content: <WebsphereTabContent onWidgetClick={(title) => handleWidgetClick('WebSphere', title)} /> },
        { label: 'CTG', content: <CtgTabContent onWidgetClick={(title) => handleWidgetClick('CTG', title)} /> },
        { label: 'Hazelcast', content: <HazelcastTabContent onWidgetClick={(title) => handleWidgetClick('Hazelcast', title)} /> },
        { label: 'Provenir', content: <ProvenirTabContent onWidgetClick={(title) => handleWidgetClick('Provenir', title)} /> },
    ];

    return (
        <>
            <Tabs tabs={tabs} />
            <PerformanceDetailModal
                isOpen={modalState.isOpen}
                onClose={handleCloseModal}
                tab={modalState.tab}
                widgetTitle={modalState.widgetTitle}
            />
        </>
    );
};

export default PerformancePage;