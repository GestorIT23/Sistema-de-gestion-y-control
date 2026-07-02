import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

// Import All 9 Process Bitacoras Modules
import BitacoraInventariosModule from './components/modules/BitacoraInventarios';
import BitacoraEntregaContenedores from './components/modules/BitacoraEntregaContenedores';
import BitacoraDisposicionPirolisis from './components/modules/BitacoraDisposicionPirolisis';
import BitacoraDisposicionVertedero from './components/modules/BitacoraDisposicionVertedero';
import BitacoraControlIncineracionModule from './components/modules/BitacoraControlIncineracion';
import BitacoraCuartoFrioModule from './components/modules/BitacoraCuartoFrio';
import BitacoraReduccionVolumenModule from './components/modules/BitacoraReduccionVolumen';
import BitacoraControlAutoclavesModule from './components/modules/BitacoraControlAutoclaves';
import BitacoraGeneracionAlmacenamientoModule from './components/modules/BitacoraGeneracionAlmacenamiento';
import BitacoraLavadoBanosModule from './components/modules/BitacoraLavadoBanos';
import BitacoraInsumosQuimicosModule from './components/modules/BitacoraInsumosQuimicos';
import BitacoraInventariosSGCModule from './components/modules/BitacoraInventariosSGC';
import BitacoraControlUniformesModule from './components/modules/BitacoraControlUniformes';
import BitacoraControlHorasCargadorModule from './components/modules/BitacoraControlHorasCargador';
import ReportesModule from './components/modules/Reportes';
import GestionUsuarios from './components/modules/GestionUsuarios';

import { db } from './lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { Usuario } from './types';

