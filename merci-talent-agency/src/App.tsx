import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Fetch site settings
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*').limit(1);
      if (data && data.length > 0) {
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
      subscription.unsubscribe();
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-white">
        <div className="w-12 h-12 border-2 border-brand-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Navbar user={user} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home settings={settings} />} />
            <Route path="/models/:category" element={<ModelList />} />
            <Route path="/model/:slug" element={<ModelDetail />} />
            <Route path="/news" element={<NewsList />} />
            <Route path="/works" element={<WorksList />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={user ? <Navigate to="/admin/dashboard" /> : <AdminLogin />} />
            <Route path="/admin/dashboard" element={user ? <AdminDashboard /> : <Navigate to="/admin/login" />} />
            <Route path="/admin/models/new" element={user ? <AdminModelForm /> : <Navigate to="/admin/login" />} />
            <Route path="/admin/models/edit/:id" element={user ? <AdminModelForm /> : <Navigate to="/admin/login" />} />
            <Route path="/admin/news/new" element={user ? <AdminNewsForm /> : <Navigate to="/admin/login" />} />
            <Route path="/admin/news/edit/:id" element={user ? <AdminNewsForm /> : <Navigate to="/admin/login" />} />
            <Route path="/admin/works/new" element={user ? <AdminWorkForm /> : <Navigate to="/admin/login" />} />
            <Route path="/admin/works/edit/:id" element={user ? <AdminWorkForm /> : <Navigate to="/admin/login" />} />
          </Routes>
        </main>
        <Footer settings={settings} />
      </div>
    </Router>
  );
}
