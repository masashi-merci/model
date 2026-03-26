import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Model } from '../types';
import { motion } from 'motion/react';
import { MODEL_ROLES } from '../constants';
import { ArrowLeft } from 'lucide-react';

export default function ModelList() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<string>('all');

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('category', category)
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching models:', error);
      } else {
        setModels(data as Model[]);
      }
      setLoading(false);
    };
    fetchModels();
  }, [category]);

  const filteredModels = activeRole === 'all'
    ? models
    : models.filter(m => m.tags?.includes(activeRole));

  const categoryTitle = category?.replace('-', ' ').toUpperCase();

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

      <div className="mb-16 text-center">
        <h1 className="text-5xl md:text-8xl font-serif tracking-widest mb-6">{categoryTitle}</h1>
        <p className="text-brand-gray tracking-[0.3em] text-xs uppercase">Our curated selection of talent</p>
      </div>

      {/* Role Filter */}
      {category === 'event-partners' && (
        <div className="mb-12 flex flex-wrap justify-center gap-4 md:gap-8">
          <button 
            onClick={() => setActiveRole('all')}
            className={`text-[10px] tracking-[0.3em] uppercase pb-1 border-b transition-all ${activeRole === 'all' ? 'border-brand-black font-bold' : 'border-transparent text-brand-gray'}`}
          >
            ALL
          </button>
          {MODEL_ROLES.map(role => (
            <button 
              key={role}
              onClick={() => setActiveRole(role)}
              className={`text-[10px] tracking-[0.3em] uppercase pb-1 border-b transition-all ${activeRole === role ? 'border-brand-black font-bold' : 'border-transparent text-brand-gray'}`}
            >
              {role}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[1, 2, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[3/4] bg-brand-black/5 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredModels.length > 0 ? (
            filteredModels.map((model, index) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative aspect-[3/4] overflow-hidden bg-brand-black/5"
              >
                <Link to={`/model/${model.slug}`}>
                  <img 
                    src={model.mainImage} 
                    alt={model.name}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${model.isGrayscale ? 'grayscale' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-brand-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                    <h3 className="text-brand-white text-xl font-serif tracking-widest">{model.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {model.tags?.filter(t => MODEL_ROLES.includes(t)).map(role => (
                        <span key={role} className="text-[8px] tracking-tighter border border-brand-white/30 px-1 py-0.5 uppercase text-brand-white/80">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center">
              <p className="text-brand-gray tracking-widest">NO MODELS FOUND FOR THIS FILTER.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
