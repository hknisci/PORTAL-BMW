import React from 'react';
import Tabs from './common/Tabs';
import ServerInventoryTab from './inventory_tabs/ServerInventoryTab';
import ApplicationInventoryTab from './inventory_tabs/ApplicationInventoryTab';
import KdbCertificateTab from './inventory_tabs/KdbCertificateTab';
import JavaCertificateTab from './inventory_tabs/JavaCertificateTab';
import OpenshiftInventoryTab from './inventory_tabs/OpenshiftInventoryTab';
import DatasourceInventoryTab from './inventory_tabs/DatasourceInventoryTab';

const EnvanterPage: React.FC = () => {
    const tabs = [
        { label: 'Sunucu Envanter', content: <ServerInventoryTab /> },
        { label: 'Uygulama Envanter', content: <ApplicationInventoryTab /> },
        { label: 'KDB Sertifika', content: <KdbCertificateTab /> },
        { label: 'Java Sertifika', content: <JavaCertificateTab /> },
        { label: 'Openshift Envanter', content: <OpenshiftInventoryTab /> },
        { label: 'Datasource Envanter', content: <DatasourceInventoryTab /> },
    ];

    return <Tabs tabs={tabs} />;
};

export default EnvanterPage;
