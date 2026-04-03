import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Work } from '../types';
import { ArrowLeft, X } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';

export default function AdminWorkForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Work>>({
    title: '',
    description: '',
    image: '',
    category: '',
    active: true,
  });

  useEffect(() => {
    if (id) {
      const fetchWork = async () => {
        const { data, error } = await supabase
          .from('works')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching work:', error);
        } else {
          setFormData(data as Work);
        }
      };
      fetchWork();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { id: _, ...restData } = formData;
      const data = {
        ...restData,
        date: id ? formData.date : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { error } = await supabase
          .from('works')
          .update(data)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('works')
          .insert([{ ...data, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Full error object:', err);
      const errorMessage = err.message || err.details || 'Unknown error occurred';
      alert(`Error saving work item: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (url: string) => {
    setFormData({ ...formData, image: url });
  };

  return (
    <div className="pt-32 pb-32 container-custom max-w-3xl">
      <button 
        onClick={() => navigate('/admin/dashboard')} 
        className="inline-flex items-center text-[10px] tracking-[0.2em] mb-12 hover:text-brand-gray transition-colors font-bold uppercase"
      >
        <ArrowLeft size={14} className="mr-2" /> BACK TO DASHBOARD
      </button>

      <h1 className="text-4xl font-serif tracking-widest mb-12">{id ? 'EDIT WORK' : 'ADD WORK ITEM'}</h1>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="space-y-8">
          <div>
            <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">TITLE</label>
            <input 
              type="text" 
              required
              className="input-field" 
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">CATEGORY</label>
            <input 
              type="text" 
              required
              className="input-field" 
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.target.value: Advertising, Magazine, etc."
            />
          </div>
          
          <div className="space-y-4">
            <label className="text-[10px] tracking-widest text-brand-gray uppercase block">FEATURED IMAGE</label>
            {formData.image ? (
              <div className="relative aspect-video bg-brand-black/5 group">
                <img src={formData.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, image: '' })}
                  className="absolute top-2 right-2 p-2 bg-brand-white/80 rounded-full hover:bg-brand-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <ImageUpload onUpload={handleImageUpload} folder="works" />
            )}
          </div>

          <div>
            <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">DESCRIPTION</label>
            <textarea 
              rows={5}
              className="w-full bg-transparent border border-brand-black/10 p-4 focus:outline-none focus:border-brand-black transition-colors" 
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-4">
            <input 
              type="checkbox" 
              id="active"
              checked={!!formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            />
            <label htmlFor="active" className="text-[10px] tracking-widest text-brand-gray uppercase">PUBLISHED</label>
          </div>
        </div>

        <div className="pt-12">
          <button type="submit" disabled={loading} className="btn-primary w-full tracking-[0.3em] text-xs">
            {loading ? 'SAVING...' : 'SAVE WORK ITEM'}
          </button>
        </div>
      </form>
    </div>
  );
}
