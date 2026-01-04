// src/api/ansibleTemplatesApi.ts
import type { AnsibleTemplate } from "@/types";

const BASE = "/api/ansible/templates";

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || `HTTP ${r.status}`);
  }
  return r.json();
}

export const ansibleTemplatesApi = {
  async list(): Promise<{ ok: true; items: AnsibleTemplate[] }> {
    const r = await fetch(BASE, { method: "GET" });
    return json(r);
  },

  async create(payload: Partial<AnsibleTemplate>): Promise<{ ok: true; item: AnsibleTemplate; items: AnsibleTemplate[] }> {
    const r = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), // ✅ goUrl 그대로 gider
    });
    return json(r);
  },

  async update(id: string, payload: Partial<AnsibleTemplate>): Promise<{ ok: true; item: AnsibleTemplate; items: AnsibleTemplate[] }> {
    const r = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), // ✅ goUrl 그대로 gider
    });
    return json(r);
  },

  async remove(id: string): Promise<{ ok: true; items: AnsibleTemplate[] }> {
    const r = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
    return json(r);
  },
};