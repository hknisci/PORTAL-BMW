// src/stores/dutyRosterStore.ts
import { ON_CALL_ROSTER_DATA } from "../constants";

export type DutyRosterItem = {
  id: string;
  date: string; // YYYY-MM-DD
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

const STORAGE_KEY = "bmw_portal:duty_roster:v1";

/** date+email benzersiz kabul ediyoruz (email zorunlu zaten) */
function stableKey(x: Pick<DutyRosterItem, "date" | "email">) {
  return `${x.date}::${String(x.email || "").toLowerCase()}`;
}

function safeParseArray(raw: string | null): any[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadFromStorage(): DutyRosterItem[] | null {
  const arr = safeParseArray(typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null);
  if (!arr) return null;

  // minimal validate
  const cleaned = arr
    .filter((x) => x && x.id && x.date && x.firstName != null && x.lastName != null && x.phone != null && x.email != null)
    .map((x) => ({
      id: String(x.id),
      date: String(x.date),
      firstName: String(x.firstName),
      lastName: String(x.lastName),
      phone: String(x.phone),
      email: String(x.email),
    }));

  return cleaned.length > 0 ? cleaned : null;
}

function saveToStorage(items: DutyRosterItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function splitFullName(full: string): { firstName: string; lastName: string } {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** constants seed -> DutyRosterItem[] */
function seedFromConstants(): DutyRosterItem[] {
  const now = Date.now();
  const mapped: DutyRosterItem[] = (ON_CALL_ROSTER_DATA as any[]).map((x: any, i: number) => {
    const { firstName, lastName } = splitFullName(String(x.name ?? ""));
    return {
      id: String(x.id ?? `${now}-${i}`),
      date: String(x.date ?? ""), // constants zaten yyyy-mm-dd
      firstName,
      lastName,
      phone: String(x.phone ?? ""),
      email: String(x.email ?? ""),
    };
  });

  // boş date varsa filtrele (kırılmasın)
  return mapped.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.date));
}

/** ✅ MERGE: base + incoming (same date+email -> overwrite) */
function mergeByStableKey(base: DutyRosterItem[], incoming: DutyRosterItem[]): DutyRosterItem[] {
  const map = new Map<string, DutyRosterItem>();

  for (const b of base) map.set(stableKey(b), b);
  for (const inc of incoming) map.set(stableKey(inc), inc);

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

type Listener = () => void;

class DutyRosterStore {
  private items: DutyRosterItem[] = [];
  private listeners = new Set<Listener>();
  private hydrated = false;

  /** first access’te storage/seed yükle */
  private ensureHydrated() {
    if (this.hydrated) return;
    this.hydrated = true;

    if (typeof window === "undefined") {
      this.items = seedFromConstants();
      return;
    }

    const stored = loadFromStorage();
    if (stored && stored.length > 0) {
      this.items = stored;
      return;
    }

    // storage yoksa seed et + kaydet
    this.items = seedFromConstants();
    saveToStorage(this.items);
  }

  subscribe(fn: Listener) {
    this.ensureHydrated();
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getSnapshot() {
    this.ensureHydrated();
    return this.items;
  }

  private emitAndPersist() {
    // ✅ Kritik: HER mutation’da persist
    if (typeof window !== "undefined") saveToStorage(this.items);
    this.listeners.forEach((l) => l());
  }

  /** ✅ upsert: hiçbir zaman listeyi replace etmez */
  upsert(item: DutyRosterItem) {
    this.ensureHydrated();
    const key = stableKey(item);

    // aynı stableKey varsa overwrite, yoksa ekle
    const map = new Map<string, DutyRosterItem>();
    for (const x of this.items) map.set(stableKey(x), x);
    map.set(key, item);

    this.items = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    this.emitAndPersist();
  }

  remove(id: string) {
    this.ensureHydrated();
    this.items = this.items.filter((x) => x.id !== id);
    this.emitAndPersist();
  }

  /** ✅ importMany: mevcut kayıtları SİLMEZ, merge eder + persist eder */
  importMany(incoming: DutyRosterItem[]) {
    this.ensureHydrated();
    this.items = mergeByStableKey(this.items, incoming);
    this.emitAndPersist();
  }
}

export const dutyRosterStore = new DutyRosterStore();