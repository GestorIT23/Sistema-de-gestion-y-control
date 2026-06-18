import React from 'react';
import { Shield, Users, HelpCircle, Briefcase, Wrench, LogOut } from 'lucide-react';
import { Usuario } from '../types';

interface Props {
  currentUser: Usuario;
  allUsers: Usuario[];
  onSelectUserEmail: (email: string) => void;
  onSignOut: () => void;
}

export default function Header({ currentUser, allUsers, onSelectUserEmail, onSignOut }: Props) {
  return (
    <header className="h-14 bg-[#1A1C1E] text-white flex items-center justify-between px-6 border-b border-[#2D2F31] sticky top-0 z-40">
      
      {/* Left Side Brand */}
      <div className="flex items-center gap-3">
        <div className="bg-[#3B82F6] p-1.5 rounded">
          <Shield className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-sm uppercase">BIOTRASH SGC</span>
            <span className="text-[10px] text-[#3B82F6] font-mono font-bold tracking-wider uppercase bg-[#3B82F6]/10 px-1.5 py-0.5 rounded">
              v4.2 ROLES
            </span>
          </div>
          <span className="text-[9px] text-[#A0AEC0] font-mono block tracking-wider uppercase">Garantía Operacional ISO 9001 / 14001</span>
        </div>
      </div>

      {/* Right Side Switcher / Info */}
      <div className="flex items-center gap-4 text-[11px] font-mono">
        
        {/* Connection status indicator */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-gray-400 font-bold uppercase text-[9px]">SGC CENTRAL:</span>
          <span className="text-emerald-400 font-extrabold text-[10px]">CONNECTED</span>
        </div>

        <div className="hidden lg:block h-4 w-px bg-[#2D2F31]"></div>
        
        {/* Static logged in profile display */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col text-right pr-1 sm:block sm:text-left sm:pr-0">
            <span className="text-gray-400 font-bold text-[9px] mr-1">COLABORADOR:</span>
            <span className="text-white font-bold text-xs">{currentUser.nombre}</span>
            <span className="text-gray-400 text-[10px] sm:ml-2 font-mono">({currentUser.email})</span>
          </div>
        </div>

        {/* Access level badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700">
          {currentUser.rol === 'Administrador' ? (
            <span className="text-[#3B82F6] font-extrabold text-[9px] flex items-center gap-1 uppercase tracking-wider">
              <Shield className="w-3 h-3 shrink-0" /> Full SGC
            </span>
          ) : currentUser.rol === 'Supervisor' ? (
            <span className="text-sky-400 font-extrabold text-[9px] flex items-center gap-1 uppercase tracking-wider">
              <Briefcase className="w-3 h-3 shrink-0" /> Reports Enabled
            </span>
          ) : (
            <span className="text-emerald-400 font-extrabold text-[9px] flex items-center gap-1 uppercase tracking-wider">
              <Wrench className="w-3 h-3 shrink-0" /> Llenador F-OPR
            </span>
          )}
        </div>

        <div className="hidden sm:block h-4 w-px bg-[#2D2F31]"></div>

        {/* Sign Out Action Button */}
        <button
          onClick={onSignOut}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-rose-950/40 hover:bg-rose-900 border border-rose-800/60 hover:border-rose-700 text-rose-300 font-bold text-xs cursor-pointer transition"
          title="Cerrar sesión de planta"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Salir</span>
        </button>

      </div>

    </header>
  );
}
