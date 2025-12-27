// src/api/askgtApi.ts
export type AskGTAuthor = {
  name: string;
  avatarUrl?: string;
  department?: string;
};

export type AskGTArticle = {
  id: string;
  title: string;
  description: string;
  content: string;
  author: AskGTAuthor;
  category: string;
  tags: string[];
  publishDate: string; // YYYY-MM-DD
  readTime?: number;
  likes?: number;
  views?: number;
  thumbnailUrl?: string;
  isFavorite?: boolean;

  sourceUrl?: string;

  createdAt?: string;
  updatedAt?: string;
};

const DEFAULT_BASE = ""; // Vite proxy ile /api kullanılacak

function base(): string {
  // proxy kullanıyorsak boş bırakmak en temiz:
  return DEFAULT_BASE;
}

async function json<T>(r: Response): Promise<T> {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function getAskGTArticles(params?: { category?: string; q?: string }): Promise<AskGTArticle[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.q) qs.set("q", params.q);
  const suf = qs.toString() ? `?${qs.toString()}` : "";
  const r = await fetch(`${base()}/api/askgt/articles${suf}`);
  return await json<AskGTArticle[]>(r);
}

export async function upsertAskGTArticle(article: AskGTArticle): Promise<AskGTArticle[]> {
  const r = await fetch(`${base()}/api/askgt/articles/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(article),
  });
  const res = await json<{ ok: boolean; items: AskGTArticle[] }>(r);
  return res.items || [];
}

export async function importAskGTArticles(items: AskGTArticle[]): Promise<AskGTArticle[]> {
  const r = await fetch(`${base()}/api/askgt/articles/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const res = await json<{ ok: boolean; items: AskGTArticle[] }>(r);
  return res.items || [];
}

export async function deleteAskGTArticle(id: string): Promise<AskGTArticle[]> {
  const r = await fetch(`${base()}/api/askgt/articles/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const res = await json<{ ok: boolean; items: AskGTArticle[] }>(r);
  return res.items || [];
}