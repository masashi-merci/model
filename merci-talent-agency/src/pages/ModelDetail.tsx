import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Model } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, LayoutGrid, Instagram, Twitter, Bookmark, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Markdown from 'react-markdown';

export default function ModelDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    name: '',
    email: '',
    company: '',
    date: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allImages = model ? [model.mainImage, ...(model.images || [])] : [];
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'booking',
          modelName: model.name,
          data: bookingFormData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send booking request');
      }

      setSubmitted(true);
      setBookingFormData({ name: '', email: '', company: '', date: '', message: '' });
    } catch (err: any) {
      console.error('Error sending booking request:', err);
      setError(err.message || 'Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          onClick={() => setSelectedImage(model.mainImage)}
        >
          <img 
            src={model.mainImage} 
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
            <button 
              onClick={() => setIsBookingModalOpen(true)}
              className="btn-primary w-full tracking-[0.3em] text-xs py-4"
            >
              BOOKING REQUEST
            </button>
            
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
        </div>
      </div>

      {/* Portfolio Grid - Full Width Below */}
      {model.images && model.images.length > 0 && (
        <div className="mt-24 space-y-12">
          <div className="flex items-center justify-between border-b border-brand-black/5 pb-4">
            <h2 className="text-[10px] tracking-[0.4em] text-brand-gray uppercase font-bold">PORTFOLIO IMAGES</h2>
            <span className="text-[10px] tracking-widest text-brand-gray/50">{model.images.length} PHOTOS</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {model.images.map((img, i) => (
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

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/60 backdrop-blur-sm p-4"
            onClick={() => {
              setIsBookingModalOpen(false);
              setSubmitted(false);
              setError(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 md:p-12">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-serif tracking-widest uppercase">Booking Request</h2>
                  <button 
                    onClick={() => {
                      setIsBookingModalOpen(false);
                      setSubmitted(false);
                      setError(null);
                    }}
                    className="text-brand-gray hover:text-brand-black transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {submitted ? (
                  <div className="text-center py-12 space-y-6">
                    <div className="w-16 h-16 bg-brand-black text-brand-white rounded-full flex items-center justify-center mx-auto">
                      <FileText size={24} />
                    </div>
                    <h3 className="text-xl font-serif tracking-widest uppercase">Request Sent</h3>
                    <p className="text-brand-gray text-sm">Thank you for your interest. We will contact you shortly regarding {model.name}.</p>
                    <button 
                      onClick={() => {
                        setIsBookingModalOpen(false);
                        setSubmitted(false);
                      }}
                      className="btn-primary px-8 py-3 text-[10px] tracking-widest"
                    >
                      CLOSE
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleBookingSubmit} className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Name</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-transparent border-b border-brand-black/10 py-2 focus:outline-none focus:border-brand-black transition-colors" 
                        value={bookingFormData.name}
                        onChange={(e) => setBookingFormData({ ...bookingFormData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Email</label>
                        <input 
                          type="email" 
                          required
                          className="w-full bg-transparent border-b border-brand-black/10 py-2 focus:outline-none focus:border-brand-black transition-colors" 
                          value={bookingFormData.email}
                          onChange={(e) => setBookingFormData({ ...bookingFormData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Company</label>
                        <input 
                          type="text" 
                          className="w-full bg-transparent border-b border-brand-black/10 py-2 focus:outline-none focus:border-brand-black transition-colors" 
                          value={bookingFormData.company}
                          onChange={(e) => setBookingFormData({ ...bookingFormData, company: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Preferred Date</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 2024/05/20"
                        className="w-full bg-transparent border-b border-brand-black/10 py-2 focus:outline-none focus:border-brand-black transition-colors" 
                        value={bookingFormData.date}
                        onChange={(e) => setBookingFormData({ ...bookingFormData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Message / Project Details</label>
                      <textarea 
                        required
                        rows={4}
                        className="w-full bg-transparent border border-brand-black/10 p-3 focus:outline-none focus:border-brand-black transition-colors text-sm" 
                        value={bookingFormData.message}
                        onChange={(e) => setBookingFormData({ ...bookingFormData, message: e.target.value })}
                      />
                    </div>

                    {error && (
                      <p className="text-red-500 text-[10px] tracking-widest uppercase">{error}</p>
                    )}

                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="btn-primary w-full tracking-[0.3em] text-[10px] py-4 flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'SEND BOOKING REQUEST'
                      )}
                    </button>
                  </form>
                )}
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
