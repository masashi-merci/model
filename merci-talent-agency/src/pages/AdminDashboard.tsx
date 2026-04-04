import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Model, News, Order, OrderStatus, SiteSettings, Work } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, LogOut, LayoutDashboard, Users, Newspaper, Settings, Save, Check, Briefcase, ArrowLeft, GripVertical, Eye, X } from 'lucide-react';
import Modal from '../components/Modal';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import ImageUpload from '../components/ImageUpload';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { MODEL_ROLES } from '../constants';

interface SortableRowProps {
  model: Model;
  index: number;
  onDelete: (id: string) => void;
  onOrderChange: (id: string, newOrder: number) => void;
}

function SortableRow({ model, index, onDelete, onOrderChange }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={`hover:bg-brand-black/5 transition-colors ${isDragging ? 'bg-brand-black/5 shadow-inner' : ''}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <button 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-brand-black/10 rounded text-brand-gray"
          >
            <GripVertical size={16} />
          </button>
          <input 
            type="number"
            value={model.sort_order || 0}
            onChange={(e) => onOrderChange(model.id, parseInt(e.target.value) || 0)}
            className="w-12 text-[10px] border border-brand-black/10 rounded px-1 py-0.5 focus:outline-none focus:border-brand-black bg-transparent"
          />
        </div>
      </td>
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
        <button onClick={() => onDelete(model.id)} className="text-brand-gray hover:text-red-500 transition-colors">
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}

export default function AdminDashboard() {
  const [models, setModels] = useState<Model[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'models' | 'news' | 'works' | 'orders' | 'settings'>('models');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = models.findIndex((m) => m.id === active.id);
      const newIndex = models.findIndex((m) => m.id === over.id);

      const newModels = arrayMove(models, oldIndex, newIndex);
      
      // Update local state immediately for smooth UI
      setModels(newModels);

      // Update database
      try {
        // Use individual updates to avoid "null value" constraint errors with upsert
        const updatePromises = newModels.map((m, idx) => 
          supabase
            .from('models')
            .update({ sort_order: idx + 1 })
            .eq('id', m.id)
        );

        const results = await Promise.all(updatePromises);
        const firstError = results.find(r => r.error)?.error;
        if (firstError) throw firstError;
      } catch (error) {
        console.error("Error updating sort order:", error);
        alert("順番の保存に失敗しました。");
        fetchData(); // Revert to server state
      }
    }
  };

  const handleOrderChange = async (id: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('models')
        .update({ sort_order: newOrder })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setModels(prev => {
        const updated = prev.map(m => m.id === id ? { ...m, sort_order: newOrder } : m);
        return [...updated].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });
    } catch (error) {
      console.error("Error updating order:", error);
      alert("順番の更新に失敗しました。");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelsRes, newsRes, worksRes, settingsRes, ordersRes] = await Promise.all([
        supabase.from('models').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('news').select('*').order('date', { ascending: false }),
        supabase.from('works').select('*').order('date', { ascending: false }),
        supabase.from('site_settings').select('*').limit(1),
        supabase.from('orders').select('*').order('created_at', { ascending: false })
      ]);

      const errors = [];
      if (modelsRes.error) errors.push(`Models: ${modelsRes.error.message}`);
      if (newsRes.error) errors.push(`News: ${newsRes.error.message}`);
      if (worksRes.error) errors.push(`Works: ${worksRes.error.message}`);
      if (ordersRes.error) errors.push(`Orders: ${ordersRes.error.message}`);
      if (settingsRes.error && settingsRes.error.code !== 'PGRST116') errors.push(`Settings: ${settingsRes.error.message}`);

      if (errors.length > 0) {
        setError(errors.join(' | '));
      }
      
      setModels(modelsRes.data as Model[] || []);
      setNews(newsRes.data as News[] || []);
      setWorks(worksRes.data as Work[] || []);
      setOrders(ordersRes.data as Order[] || []);
      
      const settingsData = settingsRes.data;
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0] as SiteSettings);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "An unexpected error occurred while fetching data.");
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

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("ステータスの更新に失敗しました。");
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'アサイン前';
      case 'assigned': return 'アサイン完了';
      case 'completed': return 'イベント完了';
      case 'cancelled': return 'イベントキャンセル';
      default: return status;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
      
      if (error) {
        console.error('Supabase error updating settings:', error);
        throw error;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      const errorMessage = error.message || error.details || 'Unknown error occurred';
      alert(`設定の保存に失敗しました: ${errorMessage}\n\n"column does not exist" というエラーが出る場合は、データベースのスキーマ（event_partners_image列など）が最新か確認してください。`);
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
          onClick={() => setActiveTab('orders')}
          className={`pb-4 text-xs tracking-widest transition-all ${activeTab === 'orders' ? 'border-b-2 border-brand-black font-bold' : 'text-brand-gray'}`}
        >
          ORDERS ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-4 text-xs tracking-widest transition-all ${activeTab === 'settings' ? 'border-b-2 border-brand-black font-bold' : 'text-brand-gray'}`}
        >
          SITE SETTINGS
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 text-xs tracking-widest uppercase rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchData()} className="underline hover:no-underline">Retry</button>
        </div>
      )}

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
                  <option value="animals">ANIMALS</option>
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
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full text-left text-sm">
                <thead className="bg-brand-black/5 text-[10px] tracking-widest text-brand-gray uppercase">
                  <tr>
                    <th className="px-6 py-4">ORDER</th>
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
                      <td colSpan={6} className="px-6 py-12 text-center text-brand-gray italic">No models found for this filter.</td>
                    </tr>
                  ) : (
                    <SortableContext 
                      items={filteredModels.map(m => m.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredModels.map((model, index) => (
                        <SortableRow 
                          key={model.id} 
                          model={model} 
                          index={index} 
                          onDelete={() => openDeleteModal(model.id, 'model')}
                          onOrderChange={handleOrderChange}
                        />
                      ))}
                    </SortableContext>
                  )}
                </tbody>
              </table>
            </DndContext>
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
      ) : activeTab === 'orders' ? (
        <div>
          <div className="bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-black/5 text-[10px] tracking-widest text-brand-gray uppercase">
                <tr>
                  <th className="px-6 py-4">CLIENT</th>
                  <th className="px-6 py-4">ORDER DATE</th>
                  <th className="px-6 py-4">EVENT DATE</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-black/5">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-brand-gray italic">No orders found.</td>
                  </tr>
                ) : orders.map(order => (
                  <tr key={order.id} className="hover:bg-brand-black/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-serif text-lg">{order.company_name}</div>
                      <div className="text-[10px] text-brand-gray">{order.contact_person}</div>
                    </td>
                    <td className="px-6 py-4 text-xs tracking-widest uppercase text-brand-gray">
                      {format(new Date(order.created_at), 'yyyy.MM.dd')}
                    </td>
                    <td className="px-6 py-4 text-xs tracking-widest uppercase text-brand-gray">
                      {order.main_event_date ? order.main_event_date.replace(/-/g, '.') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className={`text-[10px] tracking-widest uppercase px-2 py-1 rounded border-none focus:ring-0 cursor-pointer ${getStatusColor(order.status)}`}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      >
                        <option value="pending">アサイン前</option>
                        <option value="assigned">アサイン完了</option>
                        <option value="completed">イベント完了</option>
                        <option value="cancelled">イベントキャンセル</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-brand-gray hover:text-brand-black transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order Detail Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
              >
                <div className="sticky top-0 bg-white border-b border-brand-black/5 px-8 py-6 flex justify-between items-center z-10">
                  <h2 className="text-2xl font-serif tracking-widest uppercase">Order Details</h2>
                  <button onClick={() => setSelectedOrder(null)} className="text-brand-gray hover:text-brand-black transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-8 space-y-12">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Client Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Company Name</label>
                          <p className="text-sm font-medium">{selectedOrder.company_name}</p>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Contact Person</label>
                          <p className="text-sm font-medium">{selectedOrder.contact_person}</p>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Email</label>
                          <p className="text-sm font-medium">{selectedOrder.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Project Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Project Name</label>
                          <p className="text-sm font-medium">{selectedOrder.project_name || '-'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Deadline</label>
                          <p className="text-sm font-medium">{selectedOrder.deadline || '-'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Status</label>
                          <span className={`text-[10px] tracking-widest uppercase px-2 py-1 rounded ${getStatusColor(selectedOrder.status)}`}>
                            {getStatusLabel(selectedOrder.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Schedule & Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Schedule</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Main Event</label>
                          <p className="text-sm font-medium">
                            {selectedOrder.main_event_date} {selectedOrder.main_event_start_time} 〜 {selectedOrder.main_event_end_time}
                          </p>
                        </div>
                        {selectedOrder.rehearsal === 'yes' && (
                          <div>
                            <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Rehearsal</label>
                            <p className="text-sm font-medium">
                              {selectedOrder.rehearsal_date} {selectedOrder.rehearsal_start_time} 〜 {selectedOrder.rehearsal_end_time}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Location</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Address</label>
                          <p className="text-sm font-medium">
                            〒{selectedOrder.location_postal_code}<br />
                            {selectedOrder.location_prefecture}{selectedOrder.location_city}<br />
                            {selectedOrder.location_address_detail}
                          </p>
                        </div>
                        {selectedOrder.rehearsal_location && (
                          <div>
                            <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Rehearsal Location</label>
                            <p className="text-sm font-medium">{selectedOrder.rehearsal_location}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="space-y-6">
                    <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Job Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Hiring Count</label>
                          <p className="text-sm font-medium">{selectedOrder.hiring_count || '-'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Job Description</label>
                          <p className="text-sm font-medium whitespace-pre-wrap">{selectedOrder.job_description || '-'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Conditions</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedOrder.conditions?.map(c => (
                              <span key={c} className="text-[10px] tracking-widest border border-brand-black/10 px-2 py-1 uppercase">{c}</span>
                            )) || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Selection Method</label>
                          <p className="text-sm font-medium">{selectedOrder.selection_method || '-'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Rate</label>
                          <p className="text-sm font-medium">{selectedOrder.hourly_daily_rate || '-'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Transportation</label>
                          <p className="text-sm font-medium">{selectedOrder.transportation || '-'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Meal Allowance</label>
                          <p className="text-sm font-medium">{selectedOrder.meal_allowance || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Costume */}
                  <div className="space-y-6">
                    <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Costume</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div>
                        <label className="text-[10px] tracking-widest text-brand-gray uppercase block">Costume Provided</label>
                        <p className="text-sm font-medium">{selectedOrder.costume_provided === 'yes' ? 'あり' : 'なし'}</p>
                      </div>
                      {selectedOrder.costume_image_url && (
                        <div>
                          <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-4">Costume Image</label>
                          <div className="aspect-square max-w-xs overflow-hidden bg-brand-black/5">
                            <img src={selectedOrder.costume_image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-brand-black/5 px-8 py-6 flex justify-end z-10">
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="btn-primary px-12 py-3 tracking-[0.3em] text-xs"
                  >
                    CLOSE
                  </button>
                </div>
              </motion.div>
            </div>
          )}
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
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">About Text</label>
                  <textarea 
                    className="input-field min-h-[150px] py-4"
                    value={settings?.about_text || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, about_text: e.target.value } : { id: 'default', hero_image: '', about_image: '', about_text: e.target.value, updated_at: '' })}
                    placeholder="Merci Talent Agency. is more than just an agency..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-2">Services Section</h3>
              <div className="grid grid-cols-1 gap-8">
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Model Casting Description</label>
                  <textarea 
                    className="input-field min-h-[100px] py-4"
                    value={settings?.service_model_casting_text || ''}
                    onChange={(e) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, service_model_casting_text: e.target.value } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        service_model_casting_text: e.target.value, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })}
                    placeholder="ファッションショー、広告、カタログ、雑誌など..."
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Event Staffing Description</label>
                  <textarea 
                    className="input-field min-h-[100px] py-4"
                    value={settings?.service_event_staffing_text || ''}
                    onChange={(e) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, service_event_staffing_text: e.target.value } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        service_event_staffing_text: e.target.value, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })}
                    placeholder="展示会、プロモーションイベント、プライベートパーティーなど..."
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Production Description</label>
                  <textarea 
                    className="input-field min-h-[100px] py-4"
                    value={settings?.service_production_text || ''}
                    onChange={(e) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, service_production_text: e.target.value } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        service_production_text: e.target.value, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })}
                    placeholder="スチール撮影から動画制作まで..."
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
                    onUpload={(url) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, artists_image: url } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        artists_image: url, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })} 
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
                    onUpload={(url) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, event_partners_image: url } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        event_partners_image: url, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })} 
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
                    onUpload={(url) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, models_image: url } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        models_image: url, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })} 
                    label="Change Models Image"
                    folder="settings"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-4">Animals Category Image</label>
                  {settings?.animals_image && (
                    <div className="mb-4 relative aspect-[3/4] overflow-hidden bg-brand-black/5">
                      <img src={settings.animals_image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <ImageUpload 
                    onUpload={(url) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, animals_image: url } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        animals_image: url, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })} 
                    label="Change Animals Image"
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
                    onChange={(e) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, address: e.target.value } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        address: e.target.value, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })}
                    placeholder="123 Fashion Ave, Tokyo, Japan"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Phone</label>
                  <input 
                    type="text"
                    className="input-field"
                    value={settings?.phone || ''}
                    onChange={(e) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, phone: e.target.value } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        phone: e.target.value, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })}
                    placeholder="+81 3 1234 5678"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Display Email (Public)</label>
                  <input 
                    type="email"
                    className="input-field"
                    value={settings?.email || ''}
                    onChange={(e) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, email: e.target.value } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        email: e.target.value, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })}
                    placeholder="contact@merci-talent.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">Recipient Email (Admin - For Contact/Booking)</label>
                  <input 
                    type="email"
                    className="input-field"
                    value={settings?.contact_email || ''}
                    onChange={(e) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, contact_email: e.target.value } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        contact_email: e.target.value, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })}
                    placeholder="info@talentmerci.com"
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
                    onChange={(e) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, instagram_url: e.target.value } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        instagram_url: e.target.value, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })}
                    placeholder="https://instagram.com/merci_talent"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest text-brand-gray uppercase block mb-2">X URL</label>
                  <input 
                    type="text"
                    className="input-field"
                    value={settings?.x_url || ''}
                    onChange={(e) => setSettings(prev => {
                      const newSettings = prev ? { ...prev, x_url: e.target.value } : { 
                        id: 'default', 
                        hero_image: '', 
                        about_image: '', 
                        x_url: e.target.value, 
                        updated_at: new Date().toISOString() 
                      } as SiteSettings;
                      return newSettings;
                    })}
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
/*
function format(date: Date, pattern: string) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return pattern.replace('yyyy', String(y)).replace('MM', m).replace('dd', d);
}
*/
