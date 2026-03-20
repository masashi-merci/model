import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Model } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, LayoutGrid, Instagram, Twitter, Bookmark, FileText } from 'lucide-react';
import Markdown from 'react-markdown';

export default function ModelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModel = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('models')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (error) throw error;
        setModel(data as Model);
      } catch (error) {
        console.error("Error fetching model:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchModel();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-20 pb-32 container-custom flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-brand-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="pt-20 pb-32 container-custom text-center">
        <h1 className="text-4xl font-serif mb-8">Talent Not Found</h1>
        <Link to="/" className="btn-primary inline-block">BACK TO HOME</Link>
      </div>
    );
  }

  return (
    <div className="pt-16 pb-32 container-custom">
      <div className="flex justify-end mb-8">
        <Link to={`/models/${model.category}`} className="inline-flex items-center text-[10px] tracking-[0.2em] hover:text-brand-gray transition-colors">
          BACK <LayoutGrid size={14} className="ml-2" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        {/* Left: Large Image */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="aspect-[3/4] overflow-hidden bg-brand-black/5"
        >
          <img 
            src={model.mainImage} 
            alt={model.name} 
            className={`w-full h-full object-cover transition-all duration-1000 ${model.isGrayscale ? 'grayscale' : ''}`}
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* Right: Info */}
        <div className="space-y-12">
          <div>
            <p className="text-[10px] tracking-[0.4em] text-red-600 font-bold uppercase mb-6">
              {model.category.replace('-', ' ')} BOARD
            </p>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-5xl md:text-6xl font-serif tracking-wider uppercase">
                {model.name}
              </h1>
              <button className="text-brand-gray hover:text-brand-black transition-colors">
                <Bookmark size={24} />
              </button>
            </div>
            {model.japaneseName && (
              <p className="text-brand-gray tracking-widest text-sm">{model.japaneseName}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-brand-black/5 pt-8">
            <Stat label="Height" value={model.height} />
            <Stat label="Bust" value={model.bust} />
            <Stat label="Waist" value={model.waist} />
            <Stat label="Hips" value={model.hips} />
            <Stat label="Shoes" value={model.shoes} />
          </div>

          {/* Profile PDF Link */}
          {model.profilePdf && (
            <div className="pt-4">
              <a 
                href={model.profilePdf}
                download={`${model.name.replace(/\s+/g, '_')}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-[10px] tracking-[0.3em] text-brand-black hover:text-brand-gray transition-colors font-bold border-b border-brand-black pb-1"
              >
                <FileText size={14} className="mr-2" /> PROFILE
              </a>
            </div>
          )}

          {/* Description */}
          {model.description && (
            <div className="prose prose-sm max-w-none text-brand-black/80 leading-relaxed font-light tracking-wide whitespace-pre-wrap border-t border-brand-black/5 pt-8">
              <Markdown>{model.description}</Markdown>
            </div>
          )}

          {/* Tags */}
          {model.tags && model.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4">
              {model.tags.map((tag, i) => (
                <span key={i} className="px-3 py-1 bg-brand-black/5 text-[10px] tracking-widest uppercase text-brand-gray">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions & Social */}
          <div className="pt-12 border-t border-brand-black/5 space-y-8">
            <button className="btn-primary w-full tracking-[0.3em] text-xs py-4">BOOKING REQUEST</button>
            
            {(model.instagram || model.x_url) && (
              <div className="flex justify-center space-x-12">
                {model.instagram && (
                  <a 
                    href={model.instagram.startsWith('http') ? model.instagram : `https://instagram.com/${model.instagram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-brand-gray hover:text-brand-black transition-colors"
                  >
                    <Instagram size={20} />
                  </a>
                )}
                {model.x_url && (
                  <a 
                    href={model.x_url.startsWith('http') ? model.x_url : `https://x.com/${model.x_url.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-brand-gray hover:text-brand-black transition-colors"
                  >
                    <Twitter size={20} />
                  </a>
                )}
              </div>
            )}
          </div>

      {/* Portfolio Grid (Optional, below the main info) */}
      {model.images && model.images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 pt-12">
          {model.images.map((img, i) => (
            <div key={i} className="aspect-[3/4] overflow-hidden bg-brand-black/5">
              <img 
                src={img} 
                alt={`${model.name} portfolio ${i}`} 
                className={`w-full h-full object-cover transition-all duration-700 ${model.isGrayscale ? 'grayscale' : ''}`}
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-[10px] tracking-widest text-brand-gray uppercase">{label} :</span>
      <span className="text-sm font-medium">{value || '-'}</span>
    </div>
  );
}
