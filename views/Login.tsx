import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { LogIn, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';

const Login: React.FC = () => {
  const { login, showToast } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      const success = login(email, password);
      setIsLoading(false);
      if (success) {
        const user = JSON.parse(localStorage.getItem('kinegest_session') || '{}');
        if (user.role === 'Patient') {
          navigate('/');
        } else if (user.role === 'Thérapeute' || user.role === 'Secrétaire') {
          navigate('/agenda');
        } else {
          navigate('/');
        }
      }
    }, 800);
  };

  const handleForgotPassword = () => {
    if (!email) {
      showToast("Veuillez saisir votre email d'abord");
      return;
    }
    showToast(`Un email de récupération a été envoyé à ${email}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl mb-4">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">KinéGest Pro</h1>
          <p className="text-slate-500">Connectez-vous à votre espace de gestion</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mot de passe</label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors"
                >
                  Oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-sky-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-sky-100 hover:bg-sky-700 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={20} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
              <span className="bg-white px-4 text-slate-400">Ou</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-500 text-sm">
              Nouveau patient ?{' '}
              <Link to="/register" className="text-sky-600 font-bold hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
          <p className="text-[10px] font-bold text-sky-800 uppercase tracking-widest mb-2 text-center">Comptes Démo</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setEmail('reforme3334@gmail.com'); setPassword('admin'); }} className="text-[10px] bg-white p-2 rounded-lg border border-sky-200 hover:bg-sky-100 transition-colors text-left">
              <span className="font-bold block">Admin</span>
              reforme3334@gmail.com
            </button>
            <button onClick={() => { setEmail('therapeute@kinegest.com'); setPassword('password'); }} className="text-[10px] bg-white p-2 rounded-lg border border-sky-200 hover:bg-sky-100 transition-colors text-left">
              <span className="font-bold block">Thérapeute</span>
              therapeute@kinegest.com
            </button>
            <button onClick={() => { setEmail('alice.dubois@mail.com'); setPassword('password'); }} className="text-[10px] bg-white p-2 rounded-lg border border-sky-200 hover:bg-sky-100 transition-colors text-left">
              <span className="font-bold block">Patient</span>
              alice.dubois@mail.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
