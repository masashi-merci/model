import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { News } from '../types';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

export default function NewsList() {
  const [news, setNews] = useState<News[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('active', true)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching news:', error);
      } else {
        setNews(data as News[]);
      }
      setLoading(false);
    };
    fetchNews();
  }, []);

  return (
    <div className="pt-32 pb-32 container-custom">
      <div className="mb-12">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-[10px] tracking-[0.2em] hover:text-brand-gray transition-colors font-bold"
        >
          <ArrowLeft size={14} className="mr-2" /> BACK
        </button>
      </div>

      <div className="mb-24 text-center">
        <h1 className="text-5xl md:text-8xl font-serif tracking-widest mb-6">NEWS</h1>
        <p className="text-brand-gray tracking-[0.3em] text-xs uppercase">Latest updates from the agency</p>
      </div>

      {loading ? (
        <div className="space-y-16">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-brand-black/5 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-32 max-w-4xl mx-auto">
          {news.length > 0 ? (
            news.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="flex flex-col md:flex-row gap-12 items-center">
                  {item.image && (
                    <div className="w-full md:w-1/2 aspect-video overflow-hidden bg-brand-black/5">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className={`w-full h-full object-cover transition-all duration-700 ${item.isGrayscale ? 'grayscale' : ''}`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className={item.image ? "w-full md:w-1/2" : "w-full text-center"}>
                    <p className="text-[10px] tracking-[0.3em] text-brand-gray mb-4">
                      {item.date ? format(new Date(item.date), 'MMMM dd, yyyy').toUpperCase() : ''}
                    </p>
                    <h2 className="text-3xl md:text-4xl font-serif mb-6 leading-tight group-hover:text-brand-gray transition-colors">
                      {item.title}
                    </h2>
                    <p className="text-brand-gray leading-relaxed text-sm mb-8 line-clamp-3">
                      {item.content}
                    </p>
                    <button className="text-xs tracking-[0.2em] border-b border-brand-black pb-1 hover:text-brand-gray hover:border-brand-gray transition-all">
                      READ MORE
                    </button>
                  </div>
                </div>
              </motion.article>
            ))
          ) : (
            <div className="py-32 text-center">
              <p className="text-brand-gray tracking-widest">NO NEWS UPDATES AT THIS TIME.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
