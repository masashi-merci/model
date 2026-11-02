import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Mail, Lock } from 'lucide-react';

export default function AdminLogin({ checking = false, authError = null }: { checking?: boolean; authError?: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || checking) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // App's shared auth subscriber verifies the session and redirects only on success.
    } catch {
      setError('Sign-in or administrator permission could not be verified. Please contact the site owner.');
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-brand-white px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif tracking-widest mb-4">ADMIN ACCESS</h1>
          <p className="text-brand-gray text-xs tracking-[0.3em] uppercase">Merci Talent Agency. MANAGEMENT</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-8">
          {(error || authError) && (
            <div className="p-4 bg-red-50 text-red-500 text-[10px] tracking-widest text-center">
              {error || authError}
            </div>
          )}

          <div className="space-y-6">
            <div className="relative">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={14} />
                <input
                  type="email"
                  required
                  className="input-field pl-12"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] tracking-widest text-brand-gray uppercase mb-2 block">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gray" size={14} />
                <input
                  type="password"
                  required
                  className="input-field pl-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || checking}
            className="btn-primary w-full flex items-center justify-center space-x-4 disabled:opacity-50 py-4"
          >
            {loading || checking ? (
              <div className="w-5 h-5 border-2 border-brand-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="tracking-[0.3em] text-xs">LOGIN</span>
            )}
          </button>
        </form>
        
        <div className="text-center mt-12">
          <p className="text-[10px] tracking-widest text-brand-gray uppercase">
            Restricted area. Unauthorized access is prohibited.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
