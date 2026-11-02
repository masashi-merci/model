import ArticleDetail from './pages/ArticleDetail';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from './lib/supabase';
import { connectAdminSession, createAdminSessionStore } from './lib/adminSession';
import AdminGuard from './components/AdminGuard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Order from './pages/Order';
import ModelList from './pages/ModelList';
import ModelDetail from './pages/ModelDetail';
import NewsList from './pages/NewsList';
import WorksList from './pages/WorksList';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminModelForm from './pages/AdminModelForm';
import AdminNewsForm from './pages/AdminNewsForm';
import AdminWorkForm from './pages/AdminWorkForm';
import { SiteSettings } from './types';

export default function App() {
  const [adminSession] = useState(() => createAdminSessionStore());
  const auth = useSyncExternalStore(adminSession.subscribe, adminSession.getSnapshot);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    const disconnect = connectAdminSession(adminSession, supabase.auth);

    // Fetch site settings
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*').limit(1);
      if (!cancelled && data && data.length > 0) {
        setSettings(data[0] as SiteSettings);
      }
    };
    fetchSettings();

    // Real-time listener for site settings
    const settingsChannel = supabase
      .channel('site_settings_changes')
      .on('postgres_changes', { event: '*', table: 'site_settings', schema: 'public' }, (payload) => {
        if (payload.new) {
          setSettings(payload.new as SiteSettings);
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      disconnect();
      supabase.removeChannel(settingsChannel);
    };
  }, [adminSession]);

  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Navbar user={auth.isAdmin ? auth.user : null} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home settings={settings} />} />
            <Route path="/order" element={<Order />} />
            <Route path="/models/:category" element={<ModelList />} />
            <Route path="/model/:slug" element={<ModelDetail />} />
            <Route path="/news" element={<NewsList />} />
            <Route path="/works" element={<WorksList />} />
            <Route path="/news/:id" element={<ArticleDetail kind="news" />} />
            <Route path="/works/:id" element={<ArticleDetail kind="works" />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={auth.isAdmin ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin checking={auth.checking} authError={auth.error} />} />
            <Route path="/admin/dashboard" element={<AdminGuard auth={auth}><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/models/new" element={<AdminGuard auth={auth}><AdminModelForm /></AdminGuard>} />
            <Route path="/admin/models/edit/:id" element={<AdminGuard auth={auth}><AdminModelForm /></AdminGuard>} />
            <Route path="/admin/news/new" element={<AdminGuard auth={auth}><AdminNewsForm /></AdminGuard>} />
            <Route path="/admin/news/edit/:id" element={<AdminGuard auth={auth}><AdminNewsForm /></AdminGuard>} />
            <Route path="/admin/works/new" element={<AdminGuard auth={auth}><AdminWorkForm /></AdminGuard>} />
            <Route path="/admin/works/edit/:id" element={<AdminGuard auth={auth}><AdminWorkForm /></AdminGuard>} />
          </Routes>
        </main>
        <Footer settings={settings} />
      </div>
    </Router>
  );
}
