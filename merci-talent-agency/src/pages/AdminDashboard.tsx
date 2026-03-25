import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Model, News, SiteSettings, Work } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, LogOut, LayoutDashboard, Users, Newspaper, Settings, Save, Check, Briefcase, ArrowLeft } from 'lucide-react';
import Modal from '../components/Modal';
import ImageUpload from '../components/ImageUpload';

import { MODEL_ROLES } from '../constants';

export default function AdminDashboard() {
  const [models, setModels] = useState<Model[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'models' | 'news' | 'works' | 'settings'>('models');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; type: 'model' | 'news' | 'work' }>({
    isOpen: false,
    id: '',
    type: 'model'
  });
  const navigate = useNavigate();

  const filteredModels = models.filter(m => {
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    const matchesRole = roleFilter === 'all' || m.tags?.includes(roleFilter);
    return matchesCategory && matchesRole;
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modelsRes, newsRes, worksRes, settingsRes] = await Promise.all([
        supabase.from('models').select('*').order('created_at', { ascending: false }),
        supabase.from('news').select('*').order('date', { ascending: false }),
        supabase.from('works').select('*').order('date', { ascending: false }),
        supabase.from('site_settings').select('*').limit(1)
      ]);

      if (modelsRes.error) throw modelsRes.error;
      if (newsRes.error) throw newsRes.error;
      if (worksRes.error) throw worksRes.error;
      
      setModels(modelsRes.data as Model[]);
      setNews(newsRes.data as News[]);
      setWorks(worksRes.data as Work[]);
      
      const settingsData = settingsRes.data;
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0] as SiteSettings);
      } else if (settingsRes.error && settingsRes.error.code === 'PGRST116') {
        // No settings found
        console.log("No settings found");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteConfirm = async () => {
    const { id, type } = deleteModal;
    if (!id) return;

    try {
      let tableName = '';
      if (type === 'model') tableName = 'models';
      else if (type === 'news') tableName = 'news';
      else if (type === 'work') tableName = 'works';

      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      
      if (type === 'model') {
        setModels(models.filter(m => m.id !== id));
      } else if (type === 'news') {
        setNews(news.filter(n => n.id !== id));
      } else if (type === 'work') {
        setWorks(works.filter(w => w.id !== id));
      }
      setDeleteModal({ ...deleteModal, isOpen: false });
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("削除に失敗しました。権限を確認してください。");
    }
  };

  const openDeleteModal = (id: string, type: 'model' | 'news' | 'work') => {
    setDeleteModal({ isOpen: true, id, type });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          ...settings,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      const errorMessage = error.message || error.details || 'Unknown error occurred';
      alert(`設定の保存に失敗しました: ${errorMessage}\n\nデータベースのスキーマが最新か確認してください。`);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="pt-32 pb-32 container-custom">
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        title="CONFIRM DELETE"
        message={`Are you sure you want to delete this ${deleteModal.type}? This action cannot be undone.`}
        confirmText="DELETE"
        variant="danger"
      />

      <div className="flex flex-col md:flex-row justify-between items-end mb-16 space-y-8 md:space-y-0">
        <div>
          <h1 className="text-5xl font-serif tracking-widest mb-4">DASHBOARD</h1>
          <p className="text-brand-gray tracking-[0.3em] text-xs uppercase">Management Panel</p>
        </div>
        <div className="flex items-center space-x-8">
          <Link 
            to="/"
            className="flex items-center text-xs tracking-widest text-brand-gray hover:text-brand-black transition-colors"
          >
            <ArrowLeft size={14} className="mr-2" /> BACK TO SITE
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center text-xs tracking-widest text-brand-gray hover:text-brand-black transition-colors"
          >
            <LogOut size={14} className="mr-2" /> LOGOUT
          </button>
        </div>
      </div>

      <div className="flex space-x-12 border-b border-brand-black/10 mb-12">
        <button 
          onClick={() => setActiveTab('models')}
          className={`pb-4 text-xs tracking-widest transition-all ${activeTab === 'models' ? 'border-b-2 border-brand-black font-bold' : 'text-brand-gray'}`}
        >
          TALENT ({models.length})
        </button>
        <button 
          onClick={() => setActiveTab('works')}
          className={`pb-4 text-xs tracking-widest transition-all ${activeTab === 'works' ? 'border-b-2 border-brand-black font-bold' : 'text-brand-gray'}`}
        >
          WORKS ({works.length})
        </button>
        <button 
          onClick={() => setActiveTab('news')}
          className={`pb-4 text-xs tracking-widest transition-all ${activeTab === 'news' ? 'border-b-2 border-brand-black font-bold' : 'text-brand-gray'}`}
        >
          NEWS ({news.length})
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-4 text-xs tracking-widest transition-all ${activeTab === 'settings' ? 'border-b-2 border-brand-black font-bold' : 'text-brand-gray'}`}
        >
          SITE SETTINGS
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-2 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] tracking-widest uppercase text-brand-gray">Loading data...</p>
        </div>
      ) : activeTab === 'models' ? (
        <div>
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-4">
                <label className="text-[10px] tracking-widest text-brand-gray uppercase">Category:</label>
                <select 
                  className="text-[10px] tracking-widest uppercase border-b border-brand-black/20 focus:outline-none focus:border-brand-black bg-transparent py-1"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    if (e.target.value !== 'event-partners') setRoleFilter('all');
                  }}
                >
                  <option value="all">ALL CATEGORIES</option>
                  <option value="artists">ARTISTS</option>
                  <option value="event-partners">EVENT PARTNERS</option>
                  <option value="models">MODELS</option>
                  <option value="commercial">COMMERCIAL</option>
                </select>
              </div>

              {categoryFilter === 'event-partners' && (
                <div className="flex items-center space-x-4">
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase">Role:</label>
                  <select 
                    className="text-[10px] tracking-widest uppercase border-b border-brand-black/20 focus:outline-none focus:border-brand-black bg-transparent py-1"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">ALL ROLES</option>
                    {MODEL_ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <Link to="/admin/models/new" className="btn-primary flex items-center text-xs tracking-widest">
              <Plus size={14} className="mr-2" /> ADD NEW TALENT
            </Link>
          </div>
          
          <div className="bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-black/5 text-[10px] tracking-widest text-brand-gray uppercase">
                <tr>
                  <th className="px-6 py-4">TALENT</th>
                  <th className="px-6 py-4">CATEGORY</th>
                  <th className="px-6 py-4">ROLES</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-black/5">
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-brand-gray italic">No models found for this filter.</td>
                  </tr>
                ) : filteredModels.map(model => (
                  <tr key={model.id} className="hover:bg-brand-black/5 transition-colors">
                    <td className="px-6 py-4 flex items-center space-x-4">
                      <img src={model.mainImage} className="w-12 h-16 object-cover" referrerPolicy="no-referrer" />
                      <span className="font-serif text-lg">{model.name}</span>
                    </td>
                    <td className="px-6 py-4 text-xs tracking-widest uppercase text-brand-gray">{model.category.replace('-', ' ')}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {model.tags?.filter(t => MODEL_ROLES.includes(t)).map(role => (
                          <span key={role} className="text-[8px] tracking-tighter border border-brand-black/10 px-1 py-0.5 uppercase text-brand-gray">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] tracking-widest uppercase px-2 py-1 ${model.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {model.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-4">
                      <Link to={`/admin/models/edit/${model.id}`} className="inline-block text-brand-gray hover:text-brand-black transition-colors">
                        <Edit size={16} />
                      </Link>
                      <button onClick={() => openDeleteModal(model.id, 'model')} className="text-brand-gray hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'works' ? (
        <div>
          <div className="flex justify-end mb-8">
            <Link to="/admin/works/new" className="btn-primary flex items-center text-xs tracking-widest">
              <Plus size={14} className="mr-2" /> ADD WORK ITEM
            </Link>
          </div>
          
          <div className="bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-black/5 text-[10px] tracking-widest text-brand-gray uppercase">
                <tr>
                  <th className="px-6 py-4">WORK</th>
                  <th className="px-6 py-4">CATEGORY</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-black/5">
                {works.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-brand-gray italic">No work items found.</td>
                  </tr>
                ) : works.map(work => (
                  <tr key={work.id} className="hover:bg-brand-black/5 transition-colors">
                    <td className="px-6 py-4 flex items-center space-x-4">
                      <img src={work.image} className="w-12 h-12 object-cover" referrerPolicy="no-referrer" />
                      <span className="font-serif text-lg">{work.title}</span>
                    </td>
                    <td className="px-6 py-4 text-xs tracking-widest uppercase text-brand-gray">{work.category}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] tracking-widest uppercase px-2 py-1 ${work.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {work.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-4">
                      <Link to={`/admin/works/edit/${work.id}`} className="inline-block text-brand-gray hover:text-brand-black transition-colors">
                        <Edit size={16} />
                      </Link>
                      <button onClick={() => openDeleteModal(work.id, 'work')} className="text-brand-gray hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'news' ? (
        <div>
          <div className="flex justify-end mb-8">
            <Link to="/admin/news/new" className="btn-primary flex items-center text-xs tracking-widest">
              <Plus size={14} className="mr-2" /> ADD NEWS ITEM
            </Link>
          </div>
          
          <div className="bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-black/5 text-[10px] tracking-widest text-brand-gray uppercase">
                <tr>
                  <th className="px-6 py-4">TITLE</th>
                  <th className="px-6 py-4">DATE</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-black/5">
                {news.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-brand-gray italic">No news items found.</td>
                  </tr>
                ) : news.map(item => (
                  <tr key={item.id} className="hover:bg-brand-black/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-serif text-lg">{item.title}</span>
                    </td>
                    <td className="px-6 py-4 text-xs tracking-widest uppercase text-brand-gray">
                      {item.date ? format(new Date(item.date), 'yyyy.MM.dd') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] tracking-widest uppercase px-2 py-1 ${item.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-4">
                      <Link to={`/admin/news/edit/${item.id}`} className="inline-block text-brand-gray hover:text-brand-black transition-colors">
                        <Edit size={16} />
                      </Link>
                      <button onClick={() => openDeleteModal(item.id, 'news')} className="text-brand-gray hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-2xl font-serif tracking-widest uppercase">General Settings</h2>
            <button 
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className={`btn-primary flex items-center text-xs tracking-widest ${saveSuccess ? 'bg-green-600 border-green-600' : ''}`}
            >
              {savingSettings ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : saveSuccess ? (
                <Check size={14} className="mr-2" />
              ) : (
                <Save size={14} className="mr-2" />
              )}
              {saveSuccess ? 'SAVED' : 'SAVE SETTINGS'}
            </button>
          </div>

          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Home Hero Section</h3>
              <div className="grid grid-cols-1 gap-8">
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-4">Hero Background Image</label>
                  {settings?.hero_image && (
                    <div className="mb-4 relative aspect-video overflow-hidden bg-brand-black/5">
                      <img src={settings.hero_image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <ImageUpload 
                    onUpload={(url) => setSettings(prev => prev ? { ...prev, hero_image: url } : { id: 'default', hero_image: url, about_image: '', updated_at: '' })} 
                    label="Change Hero Image"
                    folder="settings"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">About Section</h3>
              <div className="grid grid-cols-1 gap-8">
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-4">About Image (The Person)</label>
                  {settings?.about_image && (
                    <div className="mb-4 relative aspect-square max-w-md overflow-hidden bg-brand-black/5">
                      <img src={settings.about_image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <ImageUpload 
                    onUpload={(url) => setSettings(prev => prev ? { ...prev, about_image: url } : { id: 'default', hero_image: '', about_image: url, updated_at: '' })} 
                    label="Change About Image"
                    folder="settings"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Talent Category Images</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-4">Artists Category Image</label>
                  {settings?.artists_image && (
                    <div className="mb-4 relative aspect-[3/4] overflow-hidden bg-brand-black/5">
                      <img src={settings.artists_image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <ImageUpload 
                    onUpload={(url) => setSettings(prev => prev ? { ...prev, artists_image: url } : { id: 'default', hero_image: '', about_image: '', artists_image: url, updated_at: '' })} 
                    label="Change Artists Image"
                    folder="settings"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-4">Event Partners Image</label>
                  {settings?.event_partners_image && (
                    <div className="mb-4 relative aspect-[3/4] overflow-hidden bg-brand-black/5">
                      <img src={settings.event_partners_image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <ImageUpload 
                    onUpload={(url) => setSettings(prev => prev ? { ...prev, event_partners_image: url } : { id: 'default', hero_image: '', about_image: '', event_partners_image: url, updated_at: '' })} 
                    label="Change Event Partners Image"
                    folder="settings"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-4">Models Category Image</label>
                  {settings?.models_image && (
                    <div className="mb-4 relative aspect-[3/4] overflow-hidden bg-brand-black/5">
                      <img src={settings.models_image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <ImageUpload 
                    onUpload={(url) => setSettings(prev => prev ? { ...prev, models_image: url } : { id: 'default', hero_image: '', about_image: '', models_image: url, updated_at: '' })} 
                    label="Change Models Image"
                    folder="settings"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Address</label>
                  <input 
                    type="text"
                    className="input-field"
                    value={settings?.address || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, address: e.target.value } : { id: 'default', hero_image: '', about_image: '', address: e.target.value, updated_at: '' })}
                    placeholder="123 Fashion Ave, Tokyo, Japan"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Phone</label>
                  <input 
                    type="text"
                    className="input-field"
                    value={settings?.phone || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, phone: e.target.value } : { id: 'default', hero_image: '', about_image: '', phone: e.target.value, updated_at: '' })}
                    placeholder="+81 3 1234 5678"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Display Email (Public)</label>
                  <input 
                    type="email"
                    className="input-field"
                    value={settings?.email || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, email: e.target.value } : { id: 'default', hero_image: '', about_image: '', email: e.target.value, updated_at: '' })}
                    placeholder="contact@merci-talent.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Recipient Email (Admin - For Contact/Booking)</label>
                  <input 
                    type="email"
                    className="input-field"
                    value={settings?.contact_email || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, contact_email: e.target.value } : { id: 'default', hero_image: '', about_image: '', contact_email: e.target.value, updated_at: '' })}
                    placeholder="masashi@milz.tech"
                  />
                  <p className="text-[8px] text-brand-gray mt-1 uppercase tracking-tighter">This is where all form submissions will be sent.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Social Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Instagram URL</label>
                  <input 
                    type="text"
                    className="input-field"
                    value={settings?.instagram_url || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, instagram_url: e.target.value } : { id: 'default', hero_image: '', about_image: '', instagram_url: e.target.value, updated_at: '' })}
                    placeholder="https://instagram.com/merci_talent"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">X URL</label>
                  <input 
                    type="text"
                    className="input-field"
                    value={settings?.x_url || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, x_url: e.target.value } : { id: 'default', hero_image: '', about_image: '', x_url: e.target.value, updated_at: '' })}
                    placeholder="https://x.com/merci_talent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for date formatting
function format(date: Date, pattern: string) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return pattern.replace('yyyy', String(y)).replace('MM', m).replace('dd', d);
}
