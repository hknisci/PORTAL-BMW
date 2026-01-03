import React, { useMemo, useState } from "react";

type Props = {
  payload: any | null;
};

function safeStr(v: any) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

function pickScopeErrors(scope: any) {
  if (!scope || typeof scope !== "object") return [];
  const keys = Object.keys(scope).filter((k) => k.toLowerCase().endsWith("error"));
  return keys.map((k) => ({ key: k, value: scope[k] }));
}

const ScopeDebugPanel: React.FC<Props> = ({ payload }) => {
  const [open, setOpen] = useState(true);

  const scope = payload?.scope || null;

  const errors = useMemo(() => pickScopeErrors(scope), [scope]);

  const stages = Array.isArray(scope?.discoveryStages) ? scope.discoveryStages : [];
  const probes = Array.isArray(scope?.discoveryProbe) ? scope.discoveryProbe : [];

  const jsonText = useMemo(() => {
    const obj = { product: payload?.product ?? null, scope: payload?.scope ?? null };
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }, [payload]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setOpen((s) => !s)}
      >
        <div className="text-sm font-semibold text-gray-800">
          Scope / Discovery Plan / Errors (Debug)
        </div>
        <div className="text-xs text-gray-500">{open ? "Hide" : "Show"}</div>
      </button>

      {open ? (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <div className="text-xs text-gray-500">earliest</div>
              <div className="text-sm font-medium text-gray-800">{safeStr(scope?.earliest)}</div>
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <div className="text-xs text-gray-500">latest</div>
              <div className="text-sm font-medium text-gray-800">{safeStr(scope?.latest)}</div>
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <div className="text-xs text-gray-500">selected</div>
              <div className="text-sm font-medium text-gray-800">
                {safeStr(scope?.discoverySelected || scope?.entitySelector)}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-2">baseSearch / selector</div>
            <pre className="text-xs whitespace-pre-wrap break-words text-gray-800">
              {safeStr(scope?.baseSearch || scope?.entitySelector || "-")}
            </pre>
          </div>

          {stages.length ? (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                discoveryStages
              </div>
              <div className="divide-y divide-gray-200">
                {stages.map((s: any, idx: number) => (
                  <div key={idx} className="px-3 py-2">
                    <div className="text-xs text-gray-500">{safeStr(s?.name)}</div>
                    <div className="text-xs font-mono text-gray-800 break-words">
                      {safeStr(s?.baseSearch)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              discoveryStages yok. (Provider bunu üretmiyor olabilir; prodda standard netleşince eklenir.)
            </div>
          )}

          {probes.length ? (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                discoveryProbe (ok/failed)
              </div>
              <div className="divide-y divide-gray-200">
                {probes.slice(0, 20).map((p: any, idx: number) => (
                  <div key={idx} className="px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-gray-700 break-words">
                        {safeStr(p.stage)}
                      </div>
                      <div className={p.ok ? "text-green-700" : "text-red-700"}>
                        {p.ok ? "ok" : "fail"}
                      </div>
                    </div>
                    {p.error ? (
                      <div className="mt-1 text-red-700 break-words">{safeStr(p.error)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {errors.length ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="text-xs font-semibold text-red-800 mb-2">scope errors</div>
              <div className="space-y-1">
                {errors.map((e: any) => (
                  <div key={e.key} className="text-xs text-red-800 break-words">
                    <span className="font-semibold">{e.key}:</span> {safeStr(e.value)}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">scope error alanı yok (ya da hepsi boş).</div>
          )}

          {scope?.discoveryNote ? (
            <div className="text-xs text-gray-600">{safeStr(scope.discoveryNote)}</div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={copy}
              className="px-3 py-2 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50"
            >
              Copy JSON
            </button>
          </div>

          <details className="rounded-lg border border-gray-200">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50">
              Raw scope JSON
            </summary>
            <pre className="p-3 text-xs whitespace-pre-wrap break-words text-gray-800">
              {jsonText}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
};

export default ScopeDebugPanel;