export default function App() {
  const [moduloActivo, setModuloActivo] = useState<string | null>(null);

  // Checks local storage session on initial render
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('biotrash_user_session');
  });
  
  // Active User session state
  const [currentUser, setCurrentUser] = useState<Usuario>(() => {
    const saved = localStorage.getItem('biotrash_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Error parsing stored session:', err);
      }
    }
    // Default initial template state, replaced on authentic login flow
    return {
      email: 'gestor.it@biotrash.net',
      nombre: 'Soporte y Sistemas BIOTRASH (Default Admin)',
      rol: 'Administrador'
    };
  });

  // State keeping track of all users registered in the system
  const [allUsers, setAllUsers] = useState<Usuario[]>([
    {
      email: 'gestor.it@biotrash.net',
      nombre: 'Soporte y Sistemas BIOTRASH (Default Admin)',
      rol: 'Administrador'
    }
  ]);

  // Fetch registered users to enforce real-time security restrictions & role switches
  const fetchSgcUsers = async () => {
    try {
      const qSnap = await getDocs(collection(db, 'usuarios'));
      const list: Usuario[] = [];
      qSnap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Usuario);
      });

      // Secure default administrator in user list if not created
      const hasDefaultAdmin = list.some(u => u.email.toLowerCase() === 'gestor.it@biotrash.net');
      if (!hasDefaultAdmin) {
        const defaultAdmin: Omit<Usuario, 'id'> = {
          email: 'gestor.it@biotrash.net',
          nombre: 'Soporte y Sistemas BIOTRASH (Default Admin)',
          rol: 'Administrador',
          fechaCreacion: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'usuarios'), defaultAdmin);
        list.push({ id: docRef.id, ...defaultAdmin });
      }

      setAllUsers(list);

      // Match current active user against list to keep roles & names in perfect real-time sync with database edits
      if (isLoggedIn) {
        const matched = list.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (matched) {
          setCurrentUser(matched);
          localStorage.setItem('biotrash_user_session', JSON.stringify(matched));
        } else if (currentUser.email.toLowerCase() !== 'gestor.it@biotrash.net') {
          // If the user's account was deleted by an admin, sign them out instantly!
          handleSignOut();
        }
      }
    } catch (e) {
      console.warn("Could not synchronize users catalogs with Firestore:", e);
    }
  };

  useEffect(() => {
    fetchSgcUsers();
    // Auto-poll user records every 5 seconds to guarantee role edits/deletions take effect live
    const timer = setInterval(() => {
      fetchSgcUsers();
    }, 5000);
    return () => clearInterval(timer);
  }, [isLoggedIn, currentUser.email]);

  const handleLoginSuccess = (user: Usuario) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('biotrash_user_session', JSON.stringify(user));
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('biotrash_user_session');
    setModuloActivo(null);
  };

  const handleSelectUserEmail = (email: string) => {
    // Switcher is only accessible for SGC Admins. Restricts regular workflows
    if (currentUser.rol !== 'Administrador') return;

    const selected = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (selected) {
      setCurrentUser(selected);
      localStorage.setItem('biotrash_user_session', JSON.stringify(selected));
      setModuloActivo(null);
    }
  };

  const renderModulo = () => {
    // Secure Role-based view guards
    if (moduloActivo === 'usuarios' && currentUser.rol !== 'Administrador') {
      return <Dashboard onSelectModulo={(id) => setModuloActivo(id)} currentUser={currentUser} />;
    }
    if (moduloActivo === 'reportes' && currentUser.rol === 'Operador/Llenador') {
      return <Dashboard onSelectModulo={(id) => setModuloActivo(id)} currentUser={currentUser} />;
    }

    switch (moduloActivo) {
      case 'inventarios':
        return (
          <BitacoraInventariosModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'entrega_contenedores':
        return (
          <BitacoraEntregaContenedores
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'disposicion_pirolisis':
        return (
          <BitacoraDisposicionPirolisis
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'disposicion_vertedero':
        return (
          <BitacoraDisposicionVertedero
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'control_incineracion':
        return (
          <BitacoraControlIncineracionModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'cuarto_frio':
        return (
          <BitacoraCuartoFrioModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'reduccion_volumen':
        return (
          <BitacoraReduccionVolumenModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'control_autoclaves':
        return (
          <BitacoraControlAutoclavesModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'generacion_almacenamiento':
        return (
          <BitacoraGeneracionAlmacenamientoModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'lavado_banos':
        return (
          <BitacoraLavadoBanosModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'insumos_quimicos':
        return (
          <BitacoraInsumosQuimicosModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'inventarios_sgc':
        return (
          <BitacoraInventariosSGCModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'control_uniformes':
        return (
          <BitacoraControlUniformesModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'control_horas_cargador':
        return (
          <BitacoraControlHorasCargadorModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'reportes':
        return (
          <ReportesModule
            onBack={() => setModuloActivo(null)}
            userEmail={currentUser.email}
          />
        );
      case 'usuarios':
        return (
          <GestionUsuarios
            onBack={() => setModuloActivo(null)}
            currentUserEmail={currentUser.email}
          />
        );
      default:
        return <Dashboard onSelectModulo={(id) => setModuloActivo(id)} currentUser={currentUser} />;
    }
  };

  // Enforce authentication view gate
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="ai-studio-app-viewport" className="min-h-screen bg-[#F1F3F5] flex flex-col text-[#1A1C1E] font-sans">
      {/* SGC Header Navbar */}
      <Header 
        currentUser={currentUser} 
        allUsers={allUsers}
        onSelectUserEmail={handleSelectUserEmail}
        onSignOut={handleSignOut}
      />

      {/* Main Container Stage */}
      <main className="flex-1 overflow-auto">
        {renderModulo()}
      </main>

      {/* Page Footer */}
      <footer className="bg-[#1A1C1E] border-t border-[#2D2F31] py-4 text-center text-[11px] text-gray-400 font-mono">
        <div className="max-w-7xl mx-auto px-6">
          <p>© {new Date().getFullYear()} BIOTRASH S.A. Todos los derechos reservados.</p>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
            SISTEMA INTEGRADO DE GESTIÓN DE CALIDAD ISO 9001 / ISO 14001 / F-OPR CONTROL PANEL
          </p>
        </div>
      </footer>
    </div>
  );
}
