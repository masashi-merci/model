import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Model, News, SiteSettings, Work } from '../types';
import { Mail, MapPin, Phone, Send } from 'lucide-react';

export default function Home({ settings: initialSettings }: { settings: SiteSettings | null }) {
  const [models, setModels] = useState<Model[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(initialSettings);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [modelsRes, newsRes, worksRes, settingsRes] = await Promise.all([
        supabase.from('models').select('*').eq('active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('news').select('*').eq('active', true).order('date', { ascending: false }).limit(3),
        supabase.from('works').select('*').eq('active', true).order('date', { ascending: false }).limit(6),
        !initialSettings ? supabase.from('site_settings').select('*').limit(1) : Promise.resolve({ data: [initialSettings] })
      ]);
      
      if (modelsRes.data) {
        setModels(modelsRes.data as Model[]);
      }
      
      if (newsRes.data) {
        setNews(newsRes.data as News[]);
      }

      if (worksRes.data) {
        setWorks(worksRes.data as Work[]);
      }
      
      const settingsData = settingsRes.data;
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0] as SiteSettings);
      }
    };
    fetchData();
  }, [initialSettings]);

  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.hash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'contact',
          data: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      console.error('Error sending email:', err);
      setError(err.message || 'Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { name: 'ARTISTS', slug: 'artists', image: settings?.artists_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1000' },
    { name: 'EVENT PARTNERS', slug: 'event-partners', image: settings?.event_partners_image || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=1000' },
    { name: 'MODELS', slug: 'models', image: settings?.models_image || 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=1000' }
  ];

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center bg-brand-black overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={settings?.hero_image || "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=2000"} 
            alt="Hero" 
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-black/40 via-transparent to-brand-black/60" />
        </div>
        
        <div className="relative z-10 text-center text-brand-white px-6 pt-24">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-6xl md:text-9xl font-serif tracking-[0.1em] mb-8 leading-tight"
          >
            Merci Talent Agency.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-xs md:text-sm tracking-[0.5em] font-light uppercase opacity-80"
          >
            Redefining Elegance & Talent
          </motion.p>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4"
        >
          <span className="text-[10px] tracking-[0.4em] uppercase opacity-40 vertical-text">SCROLL</span>
          <div className="w-px h-12 bg-gradient-to-b from-brand-white/40 to-transparent" />
        </motion.div>
      </section>

      {/* Models Section */}
      <section id="talents" className="py-32 bg-white">
        <div className="container-custom">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-7xl font-serif tracking-widest mb-6 uppercase">Talent</h2>
            <div className="w-24 h-px bg-brand-black mx-auto opacity-20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {categories.map((cat, index) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="group relative aspect-[3/4] overflow-hidden bg-brand-black/5"
              >
                <Link to={`/models/${cat.slug}`}>
                  <img 
                    src={cat.image} 
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-brand-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    <h3 className="text-brand-white text-2xl font-serif tracking-[0.3em] uppercase">{cat.name}</h3>
                  </div>
                  <div className="absolute bottom-8 left-0 w-full text-center md:group-hover:opacity-0 transition-opacity duration-500">
                    <h3 className="text-brand-white text-xl font-serif tracking-[0.3em] uppercase drop-shadow-lg">{cat.name}</h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Works Section */}
      <section id="works" className="py-32 bg-[#F9F8F6]">
        <div className="container-custom">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl md:text-6xl font-serif tracking-widest uppercase">Works</h2>
              <p className="text-brand-gray tracking-[0.2em] text-xs uppercase mt-4">Our achievements and projects</p>
            </div>
            <Link to="/works" className="text-xs tracking-[0.2em] border-b border-brand-black pb-1 hover:text-brand-gray hover:border-brand-gray transition-all">
              VIEW ALL WORKS
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {works.map((work, index) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Link to="/works">
                  <div className="aspect-video overflow-hidden bg-brand-black/5 mb-6">
                    <img 
                      src={work.image || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80"} 
                      alt={work.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] tracking-widest text-brand-gray uppercase">{work.category}</p>
                    {work.date && (
                      <p className="text-[10px] tracking-widest text-brand-gray/60 uppercase">
                        {new Date(work.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' }).replace(/\//g, '.')}
                      </p>
                    )}
                  </div>
                  <h3 className="text-xl font-serif tracking-widest group-hover:text-brand-gray transition-colors">{work.title}</h3>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-32 bg-white">
        <div className="container-custom">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-7xl font-serif tracking-widest mb-6 uppercase">Services</h2>
            <p className="text-brand-gray tracking-[0.3em] text-xs uppercase">Professional Casting & Production</p>
            <div className="w-24 h-px bg-brand-black mx-auto opacity-20 mt-8" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-32">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-serif tracking-widest uppercase">Model Casting</h3>
              <p className="text-brand-gray text-sm leading-relaxed">
                ファッションショー、広告、カタログ、雑誌など、プロジェクトのコンセプトに最適なモデルをご提案します。国内外のネットワークを活かしたキャスティングが可能です。
              </p>
              <p className="text-xs tracking-widest font-bold">STARTING FROM ¥50,000〜</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-serif tracking-widest uppercase">Event Staffing</h3>
              <p className="text-brand-gray text-sm leading-relaxed">
                展示会、プロモーションイベント、プライベートパーティーなど、華やかさとプロフェッショナリズムを兼ね備えたイベントスタッフ・コンパニオンを派遣します。
              </p>
              <p className="text-xs tracking-widest font-bold">STARTING FROM ¥30,000〜</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-serif tracking-widest uppercase">Production</h3>
              <p className="text-brand-gray text-sm leading-relaxed">
                スチール撮影から動画制作まで、クリエイティブディレクション、カメラマン、スタイリスト、ヘアメイクの手配を含めたトータルプロデュースを承ります。
              </p>
              <p className="text-xs tracking-widest font-bold">ESTIMATE UPON REQUEST</p>
            </motion.div>
          </div>

          <div className="bg-[#F9F8F6] p-12 md:p-20 rounded-2xl">
            <h3 className="text-3xl font-serif tracking-widest uppercase mb-16 text-center">How to Order</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              {[
                { step: '01', title: 'Inquiry', desc: 'フォームまたはお電話にて、プロジェクトの詳細をお知らせください。' },
                { step: '02', title: 'Proposal', desc: 'ご要望に基づき、最適なタレントの選定と御見積書をご提示します。' },
                { step: '03', title: 'Booking', desc: 'タレントを決定いただき、スケジュール確定と契約の手続きを行います。' },
                { step: '04', title: 'Execution', desc: '当日、プロフェッショナルなタレントが現場にて業務を遂行します。' }
              ].map((item, idx) => (
                <div key={idx} className="relative">
                  <span className="text-6xl font-serif opacity-10 absolute -top-8 -left-4">{item.step}</span>
                  <h4 className="text-lg font-serif tracking-widest uppercase mb-4 relative z-10">{item.title}</h4>
                  <p className="text-brand-gray text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section id="news" className="py-32 bg-[#F2F2F2]">
        <div className="container-custom">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl md:text-6xl font-serif tracking-widest uppercase">News</h2>
              <p className="text-brand-gray tracking-[0.2em] text-xs uppercase mt-4">Latest updates from the agency</p>
            </div>
            <Link to="/news" className="text-xs tracking-[0.2em] border-b border-brand-black pb-1 hover:text-brand-gray hover:border-brand-gray transition-all">
              VIEW ALL NEWS
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {news.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Link to="/news">
                  <div className="aspect-video overflow-hidden bg-brand-black/5 mb-6">
                    <img 
                      src={item.image || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80"} 
                      alt={item.title}
                      className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${item.isGrayscale ? 'grayscale' : ''}`}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-[10px] tracking-widest text-brand-gray uppercase mb-2">
                    {item.date ? new Date(item.date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.') : ''}
                  </p>
                  <h3 className="text-xl font-serif tracking-widest group-hover:text-brand-gray transition-colors">{item.title}</h3>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-square overflow-hidden bg-brand-black/5"
            >
              <img 
                src={settings?.about_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1000"} 
                alt="About" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-serif mb-8 leading-tight uppercase tracking-widest">About</h2>
              <p className="text-brand-gray leading-relaxed mb-12 text-lg">
                Merci Talent Agency. is more than just an agency; it's a creative hub where talent meets opportunity. 
                We believe in the power of unique beauty and professional excellence. Our mission is 
                to represent the next generation of icons in the fashion and commercial world.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 bg-[#EBEAE8]">
        <div className="container-custom">
          <div className="mb-24 text-center">
            <h2 className="text-5xl md:text-7xl font-serif tracking-widest mb-6 uppercase">Contact</h2>
            <p className="text-brand-gray tracking-[0.3em] text-xs uppercase">Get in touch with Merci Talent Agency.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
            {/* Contact Info */}
            <div className="space-y-12">
              <div className="space-y-6">
                <h3 className="text-3xl font-serif tracking-widest">LET'S CONNECT</h3>
                <p className="text-brand-gray leading-relaxed">
                  Whether you're looking for representation, interested in booking our talent, or have any other inquiries, we're here to help.
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex items-start space-x-6">
                  <div className="p-3 bg-brand-black/10 rounded-full">
                    <MapPin size={20} className="text-brand-black" />
                  </div>
                  <div>
                    <h4 className="text-[10px] tracking-widest text-brand-gray uppercase mb-1">ADDRESS</h4>
                    <p className="text-brand-black font-medium">{settings?.address || "123 Fashion Ave, Shibuya, Tokyo, Japan"}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className="p-3 bg-brand-black/10 rounded-full">
                    <Phone size={20} className="text-brand-black" />
                  </div>
                  <div>
                    <h4 className="text-[10px] tracking-widest text-brand-gray uppercase mb-1">PHONE</h4>
                    <p className="text-brand-black font-medium">{settings?.phone || "+81 03-1234-5678"}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className="p-3 bg-brand-black/10 rounded-full">
                    <Mail size={20} className="text-brand-black" />
                  </div>
                  <div>
                    <h4 className="text-[10px] tracking-widest text-brand-gray uppercase mb-1">EMAIL</h4>
                    <p className="text-brand-black font-medium">{settings?.email || "info@merci-talent.com"}</p>
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <div className="aspect-video bg-brand-black/5 overflow-hidden rounded-lg">
                <iframe 
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(settings?.address || "123 Fashion Ave, Shibuya, Tokyo, Japan")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white p-12 rounded-lg shadow-sm">
              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-brand-black text-brand-white rounded-full flex items-center justify-center">
                    <Send size={32} />
                  </div>
                  <h3 className="text-2xl font-serif tracking-widest">THANK YOU</h3>
                  <p className="text-brand-gray">Your message has been sent. We'll get back to you shortly.</p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="text-[10px] tracking-[0.3em] font-bold uppercase border-b border-brand-black pb-1"
                  >
                    SEND ANOTHER MESSAGE
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] tracking-widest text-brand-gray uppercase block">NAME</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] tracking-widest text-brand-gray uppercase block">EMAIL</label>
                    <input 
                      type="email" 
                      required
                      className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] tracking-widest text-brand-gray uppercase block">SUBJECT</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-transparent border-b border-brand-black/20 py-3 focus:outline-none focus:border-brand-black transition-colors" 
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] tracking-widest text-brand-gray uppercase block">MESSAGE</label>
                    <textarea 
                      required
                      rows={5}
                      className="w-full bg-transparent border border-brand-black/20 p-4 focus:outline-none focus:border-brand-black transition-colors" 
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-[10px] tracking-widest uppercase">{error}</p>
                  )}
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="btn-primary w-full tracking-[0.3em] text-xs flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'SEND MESSAGE'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
