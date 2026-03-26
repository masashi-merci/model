import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navbar({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'TALENTS', path: '/#talents' },
    { name: 'WORKS', path: '/#works' },
    { name: 'SERVICES', path: '/#services' },
    { name: 'NEWS', path: '/#news' },
    { name: 'ABOUT', path: '/#about' },
    { name: 'CONTACT', path: '/#contact' },
  ];

  const isHome = location.pathname === '/';

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (path.startsWith('/#') && location.pathname === '/') {
      e.preventDefault();
      const id = path.substring(2);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-700",
      scrolled 
        ? "bg-brand-white/95 backdrop-blur-lg py-4 shadow-sm border-b border-brand-black/5" 
        : isHome 
          ? "bg-transparent py-8 border-transparent" 
          : "bg-brand-white py-6 border-b border-brand-black/5"
    )}>
      <div className="container-custom flex items-center justify-between">
        <Link 
          to="/" 
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className={cn(
            "text-xl md:text-2xl font-serif tracking-widest font-bold transition-colors duration-500",
            !scrolled && isHome ? "text-brand-white" : "text-brand-black"
          )}
        >
          Merci Talent Agency.
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-12">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path}
              onClick={(e) => handleNavClick(e, link.path)}
              className={cn(
                "text-[10px] tracking-[0.3em] font-medium transition-colors duration-500 hover:text-brand-gray",
                !scrolled && isHome ? "text-brand-white" : "text-brand-black"
              )}
            >
              {link.name}
            </Link>
          ))}
          {user && (
            <Link 
              to="/admin/dashboard" 
              className={cn(
                "p-2 rounded-full transition-colors duration-500",
                !scrolled && isHome ? "text-brand-white hover:bg-brand-white/10" : "text-brand-black hover:bg-brand-black/5"
              )}
            >
              <User size={18} />
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className={cn(
            "md:hidden p-2 transition-colors duration-500",
            !scrolled && isHome ? "text-brand-white" : "text-brand-black"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-brand-white border-t border-brand-black/5 md:hidden"
          >
            <div className="flex flex-col p-8 space-y-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  to={link.path}
                  onClick={(e) => {
                    handleNavClick(e, link.path);
                    setIsOpen(false);
                  }}
                  className="text-lg font-serif tracking-widest"
                >
                  {link.name}
                </Link>
              ))}
              {user && (
                <Link to="/admin/dashboard" className="text-lg font-serif tracking-widest text-brand-gray">
                  ADMIN DASHBOARD
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
