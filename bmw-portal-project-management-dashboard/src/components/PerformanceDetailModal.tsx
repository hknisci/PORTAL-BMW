// components/PerformanceDetailModal.tsx
import React, { useMemo } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import HttpdDetailContent from "./performance_details/HttpdDetailContent";
import NginxDetailContent from "./performance_details/NginxDetailContent";
import JbossDetailContent from "./performance_details/JbossDetailContent";
import WebsphereDetailContent from "./performance_details/WebsphereDetailContent";
import CtgDetailContent from "./performance_details/CtgDetailContent";
import HazelcastDetailContent from "./performance_details/HazelcastDetailContent";
import ProvenirDetailContent from "./performance_details/ProvenirDetailContent";
import ScopeDebugPanel from "./performance_details/common/ScopeDebugPanel";
import { usePerformanceSnapshot } from "@/hooks/usePerformanceSnapshot";

interface PerformanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: string | null;
  widgetTitle: string | null;
}

function tabToProductKey(tab: string | null): string | null {
  if (!tab) return null;
  const t = tab.toLowerCase().trim();
  if (t === "httpd") return "httpd";
  if (t === "nginx") return "nginx";
  if (t === "jboss") return "jboss";
  if (t === "websphere") return "websphere";
  if (t === "ctg") return "ctg";
  if (t === "hazelcast") return "hazelcast";
  if (t === "provenir") return "provenir";
  return null;
}

const PerformanceDetailModal: React.FC<PerformanceDetailModalProps> = ({
  isOpen,
  onClose,
  tab,
  widgetTitle,
}) => {
  const productKey = useMemo(() => tabToProductKey(tab), [tab]);

  // tab casing farklarından etkilenmeyelim
  const tabKey = useMemo(() => (tab ? tab.toLowerCase().trim() : ""), [tab]);

  // productKey yoksa hook'u koşturma
  const snap = usePerformanceSnapshot(isOpen && productKey ? productKey : null, {
    intervalSeconds: 30,
    enabled: isOpen && !!productKey,
  });

  if (!isOpen) return null;

  const renderContent = () => {
    if (!productKey) {
      return <p className="p-6">No detail available for this section.</p>;
    }

    if (snap.loading) {
      return (
        <div className="p-6">
          <div className="animate-pulse text-gray-600">Veri çekiliyor...</div>
        </div>
      );
    }

    if (snap.error) {
      return (
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {snap.error}
          </div>
        </div>
      );
    }

    // ✅ tüm tab’lara payload basıyoruz
    switch (tabKey) {
      case "httpd":
        return <HttpdDetailContent payload={snap.data} />;

      case "nginx":
        return <NginxDetailContent payload={snap.data} />;

      case "jboss":
        return <JbossDetailContent payload={snap.data} />;

      case "websphere":
        return <WebsphereDetailContent payload={snap.data} />;

      case "ctg":
        return <CtgDetailContent payload={snap.data} />;

      case "hazelcast":
        return <HazelcastDetailContent payload={snap.data} />;

      case "provenir":
        return <ProvenirDetailContent payload={snap.data} />;

      default:
        return <p className="p-6">No detail available for this section.</p>;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 transition-opacity"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-gray-50 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-4xl sm:w-full max-h-[90vh] flex flex-col">
        <div className="bg-white px-4 py-3 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
              {widgetTitle} - {tab} Details
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Provider: <span className="font-medium">{snap.provider || "-"}</span> · Updated:{" "}
              <span className="font-medium">{snap.updatedAt || "-"}</span>
              {snap.lastError ? (
                <span className="ml-2 text-red-600">· LastError: {snap.lastError}</span>
              ) : null}
            </p>
          </div>

          <button
            type="button"
            className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 overflow-y-auto space-y-6">
          {renderContent()}

          {/* ✅ Splunk/Dynatrace yokken bile scope+errors+planı göstermek için */}
          <ScopeDebugPanel payload={snap.data} />
        </div>

        <div className="bg-gray-100 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDetailModal;