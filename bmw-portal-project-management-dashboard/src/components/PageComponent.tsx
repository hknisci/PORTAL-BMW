// src/components/PageComponent.tsx
import React from "react";
import type { PageTab } from "@/types";
import Tabs from "./common/Tabs";

import TemplatesTab from "./ansible_tabs/TemplatesTab";
import SelfServicePage from "./SelfServicePage";

interface PageComponentProps {
  title: string;
  tabsConfig: PageTab[];
}

const PageComponent: React.FC<PageComponentProps> = ({ title, tabsConfig }) => {
  // ✅ Self Service artık kendi page component'inde çalışacak (eski self_service_tabs kaldırıldı)
  if (title === "Self Service") {
    return <SelfServicePage />;
  }

  if (!tabsConfig || tabsConfig.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-gray-600">
          Content for this page will be available soon.
        </p>
      </div>
    );
  }

  const tabs = tabsConfig.map((tabConfig) => {
    let content: React.ReactNode;

    // ✅ Ansible -> Templates
    if (title === "Ansible" && tabConfig.label === "Templates") {
      content = <TemplatesTab />;
    } else if (tabConfig.nestedTabs?.length) {
      const nested = tabConfig.nestedTabs.map((nestedTab) => ({
        label: nestedTab.label,
        content: <p className="text-gray-600">Content for {nestedTab.label}</p>,
      }));

      content = <Tabs tabs={nested} nested={true} />;
    } else {
      content = <p className="text-gray-600">Content for {tabConfig.label}</p>;
    }

    return {
      label: tabConfig.label,
      count: tabConfig.count,
      content,
    };
  });

  return <Tabs tabs={tabs} />;
};

export default PageComponent;