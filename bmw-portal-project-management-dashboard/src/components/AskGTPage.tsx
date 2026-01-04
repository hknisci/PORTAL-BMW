// components/AskGTPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ASKGT_CATEGORIES } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import {
  AskGTArticle,
  deleteAskGTArticle,
  getAskGTArticles,
  upsertAskGTArticle,
} from "@/api/askgtApi";
import { openExternalUrl } from "@/utils/url";
import {
  MagnifyingGlassIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";

function isLikelyAdmin(user: any) {
  if (!user) return false;
  if (user.role) return String(user.role).toLowerCase() === "admin";
  if (user.username) return String(user.username).toLowerCase() === "admin";
  return false;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function wikiUrlFromTitle(title: string) {
  const t = String(title || "").trim().replace(/\s+/g, "_");
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(t)}`;
}

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

type EditorMode = "create" | "edit";

function AskGTEditorModal(props: {
  isOpen: boolean;
  mode: EditorMode;
  initial?: AskGTArticle | null;
  categoryDefault: string;
  onClose: () => void;
  onSave: (a: AskGTArticle) => void;
}) {
  const { isOpen, mode, initial, categoryDefault, onClose, onSave } = props;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [publishDate, setPublishDate] = useState(initial?.publishDate ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [authorName, setAuthorName] = useState(initial?.author?.name ?? "");
  const [authorDept, setAuthorDept] = useState(initial?.author?.department ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? "");
  const [category, setCategory] = useState(initial?.category ?? categoryDefault);

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setContent(initial?.content ?? "");
    setTags((initial?.tags ?? []).join(", "));
    setPublishDate(initial?.publishDate ?? "");
    setSourceUrl(initial?.sourceUrl ?? "");
    setAuthorName(initial?.author?.name ?? "");
    setAuthorDept(initial?.author?.department ?? "");
    setThumbnailUrl(initial?.thumbnailUrl ?? "");
    setCategory(initial?.category ?? categoryDefault);
    setErrors([]);
  }, [initial, isOpen, categoryDefault]);

  function validate(): string[] {
    const e: string[] = [];
    if (!title.trim()) e.push("Başlık zorunlu.");
    if (!description.trim()) e.push("Açıklama zorunlu.");
    if (!authorName.trim()) e.push("Yazar adı zorunlu.");
    if (!category.trim()) e.push("Kategori zorunlu.");
    if (publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) e.push("Publish date YYYY-MM-DD olmalı.");
    return e;
  }

  function handleSave() {
    const e = validate();
    setErrors(e);
    if (e.length) return;

    const nowDate = new Date().toISOString().slice(0, 10);

    const article: AskGTArticle = {
      id: mode === "edit" && initial ? initial.id : uid(),
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      category,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      publishDate: (publishDate || nowDate).trim(),
      sourceUrl: (sourceUrl || wikiUrlFromTitle(title)).trim(),
      author: {
        name: authorName.trim(),
        department: authorDept.trim() || undefined,
        avatarUrl: initial?.author?.avatarUrl,
      },
      thumbnailUrl: thumbnailUrl.trim() || undefined,

      // optional counters:
      likes: initial?.likes ?? 0,
      views: initial?.views ?? 0,
      readTime: initial?.readTime ?? 5,
      isFavorite: initial?.isFavorite ?? false,
    };

    onSave(article);
    onClose();
  }

  return (
    <Modal
      title={mode === "create" ? "Yeni Makale" : "Makaleyi Düzenle"}
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
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Başlık</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Açıklama</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">İçerik (opsiyonel)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Kategori</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          >
            {ASKGT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Publish Date</label>
          <input
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Yazar</label>
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Departman (ops.)</label>
          <input
            value={authorDept}
            onChange={(e) => setAuthorDept(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Tags (virgülle)</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="jboss, performance, ssl"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Read More URL (ops.)</label>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Boş bırakırsan Wikipedia otomatik"
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Thumbnail URL (ops.)</label>
          <input
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
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

const AskGTPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = isLikelyAdmin(user);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("jboss");

  // server data
  const [articles, setArticles] = useState<AskGTArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // favorites şimdilik local state kalsın (ileride API’ye taşırız)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // editor modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editing, setEditing] = useState<AskGTArticle | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAskGTArticles()
      .then((list) => setArticles(Array.isArray(list) ? list : []))
      .catch((e: any) => setError(e?.message || "AskGT verisi alınamadı"))
      .finally(() => setLoading(false));
  }, []);

  const filteredArticles = useMemo(() => {
    let filtered = articles;

    // Kategori filtresi
    filtered = filtered.filter((a) => a.category === selectedCategory);

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => {
        return (
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          (a.author?.name || "").toLowerCase().includes(query) ||
          (Array.isArray(a.tags) ? a.tags : []).some((t) => String(t).toLowerCase().includes(query))
        );
      });
    }

    return filtered.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  }, [articles, searchQuery, selectedCategory]);

  const toggleFavorite = (articleId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(articleId)) newFavorites.delete(articleId);
    else newFavorites.add(articleId);
    setFavorites(newFavorites);
  };

  function openCreate() {
    setEditorMode("create");
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(a: AskGTArticle) {
    setEditorMode("edit");
    setEditing(a);
    setEditorOpen(true);
  }

  async function saveArticle(a: AskGTArticle) {
    if (!isAdmin) return;

    try {
      setLoading(true);
      setError(null);
      const next = await upsertAskGTArticle(a);
      setArticles(next);

      // kaydın kategorisine geç
      if (a.category) setSelectedCategory(a.category);
    } catch (e: any) {
      setError(e?.message || "Kaydetme başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function deleteArticle(id: string) {
    if (!isAdmin) return;
    const ok = window.confirm("Bu makaleyi silmek istediğine emin misin?");
    if (!ok) return;

    try {
      setLoading(true);
      setError(null);
      const next = await deleteAskGTArticle(id);
      setArticles(next);
    } catch (e: any) {
      setError(e?.message || "Silme başarısız");
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Makale ara..."
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-3">
            {ASKGT_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedCategory === category.id
                    ? "text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={{
                  backgroundColor: selectedCategory === category.id ? category.color : undefined,
                }}
              >
                <span className="text-lg">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>

          {/* Admin action bar */}
          {isAdmin ? (
            <div className="mt-6 flex justify-center">
              <button
                onClick={openCreate}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                + Yeni Makale
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="mt-4 text-center text-sm text-gray-500">Yükleniyor...</div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredArticles.length} makale bulundu{" "}
            <span className="font-medium">{ASKGT_CATEGORIES.find((c) => c.id === selectedCategory)?.name}</span>{" "}
            kategorisinde
          </p>
        </div>

        {/* Articles List */}
        <div className="max-w-4xl mx-auto space-y-8">
          {filteredArticles.map((article) => (
            <MaterialArticleCard
              key={article.id}
              article={article}
              isFavorite={favorites.has(article.id)}
              onToggleFavorite={() => toggleFavorite(article.id)}
              isAdmin={isAdmin}
              onEdit={() => openEdit(article)}
              onDelete={() => deleteArticle(article.id)}
              onReadMore={() => {
                const url = article.sourceUrl || wikiUrlFromTitle(article.title);
                openExternalUrl(url);
              }}
              formatDate={formatDate}
            />
          ))}
        </div>

        {/* No Results */}
        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <MagnifyingGlassIcon className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Makale bulunamadı</h3>
            <p className="text-gray-600">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
          </div>
        )}
      </div>

      <AskGTEditorModal
        isOpen={editorOpen}
        mode={editorMode}
        initial={editing}
        categoryDefault={selectedCategory}
        onClose={() => setEditorOpen(false)}
        onSave={saveArticle}
      />
    </div>
  );
};

interface MaterialArticleCardProps {
  article: AskGTArticle;
  isFavorite: boolean;
  onToggleFavorite: () => void;

  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReadMore: () => void;

  formatDate: (s: string) => string;
}

const MaterialArticleCard: React.FC<MaterialArticleCardProps> = ({
  article,
  isFavorite,
  onToggleFavorite,
  isAdmin,
  onEdit,
  onDelete,
  onReadMore,
  formatDate,
}) => {
  const category = ASKGT_CATEGORIES.find((cat) => cat.id === article.category);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
        <img
          src={article.thumbnailUrl || `https://picsum.photos/seed/${article.id}/800/400`}
          alt={article.title}
          className="w-full h-full object-cover"
        />

        <button
          onClick={onToggleFavorite}
          className="absolute top-4 right-4 p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
          title="Favorite"
        >
          {isFavorite ? (
            <HeartSolidIcon className="h-5 w-5 text-red-500" />
          ) : (
            <HeartIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {isAdmin ? (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-800 hover:bg-white"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Categories */}
        <div className="flex gap-2 mb-4">
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Technology</span>
          <span
            className="px-3 py-1 text-white text-xs font-medium rounded-full"
            style={{ backgroundColor: category?.color || "#6B7280" }}
          >
            {category?.name}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{article.title}</h3>

        {/* Description */}
        <p className="text-gray-600 mb-6 leading-relaxed">{article.description}</p>

        {/* Author & Meta Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={
                article.author?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author?.name || "User")}&background=3B82F6&color=fff&size=40`
              }
              alt={article.author?.name || "Author"}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">by {article.author?.name || "-"}</p>
              <p className="text-xs text-gray-500">
                {formatDate(article.publishDate)} {article.readTime ? `- ${article.readTime} min read` : ""}
              </p>
            </div>
          </div>

          {/* Read More Button */}
          <button
            onClick={onReadMore}
            className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-full hover:bg-purple-700 transition-colors"
          >
            READ MORE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AskGTPage;