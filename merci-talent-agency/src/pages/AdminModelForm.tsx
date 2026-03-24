import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Model } from '../types';
import { ArrowLeft, Plus, X, Image as ImageIcon, FileText } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import PdfUpload from '../components/PdfUpload';

import { MODEL_ROLES } from '../constants';

export default function AdminModelForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Model>>({
    name: '',
    category: 'artists',
    height: '',
    bust: '',
    waist: '',
    hips: '',
    shoes: '',
    hair: '',
    eyes: '',
    mainImage: '',
    isGrayscale: false,
    images: [],
    slug: '',
    active: true,
    instagram: '',
    x_url: '',
    japaneseName: '',
    description: '',
    tags: [],
    profilePdf: '',
  });

  const toggleRole = (role: string) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(role)) {
      setFormData({ ...formData, tags: currentTags.filter(t => t !== role) });
    } else {
      setFormData({ ...formData, tags: [...currentTags, role] });
    }
  };

  useEffect(() => {
    if (id) {
      const fetchModel = async () => {
        const { data, error } = await supabase
          .from('models')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching model:', error);
        } else {
          setFormData(data as Model);
        }
      };
      fetchModel();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const slug = formData.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
      
      // Prepare data, removing id if it's a new record
      const { id: _, ...restData } = formData;
      const data = {
        ...restData,
        slug,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { error } = await supabase
          .from('models')
          .update(data)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('models')
          .insert([{ ...data, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Full error object:', err);
      const errorMessage = err.message || err.details || 'Unknown error occurred';
      alert(`Error saving model: ${errorMessage}\n\nCheck if your database schema matches the latest updates (e.g. x_url column).`);
    } finally {
      setLoading(false);
    }
  };

  const handleMainImageUpload = (url: string) => {
    setFormData({ ...formData, mainImage: url });
  };

  const handlePortfolioImageUpload = (url: string) => {
    setFormData({ ...formData, images: [...(formData.images || []), url] });
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  return (
    <div className="pt-20 pb-32 container-custom max-w-4xl">
      <button onClick={() => navigate('/admin/dashboard')} className="flex items-center text-xs tracking-widest mb-12 hover:text-brand-gray transition-colors">
        <ArrowLeft size={14} className="mr-2" /> BACK TO DASHBOARD
      </button>

      <h1 className="text-4xl font-serif tracking-widest mb-12">{id ? 'EDIT MODEL' : 'ADD NEW MODEL'}</h1>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div>
              <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">FULL NAME (English)</label>
              <input 
                type="text" 
                required
                className="input-field" 
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">JAPANESE NAME</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.japaneseName || ''}
                onChange={(e) => setFormData({ ...formData, japaneseName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">CATEGORY</label>
              <select 
                className="input-field"
                value={formData.category || 'artists'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="artists">ARTISTS</option>
                <option value="event-partners">EVENT PARTNERS</option>
                <option value="models">MODELS</option>
                <option value="commercial">COMMERCIAL</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block">ROLES / SPECIALTIES</label>
              <div className="grid grid-cols-2 gap-4">
                {MODEL_ROLES.map(role => (
                  <div key={role} className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id={`role-${role}`}
                      checked={formData.tags?.includes(role) || false}
                      onChange={() => toggleRole(role)}
                      className="w-4 h-4 border-brand-black/20 focus:ring-brand-black"
                    />
                    <label htmlFor={`role-${role}`} className="text-[10px] tracking-widest text-brand-gray uppercase cursor-pointer">
                      {role}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block">MAIN PROFILE IMAGE</label>
              {formData.mainImage ? (
                <div className="relative aspect-[3/4] bg-brand-black/5 group">
                  <img src={formData.mainImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, mainImage: '' })}
                    className="absolute top-2 right-2 p-2 bg-brand-white/80 rounded-full hover:bg-brand-white transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <ImageUpload 
                  onUpload={handleMainImageUpload} 
                  folder="models/main" 
                  customName={formData.name ? `${formData.name}_main` : undefined}
                />
              )}
            </div>

            <div className="flex items-center space-x-4">
              <input 
                type="checkbox" 
                id="isGrayscale"
                checked={!!formData.isGrayscale}
                onChange={(e) => setFormData({ ...formData, isGrayscale: e.target.checked })}
              />
              <label htmlFor="isGrayscale" className="text-[10px] tracking-widest text-brand-gray uppercase">GRAYSCALE FILTER</label>
            </div>

            <div className="flex items-center space-x-4">
              <input 
                type="checkbox" 
                id="active"
                checked={!!formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              <label htmlFor="active" className="text-[10px] tracking-widest text-brand-gray uppercase">ACTIVE PROFILE</label>
            </div>

            <div className="pt-8 space-y-8 border-t border-brand-black/5">
              <div>
                <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">DESCRIPTION / BIO</label>
                <textarea 
                  className="input-field min-h-[150px] py-4" 
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Model biography, credits, etc."
                />
              </div>
              <div>
                <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">TAGS (Comma separated)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                  placeholder="Walking, Foreigner, etc."
                />
              </div>
            </div>

            <div className="pt-8 space-y-8 border-t border-brand-black/5">
              <div>
                <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">INSTAGRAM (Username or URL)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.instagram || ''}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">X (Username or URL)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={formData.x_url || ''}
                  onChange={(e) => setFormData({ ...formData, x_url: e.target.value })}
                  placeholder="@username"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <InputField label="HEIGHT" value={formData.height} onChange={(v) => setFormData({ ...formData, height: v })} />
            <InputField label="BUST" value={formData.bust} onChange={(v) => setFormData({ ...formData, bust: v })} />
            <InputField label="WAIST" value={formData.waist} onChange={(v) => setFormData({ ...formData, waist: v })} />
            <InputField label="HIPS" value={formData.hips} onChange={(v) => setFormData({ ...formData, hips: v })} />
            <InputField label="SHOES" value={formData.shoes} onChange={(v) => setFormData({ ...formData, shoes: v })} />
          </div>

          <div className="pt-8 space-y-8 border-t border-brand-black/5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase block">PROFILE PDF</label>
              {!formData.name && (
                <p className="text-[10px] text-red-500 tracking-widest uppercase animate-pulse">
                  Type English Name First for Clean Filename
                </p>
              )}
            </div>
            {formData.profilePdf ? (
              <div className="flex items-center justify-between p-4 bg-brand-black/5">
                <div className="flex items-center">
                  <FileText size={20} className="mr-3 text-brand-gray" />
                  <span className="text-[10px] tracking-widest uppercase truncate max-w-[200px]">Profile PDF Uploaded</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, profilePdf: '' })}
                  className="p-2 hover:bg-brand-black/5 rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <PdfUpload 
                onUpload={(url) => setFormData({ ...formData, profilePdf: url })} 
                customName={formData.name ? formData.name.trim() : undefined}
              />
            )}
          </div>
        </div>

        <div className="border-t border-brand-black/10 pt-12">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs tracking-widest text-brand-gray uppercase">PORTFOLIO IMAGES</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formData.images?.map((img, i) => (
              <div key={i} className="relative aspect-[3/4] bg-brand-black/5 group">
                <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 p-1 bg-brand-white/80 rounded-full hover:bg-brand-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <div className="aspect-[3/4]">
              <ImageUpload 
                onUpload={handlePortfolioImageUpload} 
                folder="models/portfolio" 
                customName={formData.name ? `${formData.name}_portfolio_${formData.images?.length || 0}` : undefined}
              />
            </div>
          </div>
        </div>

        <div className="pt-12">
          <button type="submit" disabled={loading || !formData.mainImage} className="btn-primary w-full tracking-[0.3em] text-xs disabled:opacity-50">
            {loading ? 'SAVING...' : 'SAVE MODEL PROFILE'}
          </button>
        </div>
      </form>
    </div>
  );
}

function InputField({ label, value, onChange }: { label: string, value?: string, onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">{label}</label>
      <input 
        type="text" 
        className="input-field" 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
