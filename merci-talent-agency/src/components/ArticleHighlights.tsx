import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { News, Work } from '../types';
import ArticleImage from './ArticleImage';

export type Article = News | Work;
export type ArticleKind = 'news' | 'works';
export const articleText = (item: Article) => 'content' in item ? item.content : item.description;
export const articleCategory = (item: Article) => 'category' in item ? item.category : undefined;
export const articlePath = (kind: ArticleKind, id: string) => `/${kind}/${encodeURIComponent(id)}`;

export default function ArticleHighlights({ kind, items, loading, error }: {
  kind: ArticleKind; items: Article[]; loading: boolean; error: boolean;
}) {
  const [featured, ...remaining] = items.slice(0, 5);
  return <section id={kind} className={`py-20 md:py-28 ${kind === 'works' ? 'bg-[#F9F8F6]' : 'bg-white'}`}>
    <div className="container-custom">
      <header className="flex items-center justify-between gap-6 mb-10 md:mb-12">
        <h2 className="text-4xl md:text-6xl font-serif tracking-widest uppercase">{kind}</h2>
        <Link to={`/${kind}`} aria-label={`More ${kind}`} className="shrink-0 inline-flex items-center gap-2 text-xs tracking-[0.15em] border-b border-brand-black pb-2 hover:text-brand-gray focus-visible:outline-2 focus-visible:outline-offset-4">MORE <ArrowUpRight size={16} /></Link>
      </header>
      {loading ? <p role="status" className="py-12 text-sm text-brand-gray">Loading {kind}…</p>
        : error ? <p role="status" className="py-12 text-sm text-brand-gray">Unable to load {kind}. Please try again later.</p>
        : !featured ? <p className="py-12 text-sm text-brand-gray">No {kind} updates at this time.</p>
        : <div className="grid grid-cols-1 md:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] gap-8 lg:gap-10" data-testid={`${kind}-highlights`}>
          <article className="min-w-0">
            <Link className="group block focus-visible:outline-2 focus-visible:outline-offset-4" to={articlePath(kind, featured.id)}>
              <ArticleImage src={featured.image} title={featured.title} grayscale={'isGrayscale' in featured && featured.isGrayscale} className="aspect-[4/3] rounded-sm mb-5" />
              {articleCategory(featured) && <p className="text-[10px] tracking-widest uppercase text-brand-gray mb-2">{articleCategory(featured)}</p>}
              <h3 className="text-2xl lg:text-3xl leading-snug mb-3 break-words group-hover:text-brand-gray">{featured.title}</h3>
              <p className="text-sm leading-relaxed text-brand-gray line-clamp-3 break-words">{articleText(featured)}</p>
            </Link>
          </article>
          {remaining.length > 0 && <div className="flex flex-col gap-6 md:gap-7">
            {remaining.map(item => <article key={item.id} className="min-w-0">
              <Link className="group flex items-start gap-4 lg:gap-5 focus-visible:outline-2 focus-visible:outline-offset-4" to={articlePath(kind, item.id)}>
                <ArticleImage src={item.image} title={item.title} grayscale={'isGrayscale' in item && item.isGrayscale} className="h-24 w-24 md:h-28 md:w-28 shrink-0 rounded-sm" />
                <div className="min-w-0 pt-1">
                  {articleCategory(item) && <p className="text-[10px] tracking-widest uppercase text-brand-gray mb-2">{articleCategory(item)}</p>}
                  <h3 className="text-base lg:text-lg leading-snug line-clamp-3 break-words group-hover:text-brand-gray">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-brand-gray line-clamp-2 break-words">{articleText(item)}</p>
                </div>
              </Link>
            </article>)}
          </div>}
        </div>}
    </div>
  </section>;
}
