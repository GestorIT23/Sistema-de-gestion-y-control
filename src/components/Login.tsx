import React, { useState } from 'react';
import { Shield, KeyRound, AlertTriangle, CheckCircle, RefreshCcw, LogIn } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Usuario } from '../types';

interface Props {
  onLoginSuccess: (user: Usuario) => void;
}

export default function Login({ onLoginSuccess }: Props) {
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess(false);

    const targetEmail = emailInput.trim().toLowerCase();
    if (!targetEmail) {
      setErrorMsg('Por favor ingrese su correo electrónico.');
      return;
    }

    setLoading(true);

    try {
      // Query the database for the active SGI user
      const q = query(collection(db, 'usuarios'), where('email', '==', targetEmail));
      const qSnap = await getDocs(q);

      let foundUser: Usuario | null = null;

      qSnap.forEach((docSnap) => {
        foundUser = { id: docSnap.id, ...docSnap.data() } as Usuario;
      });

      // Special fallback to automatically authorize the master admin if database is empty or offline
      if (!foundUser && targetEmail === 'gestor.it@biotrash.net') {
        foundUser = {
          email: 'gestor.it@biotrash.net',
          nombre: 'Soporte y Sistemas BIOTRASH (Default Admin)',
          rol: 'Administrador'
        };
      }

      if (foundUser) {
        setSuccess(true);
        const loggedUser = foundUser;
        // Small delay for smooth visual feedback
        setTimeout(() => {
          onLoginSuccess(loggedUser);
        }, 1000);
      } else {
        setErrorMsg('Acceso Denegado. Su correo electrónico no se encuentra registrado ni autorizado en el sistema SGI BIOTRASH S.A.');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      // Fallback for demo convenience if offline/network issues occur for standard master admin
      if (targetEmail === 'gestor.it@biotrash.net') {
        setSuccess(true);
        setTimeout(() => {
          onLoginSuccess({
            email: 'gestor.it@biotrash.net',
            nombre: 'Soporte y Sistemas BIOTRASH (Default Admin)',
            rol: 'Administrador'
          });
        }, 800);
      } else {
        setErrorMsg('Error de conexión con el servidor SGI Firebase. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-6 space-y-6">
        
        {/* Logo and Branding Header */}
        <div className="text-center space-y-2 pb-2">
          <div className="inline-flex bg-[#1A1C1E] text-[#3B82F6] p-3 rounded-2xl border border-slate-700 mx-auto shadow-sm">
            <Shield className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-800 uppercase">SGI BIOTRASH S.A.</h1>
            <p className="text-[10px] text-[#3B82F6] font-mono font-bold tracking-widest uppercase">
              Control de Accesos Autorizados
            </p>
          </div>
          <div className="h-px bg-slate-200 w-24 mx-auto"></div>
        </div>

        {/* Dynamic Status Message Banners */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs leading-relaxed flex items-start gap-2.5 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Error de Autenticación:</span>
              <p className="mt-0.5 text-slate-700">{errorMsg}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 p-3 rounded-lg text-xs flex items-center gap-2.5 animate-fade-in font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Acceso Autorizado. Iniciando sesión operacional...</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Correo Electrónico de Planta
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-450 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ejemplo@biotrash.net"
                className="w-full bg-[#FAFAFA] border border-slate-350 rounded-lg text-xs pl-10 pr-4 py-2.5 outline-none font-medium text-slate-800 focus:border-blue-500 transition shadow-sm"
              />
            </div>
            <p className="text-[9px] text-slate-450 mt-1 leading-snug">
              Ingrese su correo corporativo previamente registrado en la base de datos por el administrador.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-[#1A1C1E] hover:bg-neutral-800 disabled:bg-slate-400 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer shadow flex items-center justify-center gap-2 overflow-hidden"
          >
            {loading ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Verificando Credenciales...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-sky-400" />
                <span>Ingresar al Sistema SGI</span>
              </>
            )}
          </button>
        </form>

        {/* Security Policy Notice Information Footer */}
        <div className="bg-[#FAFAFA] p-3.5 rounded-lg border border-slate-200 text-[10px] leading-relaxed text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 uppercase tracking-wider">🔒 Directiva de Calidad ISO 9001</p>
          <p>
            Toda acción en este panel de control de bitácoras de disposición, incineración e inventarios quedará auditada con su firma operacional y correo electrónico corporativo registrado.
          </p>
          <p className="pt-1.5 border-t border-slate-200 mt-1 text-slate-400 font-mono text-center">
            Master Admin: gestor.it@biotrash.net
          </p>
        </div>

      </div>
    </div>
  );
}
