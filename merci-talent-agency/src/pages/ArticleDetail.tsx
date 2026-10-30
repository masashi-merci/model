import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ArticleImage from '../components/ArticleImage';
import { Article, ArticleKind, articleCategory, articleText } from '../components/ArticleHighlights';

export default function ArticleDetail({ kind }: { kind: ArticleKind }) {
  const { id } = useParams();
  const [item, setItem] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setItem(null);
    setFailed(false);
    const fetchArticle = async () => {
      try {
        const { data, error } = await supabase.from(kind).select('*').eq('id', id).eq('active', true).maybeSingle();
        if (!canceled) { setFailed(Boolean(error)); setItem(error ? null : data as Article | null); }
      } catch { if (!canceled) setFailed(true); }
      finally { if (!canceled) setLoading(false); }
    };
    fetchArticle();
    return () => { canceled = true; };
  }, [kind, id]);

  return <div className="container-custom pt-32 pb-24">
    <Link to={`/${kind}`} className="inline-flex items-center gap-2 text-xs tracking-widest mb-12"><ArrowLeft size={14} /> ALL {kind.toUpperCase()}</Link>
    {loading ? <p role="status">Loading…</p>
      : failed ? <p role="alert">Unable to load this article. Please try again later.</p>
      : !item ? <div className="py-16"><h1 className="text-3xl mb-4">Article not found</h1><p className="text-brand-gray">This article is not available.</p></div>
      : <article className="max-w-4xl mx-auto">
        {articleCategory(item) && <p className="text-xs text-brand-gray tracking-widest uppercase mb-4">{articleCategory(item)}</p>}
        <h1 className="text-3xl md:text-5xl leading-tight break-words mb-10">{item.title}</h1>
        <ArticleImage src={item.image} title={item.title} grayscale={'isGrayscale' in item && item.isGrayscale} className="aspect-[4/3] rounded-sm mb-10" />
        <div className="text-base leading-loose whitespace-pre-wrap break-words">{articleText(item)}</div>
      </article>}
  </div>;
}
