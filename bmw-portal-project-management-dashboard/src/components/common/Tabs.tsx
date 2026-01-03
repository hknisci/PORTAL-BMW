import React, { useState, useEffect } from 'react';

interface Tab {
  label: string;
  content: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  nested?: boolean;
}

const Tabs: React.FC<TabsProps> = ({ tabs, nested = false }) => {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    // When the tabs prop changes, reset the active tab to 0 if it's now out of bounds.
    // This prevents errors and state inconsistencies when navigating between pages
    // with different numbers of tabs.
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [tabs]);

  if (nested) {
    const tabContainerStyle = 'border-b border-gray-200';
    const tabStyle = "px-4 py-2 -mb-px border-b-2 font-medium text-sm";
    const activeTabStyle = "border-blue-500 text-blue-600";
    const inactiveTabStyle = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";
    const contentStyle = "pt-4";

    return (
      <div>
        <div className={`flex flex-wrap ${tabContainerStyle}`}>
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`${tabStyle} ${activeTab === index ? activeTabStyle : inactiveTabStyle} focus:outline-none transition-colors duration-200 whitespace-nowrap`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={contentStyle}>
          {/* Use optional chaining to prevent error if activeTab is out of bounds before useEffect runs */}
          {tabs[activeTab]?.content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm focus:outline-none transition-colors duration-200 flex items-center
                ${
                  activeTab === index
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6">
        {/* Use optional chaining to prevent error if activeTab is out of bounds before useEffect runs */}
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

export default Tabs;