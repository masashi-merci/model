import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Article, ArticleKind, articleCategory, articlePath, articleText } from './ArticleHighlights';
import ArticleImage from './ArticleImage';

export default function ArticleList({ kind }: { kind: ArticleKind }) {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setFailed(false);
    // Range through every page; Supabase's default response limit is not an all-items list.
    const fetchAll = async () => {
      const result: Article[] = [];
      const pageSize = 100;
      try {
        for (let offset = 0; ; offset += pageSize) {
          const { data, error } = await supabase.from(kind).select('*').eq('active', true)
            .order('date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
            .order('id', { ascending: true }).range(offset, offset + pageSize - 1);
          if (canceled) return;
          if (error) throw error;
          result.push(...(data || []) as Article[]);
          if (!data || data.length < pageSize) break;
        }
        setItems(result);
      } catch { if (!canceled) setFailed(true); }
      finally { if (!canceled) setLoading(false); }
    };
    fetchAll();
    return () => { canceled = true; };
  }, [kind]);

  return <div className="pt-32 pb-24 container-custom">
    <Link to={`/#${kind}`} className="inline-flex items-center gap-2 text-xs tracking-widest mb-12"><ArrowLeft size={14} /> BACK TO HOME</Link>
    <header className="mb-14"><h1 className="text-5xl md:text-7xl font-serif tracking-widest uppercase mb-5">{kind}</h1>
      <p className="text-brand-gray text-xs tracking-widest uppercase">{kind === 'works' ? 'Our achievements and projects' : 'Latest updates from the agency'}</p></header>
    {loading ? <p role="status">Loading {kind}…</p>
      : failed ? <p role="alert">Unable to load {kind}. Please refresh to try again.</p>
      : items.length === 0 ? <p className="py-16 text-brand-gray">No {kind} updates at this time.</p>
      : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {items.map(item => <article key={item.id}>
          <Link to={articlePath(kind, item.id)} className="group block focus-visible:outline-2 focus-visible:outline-offset-4">
            <ArticleImage src={item.image} title={item.title} grayscale={'isGrayscale' in item && item.isGrayscale} className="aspect-[4/3] mb-5 rounded-sm" />
            {articleCategory(item) && <p className="text-[10px] text-brand-gray tracking-widest uppercase mb-2">{articleCategory(item)}</p>}
            <h2 className="text-2xl leading-snug mb-3 break-words group-hover:text-brand-gray">{item.title}</h2>
            <p className="text-sm leading-relaxed text-brand-gray line-clamp-3 break-words">{articleText(item)}</p>
            <span className="inline-flex items-center gap-2 mt-5 text-[10px] tracking-widest border-b pb-1">READ MORE <ArrowUpRight size={12} /></span>
          </Link>
        </article>)}
      </div>}
  </div>;
}
