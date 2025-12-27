import React, { useState, useMemo } from 'react';
import { ASKGT_ARTICLES, ASKGT_CATEGORIES } from '../constants';
import { AskGTArticle } from '../types';
import { 
  MagnifyingGlassIcon, 
  HeartIcon, 
  EyeIcon, 
  ClockIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const AskGTPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('jboss');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['2', '5']));

  const filteredArticles = useMemo(() => {
    let filtered = ASKGT_ARTICLES;

    // Kategori filtresi
    filtered = filtered.filter(article => article.category === selectedCategory);

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query) ||
        article.author.name.toLowerCase().includes(query) ||
        article.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  }, [searchQuery, selectedCategory]);

  const toggleFavorite = (articleId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(articleId)) {
      newFavorites.delete(articleId);
    } else {
      newFavorites.add(articleId);
    }
    setFavorites(newFavorites);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: selectedCategory === category.id ? category.color : undefined
                }}
              >
                <span className="text-lg">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredArticles.length} makale bulundu
            <span className="font-medium">
              {' '}kategorisinde
            </span>
          </p>
        </div>

        {/* Articles List - Material Blog Style */}
        <div className="max-w-4xl mx-auto space-y-8">
          {filteredArticles.map((article) => (
            <MaterialArticleCard
              key={article.id}
              article={article}
              isFavorite={favorites.has(article.id)}
              onToggleFavorite={() => toggleFavorite(article.id)}
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
            <p className="text-gray-600">
              Arama kriterlerinizi değiştirerek tekrar deneyin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Material Blog Style Article Card Component
interface MaterialArticleCardProps {
  article: AskGTArticle;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const MaterialArticleCard: React.FC<MaterialArticleCardProps> = ({ article, isFavorite, onToggleFavorite }) => {
  const category = ASKGT_CATEGORIES.find(cat => cat.id === article.category);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'short',
      month: 'short',
      year: 'numeric'
    });
  };

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
        >
          {isFavorite ? (
            <HeartSolidIcon className="h-5 w-5 text-red-500" />
          ) : (
            <HeartIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Categories */}
        <div className="flex gap-2 mb-4">
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            Technology
          </span>
          <span 
            className="px-3 py-1 text-white text-xs font-medium rounded-full"
            style={{ backgroundColor: category?.color || '#6B7280' }}
          >
            {category?.name}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
          {article.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {article.description}
        </p>

        {/* Author & Meta Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={article.author.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author.name)}&background=3B82F6&color=fff&size=40`}
              alt={article.author.name}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">
                by {article.author.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(article.publishDate)} - {article.readTime} min read
              </p>
            </div>
          </div>

          {/* Read More Button */}
          <button className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-full hover:bg-purple-700 transition-colors">
            READ MORE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AskGTPage;
