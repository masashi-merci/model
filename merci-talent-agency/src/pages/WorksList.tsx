import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Work } from '../types';
import { motion } from 'motion/react';

export default function WorksList() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorks = async () => {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('active', true)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching works:', error);
      } else {
        setWorks(data as Work[]);
      }
      setLoading(false);
    };
    fetchWorks();
  }, []);

  if (loading) {
    return (
      <div className="pt-40 pb-32 text-center">
        <div className="w-10 h-10 border-2 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[10px] tracking-widest uppercase text-brand-gray">Loading works...</p>
      </div>
    );
  }

  return (
    <div className="pt-40 pb-32 container-custom">
      <div className="mb-20">
        <h1 className="text-5xl md:text-7xl font-serif tracking-widest mb-6">WORKS</h1>
        <p className="text-brand-gray tracking-[0.3em] text-xs uppercase">Our achievements and projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {works.map((work, index) => (
          <motion.div
            key={work.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group"
          >
            <div className="aspect-video overflow-hidden bg-brand-black/5 mb-6">
              <img 
                src={work.image || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80"} 
                alt={work.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] tracking-widest text-brand-gray uppercase">{work.category}</p>
              {work.date && (
                <p className="text-[10px] tracking-widest text-brand-gray/60 uppercase">
                  {new Date(work.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' }).replace(/\//g, '.')}
                </p>
              )}
            </div>
            <h3 className="text-xl font-serif tracking-widest group-hover:text-brand-gray transition-colors mb-2">{work.title}</h3>
            {work.description && (
              <p className="text-xs text-brand-gray/80 line-clamp-2 font-light tracking-wider leading-relaxed">{work.description}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
