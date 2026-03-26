import { Link } from 'react-router-dom';
import { SiteSettings } from '../types';

export default function Footer({ settings }: { settings: SiteSettings | null }) {
  return (
    <footer className="bg-brand-black text-brand-white py-24 mt-24">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
          <div className="col-span-1 md:col-span-5">
            <h2 className="text-3xl font-serif tracking-widest mb-8">Merci Talent Agency.</h2>
            <p className="text-brand-gray text-sm leading-relaxed max-w-md">
              A premier modeling agency dedicated to discovering and nurturing exceptional talent. 
              Representing a diverse portfolio of models for fashion, commercial, and editorial projects.
            </p>
          </div>
          
          <div className="md:col-span-3">
            <h3 className="text-xs tracking-[0.2em] font-semibold mb-8 text-brand-gray">NAVIGATION</h3>
            <ul className="space-y-4 text-sm">
              <li><Link to="/#talents" className="hover:text-brand-gray transition-colors">TALENTS</Link></li>
              <li><Link to="/#works" className="hover:text-brand-gray transition-colors">WORKS</Link></li>
              <li><Link to="/#services" className="hover:text-brand-gray transition-colors">SERVICES</Link></li>
              <li><Link to="/#news" className="hover:text-brand-gray transition-colors">NEWS</Link></li>
              <li><Link to="/#about" className="hover:text-brand-gray transition-colors">ABOUT</Link></li>
              <li><Link to="/#contact" className="hover:text-brand-gray transition-colors">CONTACT</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-4">
            <h3 className="text-xs tracking-[0.2em] font-semibold mb-8 text-brand-gray">CONTACT</h3>
            <ul className="space-y-4 text-sm text-brand-gray">
              <li className="whitespace-nowrap">{settings?.address || "123 Fashion Ave, Tokyo, Japan"}</li>
              <li>{settings?.phone || "+81 3 1234 5678"}</li>
              <li>{settings?.email || "contact@merci-talent.com"}</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-24 pt-8 border-t border-brand-white/10 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-[10px] tracking-[0.2em] text-brand-gray">
            © 2026 Merci Talent Agency. ALL RIGHTS RESERVED.
          </p>
          <div className="flex space-x-8 text-[10px] tracking-[0.2em] text-brand-gray">
            <Link to="/admin/login" className="hover:text-brand-white transition-colors">ADMIN LOGIN</Link>
            <a 
              href={settings?.instagram_url ? (settings.instagram_url.startsWith('http') ? settings.instagram_url : `https://instagram.com/${settings.instagram_url.replace('@', '')}`) : "#"} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-brand-white transition-colors"
            >
              INSTAGRAM
            </a>
            <a 
              href={settings?.x_url ? (settings.x_url.startsWith('http') ? settings.x_url : `https://x.com/${settings.x_url.replace('@', '')}`) : "#"} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-brand-white transition-colors"
            >
              X
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
