import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Model } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, LayoutGrid, Instagram, Bookmark, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Markdown from 'react-markdown';

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

export default function ModelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCategory = location.state?.fromCategory;
  
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const displayMainImage = (fromCategory === 'models' && model?.model_main_image) ? model.model_main_image : model?.mainImage;
  const displayPortfolioImages = (fromCategory === 'models' && model?.model_images && model.model_images.length > 0) ? model.model_images : model?.images;

  const allImages = model ? [displayMainImage, ...(displayPortfolioImages || [])] : [];
  const currentIndex = selectedImage ? allImages.indexOf(selectedImage) : -1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, currentIndex]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < allImages.length - 1) {
      setSelectedImage(allImages[currentIndex + 1]);
    } else {
      setSelectedImage(allImages[0]);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setSelectedImage(allImages[currentIndex - 1]);
    } else {
      setSelectedImage(allImages[allImages.length - 1]);
    }
  };

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
      <div className="pt-32 pb-32 container-custom flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-brand-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="pt-32 pb-32 container-custom text-center">
        <h1 className="text-4xl font-serif mb-8">Talent Not Found</h1>
        <Link to="/" className="btn-primary inline-block">BACK TO HOME</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-32 container-custom">
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-[10px] tracking-[0.2em] hover:text-brand-gray transition-colors font-bold"
        >
          <ArrowLeft size={14} className="mr-2" /> BACK
        </button>
        <Link to={`/models/${model.category}`} className="inline-flex items-center text-[10px] tracking-[0.2em] hover:text-brand-gray transition-colors">
          CATEGORY <LayoutGrid size={14} className="ml-2" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        {/* Left: Large Image */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="aspect-[3/4] overflow-hidden bg-brand-black/5 cursor-zoom-in"
          onClick={() => setSelectedImage(displayMainImage || null)}
        >
          <img 
            src={displayMainImage} 
            alt={model.name} 
            className={`w-full h-full object-cover transition-all duration-1000 hover:scale-105 ${model.isGrayscale ? 'grayscale' : ''}`}
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
                    <XIcon size={20} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Grid - Full Width Below */}
      {displayPortfolioImages && displayPortfolioImages.length > 0 && (
        <div className="mt-24 space-y-12">
          <div className="flex items-center justify-between border-b border-brand-black/5 pb-4">
            <h2 className="text-[10px] tracking-[0.4em] text-brand-gray uppercase font-bold">PORTFOLIO IMAGES</h2>
            <span className="text-[10px] tracking-widest text-brand-gray/50">{displayPortfolioImages.length} PHOTOS</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayPortfolioImages.map((img, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="aspect-[3/4] overflow-hidden bg-brand-black/5 cursor-zoom-in group"
                onClick={() => setSelectedImage(img)}
              >
                <img 
                  src={img} 
                  alt={`${model.name} portfolio ${i}`} 
                  className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${model.isGrayscale ? 'grayscale' : ''}`}
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/95 p-4 md:p-8"
            onClick={() => setSelectedImage(null)}
          >
            {/* Close Button */}
            <button 
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-[60]"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X size={32} />
            </button>

            {/* Navigation Arrows */}
            <button 
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors z-[60] p-2"
              onClick={handlePrev}
            >
              <ChevronLeft size={48} strokeWidth={1} />
            </button>

            <button 
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors z-[60] p-2"
              onClick={handleNext}
            >
              <ChevronRight size={48} strokeWidth={1} />
            </button>

            {/* Image Container */}
            <motion.div
              key={selectedImage}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Enlarged view"
                className={`max-w-full max-h-[90vh] object-contain shadow-2xl ${model.isGrayscale ? 'grayscale' : ''}`}
                referrerPolicy="no-referrer"
              />
              
              {/* Counter */}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.4em] text-white/50 uppercase">
                {currentIndex + 1} / {allImages.length}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
