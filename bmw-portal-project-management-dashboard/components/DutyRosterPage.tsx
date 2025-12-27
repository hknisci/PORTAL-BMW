import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

import { useAuth } from "../contexts/AuthContext";
import {
  DutyRosterItem,
  deleteDutyRoster,
  getDutyRoster,
  importDutyRoster,
  upsertDutyRoster,
} from "../src/api/dutyRosterApi";

// ---------- helpers ----------
type UploadRowResult = {
  rowIndex: number;
  raw: Record<string, any>;
  normalized?: Partial<DutyRosterItem>;
  errors: string[];
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isLikelyAdmin(user: any) {
  if (!user) return false;
  if (user.role) return String(user.role).toLowerCase() === "admin";
  if (user.username) return String(user.username).toLowerCase() === "admin";
  return false;
}

function toISODate(input: any): string | null {
  if (input == null) return null;

  if (typeof input === "number" && Number.isFinite(input)) {
    const date = XLSX.SSF.parse_date_code(input);
    if (!date) return null;
    const yyyy = String(date.y).padStart(4, "0");
    const mm = String(date.m).padStart(2, "0");
    const dd = String(date.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const s = String(input).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmY = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, "0")}-${dmY[1].padStart(2, "0")}`;

  const dmySlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmySlash) return `${dmySlash[3]}-${dmySlash[2].padStart(2, "0")}-${dmySlash[1].padStart(2, "0")}`;

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = String(d.getFullYear()).padStart(4, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function isEmail(value: string): boolean {
  const v = (value || "").trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normalizeHeaderKey(k: string): string {
  return String(k || "").trim().toLowerCase().replace(/\s+/g, "");
}

function mapRowToRosterPartial(row: Record<string, any>): Partial<DutyRosterItem> {
  const keys = Object.keys(row || {});
  const kv: Record<string, any> = {};
  for (const k of keys) kv[normalizeHeaderKey(k)] = row[k];

  const dateRaw = kv["tarih"] ?? kv["date"] ?? kv["gun"] ?? kv["day"];
  const firstNameRaw = kv["ad"] ?? kv["firstname"] ?? kv["isim"] ?? kv["name"];
  const lastNameRaw = kv["soyad"] ?? kv["lastname"] ?? kv["surname"];
  const phoneRaw = kv["telefon"] ?? kv["phone"] ?? kv["tel"] ?? kv["gsm"];
  const emailRaw = kv["mail"] ?? kv["email"] ?? kv["eposta"] ?? kv["e-posta"];

  const date = toISODate(dateRaw);
  const firstName = String(firstNameRaw ?? "").trim();
  const lastName = String(lastNameRaw ?? "").trim();
  const phone = String(phoneRaw ?? "").trim();
  const email = String(emailRaw ?? "").trim();

  const out: Partial<DutyRosterItem> = {};
  if (date) out.date = date;
  if (firstName) out.firstName = firstName;
  if (lastName) out.lastName = lastName;
  if (phone) out.phone = phone;
  if (email) out.email = email;
  return out;
}

function formatDisplayDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function getMonthKey(iso: string): string | null {
  const m = iso.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

function currentMonthKey(): string {
  const d = new Date();
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- UI: Modal ----------
type ModalProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function Modal({ title, isOpen, onClose, children, footer }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="text-lg font-semibold text-slate-800">{title}</div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            Kapat
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer ? <div className="border-t px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

// ---------- Editor Modal ----------
type EditorMode = "create" | "edit";

function DutyRosterEditorModal(props: {
  isOpen: boolean;
  mode: EditorMode;
  initial?: DutyRosterItem | null;
  onClose: () => void;
  onSave: (item: DutyRosterItem) => void;
}) {
  const { isOpen, mode, initial, onClose, onSave } = props;

  const [date, setDate] = useState(initial?.date ?? "");
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setDate(initial?.date ?? "");
    setFirstName(initial?.firstName ?? "");
    setLastName(initial?.lastName ?? "");
    setPhone(initial?.phone ?? "");
    setEmail(initial?.email ?? "");
    setErrors([]);
  }, [initial, isOpen]);

  function validate(): string[] {
    const e: string[] = [];
    const iso = toISODate(date);
    if (!iso) e.push("Tarih geçerli değil. (Örn: 2026-01-05 veya 05.01.2026)");
    if (!firstName.trim()) e.push("Ad zorunlu.");
    if (!lastName.trim()) e.push("Soyad zorunlu.");
    if (!phone.trim()) e.push("Telefon zorunlu.");
    if (!email.trim()) e.push("E-posta zorunlu.");
    if (email.trim() && !isEmail(email)) e.push("E-posta formatı hatalı.");
    return e;
  }

  function handleSave() {
    const e = validate();
    setErrors(e);
    if (e.length > 0) return;

    const iso = toISODate(date)!;
    const item: DutyRosterItem = {
      id: mode === "edit" && initial ? initial.id : uid(),
      date: iso,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
    };

    onSave(item);
    onClose();
  }

  return (
    <Modal
      title={mode === "create" ? "Yeni Nöbet Kaydı" : "Nöbet Kaydını Düzenle"}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            İptal
          </button>
          <button onClick={handleSave} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
            Kaydet
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Tarih</label>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="YYYY-MM-DD veya DD.MM.YYYY"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Telefon</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Ad</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Soyad</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">E-posta</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="font-semibold">Kontrol et:</div>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Modal>
  );
}

// ---------- Upload Modal ----------
function DutyRosterUploadModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: DutyRosterItem[]) => void;
}) {
  const { isOpen, onClose, onImport } = props;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [results, setResults] = useState<UploadRowResult[]>([]);
  const [rawCount, setRawCount] = useState<number>(0);
  const [parsingError, setParsingError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setResults([]);
      setRawCount(0);
      setParsingError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen]);
  const [searchTerm, setSearchTerm] = useState('');
  const validItems = useMemo(() => {
    return results
      .filter((r) => r.errors.length === 0 && r.normalized)
      .filter((r) => {
        // Arama boşsa hepsini döndür
        if (!searchTerm || searchTerm.trim() === '') {
          return true;
        }
        // Arama varsa filtreleme yap
        const search = searchTerm.toLowerCase();
        return (
          r.normalized?.firstName?.toLowerCase().includes(search) ||
          r.normalized?.lastName?.toLowerCase().includes(search) ||
          r.normalized?.email?.toLowerCase().includes(search) ||
          r.normalized?.phone?.includes(search)
        );
      })
      .map((r) => ({
        id: uid(),
        date: r.normalized!.date!,
        firstName: r.normalized!.firstName!,
        lastName: r.normalized!.lastName!,
        phone: r.normalized!.phone!,
        email: r.normalized!.email!,
      })) as DutyRosterItem[];
  }, [results, searchTerm]); // searchTerm'i dependency'e ekle
  
  function validatePartial(p: Partial<DutyRosterItem>): string[] {
    const e: string[] = [];
    if (!p.date) e.push("Tarih yok/parse edilemedi");
    if (!p.firstName) e.push("Ad boş");
    if (!p.lastName) e.push("Soyad boş");
    if (!p.phone) e.push("Telefon boş");
    if (!p.email) e.push("E-posta boş");
    if (p.email && !isEmail(p.email)) e.push("E-posta formatı hatalı");
    return e;
  }

  function parseRows(rows: Record<string, any>[]) {
    setParsingError(null);
    setRawCount(rows.length);

    const out: UploadRowResult[] = rows.map((row, idx) => {
      const normalized = mapRowToRosterPartial(row);
      if (normalized.date) normalized.date = toISODate(normalized.date) ?? undefined;
      const errors = validatePartial(normalized);
      return { rowIndex: idx + 1, raw: row, normalized, errors };
    });

    setResults(out);
  }

  async function handleFile(file: File) {
    const name = file.name.toLowerCase();

    try {
      if (name.endsWith(".csv")) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => parseRows((res.data || []) as Record<string, any>[]),
          error: (err) => setParsingError(err.message || "CSV parse hatası"),
        });
        return;
      }

      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
        parseRows(rows);
        return;
      }

      setParsingError("Desteklenmeyen dosya tipi. (CSV veya XLSX yükleyin)");
    } catch (e: any) {
      setParsingError(e?.message ?? "Dosya işlenirken hata oluştu");
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleImport() {
    if (validItems.length === 0) return;
    onImport(validItems);
    onClose();
  }

  function downloadTemplate() {
    const csv =
      "tarih,ad,soyad,telefon,mail\n" +
      "2026-01-05,Ali,Yılmaz,+90 532 111 22 33,ali.yilmaz@company.com\n" +
      "2026-01-06,Ayşe,Kaya,+90 533 222 33 44,ayse.kaya@company.com\n";
    downloadTextFile("duty-roster-template.csv", csv, "text/csv");
  }

  const good = results.filter((r) => r.errors.length === 0).length;
  const bad = results.filter((r) => r.errors.length > 0).length;

  return (
    <Modal
      title="Excel / CSV ile Toplu Yükleme"
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            {rawCount > 0 ? (
              <>
                Toplam: <b>{rawCount}</b> • Geçerli: <b>{good}</b> • Hatalı: <b>{bad}</b>
              </>
            ) : (
              <>CSV veya XLSX yükleyin.</>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={downloadTemplate} className="rounded-xl border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Şablon İndir
            </button>
            <button onClick={openFilePicker} className="rounded-xl border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Dosya Seç
            </button>
            <button
              disabled={validItems.length === 0}
              onClick={handleImport}
              className={`rounded-xl px-4 py-2 text-sm text-white ${validItems.length === 0 ? "bg-slate-300" : "bg-slate-900 hover:bg-slate-800"}`}
            >
              Import Et
            </button>
          </div>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
        <div className="font-semibold">Beklenen kolonlar</div>
        <div className="mt-1 text-slate-600">
          <b>tarih/date</b>, <b>ad/firstName</b>, <b>soyad/lastName</b>, <b>telefon/phone</b>, <b>mail/email</b>
        </div>
      </div>

      {parsingError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{parsingError}</div>
      ) : null}

      {results.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border">
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="px-3 py-2">Satır</th>
                  <th className="px-3 py-2">Tarih</th>
                  <th className="px-3 py-2">Ad Soyad</th>
                  <th className="px-3 py-2">Telefon</th>
                  <th className="px-3 py-2">Mail</th>
                  <th className="px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const n = r.normalized ?? {};
                  const ok = r.errors.length === 0;
                  return (
                    <tr key={r.rowIndex} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-slate-600">{r.rowIndex}</td>
                      <td className="px-3 py-2">{n.date ? formatDisplayDate(n.date) : "-"}</td>
                      <td className="px-3 py-2">{(n.firstName ?? "-") + " " + (n.lastName ?? "")}</td>
                      <td className="px-3 py-2">{n.phone ?? "-"}</td>
                      <td className="px-3 py-2">{n.email ?? "-"}</td>
                      <td className="px-3 py-2">
                        {ok ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">OK</span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">Hatalı</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// ---------- Page ----------
export default function DutyRosterPage() {
  const { user } = useAuth();
  const isAdmin = isLikelyAdmin(user);

  const [items, setItems] = useState<DutyRosterItem[]>([]);
  const [month, setMonth] = useState<string | null>(currentMonthKey());

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editing, setEditing] = useState<DutyRosterItem | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Her girişte merkezi kaynaktan çek: herkes aynı veriyi görür
  useEffect(() => {
    setLoading(true);
    setError(null);
    getDutyRoster()
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch((e: any) => setError(e?.message || "Duty roster verisi alınamadı"))
      .finally(() => setLoading(false));
  }, []);

  const monthItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    if (!month) return sorted; // ✅ filtre yoksa tüm kayıtlar
    return sorted.filter((x) => getMonthKey(x.date) === month);
  }, [items, month]);

  function openCreate() {
    setEditorMode("create");
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(item: DutyRosterItem) {
    setEditorMode("edit");
    setEditing(item);
    setEditorOpen(true);
  }

  async function saveItem(item: DutyRosterItem) {
    try {
      setLoading(true);
      setError(null);
      const next = await upsertDutyRoster(item); // ✅ merge + persist server-side
      setItems(next);

      const mk = getMonthKey(item.date);
      if (mk) setMonth(mk);
    } catch (e: any) {
      setError(e?.message || "Kayıt kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(imported: DutyRosterItem[]) {
    try {
      setLoading(true);
      setError(null);
      const next = await importDutyRoster(imported); // ✅ eskiyi silmez, merge eder
      setItems(next);

      const mk = getMonthKey(imported[0]?.date);
      if (mk) setMonth(mk);
    } catch (e: any) {
      setError(e?.message || "Import başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    const ok = window.confirm("Bu nöbet kaydını silmek istediğine emin misin?");
    if (!ok) return;

    try {
      setLoading(true);
      setError(null);
      const next = await deleteDutyRoster(id);
      setItems(next);
    } catch (e: any) {
      setError(e?.message || "Silme işlemi başarısız");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsvForCurrentMonth() {
    const header = "tarih,ad,soyad,telefon,mail\n";
    const lines = monthItems.map((x) => `${x.date},${x.firstName},${x.lastName},${x.phone},${x.email}`).join("\n");
    downloadTextFile(`duty-roster-${month ?? "all"}.csv`, header + lines, "text/csv");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xl font-semibold text-slate-900">Aylık Nöbet Listesi</div>
          <div className="text-sm text-slate-600">
            Seçili ay: <b>{month}</b> • Kayıt: <b>{monthItems.length}</b>
            {loading ? <span className="ml-2 text-slate-500">• yükleniyor...</span> : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-700">Ay</label>
            <input
              type="month"
              value={month ?? ""}                 // ✅ null ise boş göster
              onChange={(e) => {
                const v = e.target.value;
                setMonth(v ? v : null);           // ✅ temizlenirse null -> tüm kayıtlar
              }}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button onClick={downloadCsvForCurrentMonth} className="rounded-xl border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            CSV İndir
          </button>

          {isAdmin ? (
            <>
              <button
                onClick={() => setUploadOpen(true)}
                className="rounded-xl border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Excel/CSV Upload
              </button>
              <button
                onClick={openCreate}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                + Yeni Kayıt
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b">
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Ad Soyad</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Mail</th>
                {isAdmin ? <th className="px-4 py-3 text-right">Aksiyon</th> : null}
              </tr>
            </thead>
            <tbody>
              {monthItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={isAdmin ? 5 : 4}>
                    Bu ay için kayıt yok.
                  </td>
                </tr>
              ) : (
                monthItems.map((x) => (
                  <tr key={x.id} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-4 py-3">{formatDisplayDate(x.date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {x.firstName} {x.lastName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{x.phone}</td>
                    <td className="px-4 py-3 text-slate-700">{x.email}</td>
                    {isAdmin ? (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(x)}
                            className="rounded-xl border px-3 py-1.5 text-xs text-slate-700 hover:bg-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteItem(x.id)}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DutyRosterEditorModal
        isOpen={editorOpen}
        mode={editorMode}
        initial={editing}
        onClose={() => setEditorOpen(false)}
        onSave={saveItem}
      />

      <DutyRosterUploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onImport={handleImport} />
    </div>
  );
}