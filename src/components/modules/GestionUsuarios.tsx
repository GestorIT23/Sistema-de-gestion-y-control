import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ArrowLeft, 
  Plus, 
  Search, 
  Trash2, 
  ShieldAlert, 
  RefreshCcw,
  Check,
  UserCheck,
  Shield,
  Briefcase,
  Wrench,
  AlertCircle,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { Usuario, UserRole } from '../../types';

export const AVAILABLE_MODULES = [
  { id: 'inventarios', title: 'Ingreso de Desechos a Planta', code: 'F-OPR-1' },
  { id: 'entrega_contenedores', title: 'Entrega Contenedores Rojos', code: 'F-OPR-2' },
  { id: 'disposicion_pirolisis', title: 'Disposición Final a Pirólisis', code: 'F-OPR-3' },
  { id: 'disposicion_vertedero', title: 'Disposición Final (Vertedero)', code: 'F-OPR-4' },
  { id: 'control_incineracion', title: 'Control de Incineración RPBI', code: 'F-OPR-5' },
  { id: 'cuarto_frio', title: 'Control de Cuarto Frío', code: 'F-OPR-6' },
  { id: 'reduccion_volumen', title: 'Reducción de Volumen Shredder', code: 'F-OPR-7' },
  { id: 'control_autoclaves', title: 'Control Químico / Biológico', code: 'F-OPR-8' },
  { id: 'generacion_almacenamiento', title: 'Ingreso y Almacenamiento', code: 'F-OPR-9' },
  { id: 'lavado_banos', title: 'Sanitización de Baños/Oficinas', code: 'F-OPR-10' },
  { id: 'insumos_quimicos', title: 'Insumos Químicos y Plásticos', code: 'F-OPR-11' },
  { id: 'inventarios_sgc', title: 'Inventario General SGC', code: 'F-OPR-12' },
  { id: 'control_uniformes', title: 'Auditoría de Uniformes y EPP', code: 'F-OPR-13' },
  { id: 'control_horas_cargador', title: 'Control Horas de Trabajo', code: 'F-OPR-14' },
];

interface Props {
  onBack: () => void;
  currentUserEmail: string;
}

export default function GestionUsuarios({ onBack, currentUserEmail }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Add User Form Fields
  const [newEmail, setNewEmail] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newRol, setNewRol] = useState<UserRole>('Operador/Llenador');
  const [newModulosAcceso, setNewModulosAcceso] = useState<string[]>(AVAILABLE_MODULES.map(m => m.id));

  // Search Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state variables
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRol, setEditRol] = useState<UserRole>('Operador/Llenador');
  const [editModulosAcceso, setEditModulosAcceso] = useState<string[]>([]);

  const startEdit = (u: Usuario) => {
    setEditingUserId(u.id || null);
    setEditNombre(u.nombre);
    setEditEmail(u.email);
    setEditRol(u.rol);
    setEditModulosAcceso(u.modulosAcceso || AVAILABLE_MODULES.map(m => m.id));
  };

  const cancelEdit = () => {
    setEditingUserId(null);
  };

  const handleSaveEdit = async (userId: string, originalEmail: string) => {
    if (!editNombre.trim() || !editEmail.trim()) {
      triggerMsg('Por favor complete todos los datos del usuario.', 'error');
      return;
    }

    const emailClean = editEmail.trim().toLowerCase();

    // Check if duplicate
    const exists = usuarios.some(u => u.id !== userId && u.email.toLowerCase() === emailClean);
    if (exists) {
      triggerMsg('El correo electrónico ya se encuentra registrado por otro colaborador.', 'error');
      return;
    }

    // Safety checks for changing immutable default admin
    if (originalEmail.toLowerCase() === 'gestor.it@biotrash.net' && emailClean !== 'gestor.it@biotrash.net') {
      triggerMsg('No se permite alterar el correo del administrador maestro "gestor.it@biotrash.net".', 'error');
      return;
    }

    // Safety check for self roll lockout
    if (originalEmail.toLowerCase() === currentUserEmail.toLowerCase() && editRol !== 'Administrador') {
      triggerMsg('No puede revocar o cambiar su propio rol administrativo por seguridad.', 'error');
      return;
    }

    try {
      const docRef = doc(db, 'usuarios', userId);
      await updateDoc(docRef, {
        nombre: editNombre.trim(),
        email: emailClean,
        rol: editRol,
        modulosAcceso: editModulosAcceso
      });
      setEditingUserId(null);
      await fetchUsuarios();
      triggerMsg('Características del usuario SGC actualizadas correctamente.', 'success');
    } catch (err) {
      console.error("Error updates user characteristics:", err);
      triggerMsg('Error al intentar guardar los cambios del usuario.', 'error');
    }
  };

  // Fetch all users
  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const qSnap = await getDocs(collection(db, 'usuarios'));
      const list: Usuario[] = [];
      qSnap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Usuario);
      });

      // If the default admin gestor.it@biotrash.net is not in the db, we auto-create/seed it
      const hasDefaultAdmin = list.some(u => u.email.toLowerCase() === 'gestor.it@biotrash.net');
      if (!hasDefaultAdmin) {
        const defaultAdmin: Omit<Usuario, 'id'> = {
          email: 'gestor.it@biotrash.net',
          nombre: 'Soporte y Sistemas BIOTRASH (Default Admin)',
          rol: 'Administrador',
          fechaCreacion: new Date().toISOString(),
          modulosAcceso: AVAILABLE_MODULES.map(m => m.id)
        };
        const docRef = await addDoc(collection(db, 'usuarios'), defaultAdmin);
        list.push({ id: docRef.id, ...defaultAdmin });
      }

      setUsuarios(list);
    } catch (err) {
      console.error("Error fetching users:", err);
      setMsg({ text: 'Error al conectar con la base de datos de usuarios.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Safe handler to show status message
  const triggerMsg = (text: string, type: 'success' | 'error') => {
    setMsg({ text, type });
    setTimeout(() => {
      setMsg({ text: '', type: '' });
    }, 5000);
  };

  // Add User
  const handleAddUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newNombre.trim()) {
      triggerMsg('Por favor complete todos los datos del usuario.', 'error');
      return;
    }

    const emailClean = newEmail.trim().toLowerCase();

    // Check if duplicate in current list
    if (usuarios.some(u => u.email.toLowerCase() === emailClean)) {
      triggerMsg('El correo electrónico ya se encuentra registrado.', 'error');
      return;
    }

    setSaving(true);
    try {
      const newUser: Omit<Usuario, 'id'> = {
        email: emailClean,
        nombre: newNombre.trim(),
        rol: newRol,
        fechaCreacion: new Date().toISOString(),
        modulosAcceso: newModulosAcceso
      };

      await addDoc(collection(db, 'usuarios'), newUser);
      await fetchUsuarios();
      
      setNewEmail('');
      setNewNombre('');
      setNewRol('Operador/Llenador');
      setNewModulosAcceso(AVAILABLE_MODULES.map(m => m.id));
      triggerMsg('Usuario agregado correctamente.', 'success');
    } catch (err) {
      console.error("Error adding user:", err);
      triggerMsg('Error al intentar registrar el usuario.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Update User Role
  const handleUpdateRole = async (userId: string, targetUserEmail: string, newRole: UserRole) => {
    // Safety check: Cannot change own role if itself is the current logged-in user to prevent lockout
    if (targetUserEmail.toLowerCase() === currentUserEmail.toLowerCase()) {
      triggerMsg('No puede degradar o cambiar su propio rol administrativo por seguridad.', 'error');
      return;
    }

    try {
      const docRef = doc(db, 'usuarios', userId);
      await updateDoc(docRef, { rol: newRole });
      await fetchUsuarios();
      triggerMsg('Permisos del usuario actualizados correctamente.', 'success');
    } catch (err) {
      console.error("Error updating user role:", err);
      triggerMsg('Error al actualizar permisos.', 'error');
    }
  };

  // Delete User
  const handleDeleteUsuario = async (userId: string, targetUserEmail: string) => {
    // Safety checks
    if (targetUserEmail.toLowerCase() === currentUserEmail.toLowerCase()) {
      triggerMsg('No se permite la eliminación de su propia cuenta de usuario en sesión.', 'error');
      return;
    }

    if (targetUserEmail.toLowerCase() === 'gestor.it@biotrash.net') {
      triggerMsg('El administrador por defecto gestor.it@biotrash.net no puede ser eliminado.', 'error');
      return;
    }

    if (!window.confirm(`¿Está seguro de que desea eliminar permanentemente al usuario ${targetUserEmail}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'usuarios', userId));
      await fetchUsuarios();
      triggerMsg('Usuario eliminado con éxito del sistema.', 'success');
    } catch (err) {
      console.error("Error deleting user:", err);
      triggerMsg('Error al intentar dar de baja al usuario.', 'error');
    }
  };

  // Quick Seed Helpers to test
  const handleQuickSeed = async () => {
    setSaving(true);
    try {
      const presets = [
        { 
          email: 'supervisor@biotrash.net', 
          nombre: 'Ing. Daniel Marroquín (Supervisor)', 
          rol: 'Supervisor' as UserRole,
          modulosAcceso: AVAILABLE_MODULES.map(m => m.id)
        },
        { 
          email: 'operador@biotrash.net', 
          nombre: 'Tco. Manuel Flores (Operador)', 
          rol: 'Operador/Llenador' as UserRole,
          modulosAcceso: AVAILABLE_MODULES.map(m => m.id)
        }
      ];

      for (const preset of presets) {
        if (!usuarios.some(u => u.email.toLowerCase() === preset.email)) {
          await addDoc(collection(db, 'usuarios'), {
            ...preset,
            fechaCreacion: new Date().toISOString()
          });
        }
      }
      await fetchUsuarios();
      triggerMsg('Usuarios de prueba SGC agregados correctamente.', 'success');
    } catch (err) {
      console.error(err);
      triggerMsg('Error al programar usuarios demo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter local state list
  const filteredUsuarios = usuarios.filter(u => {
    const text = searchTerm.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(text) || 
      u.email.toLowerCase().includes(text) || 
      u.rol.toLowerCase().includes(text)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      
      {/* Back & Breadcrumb navigation block */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 hover:text-[#3B82F6] transition text-xs font-bold text-slate-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero
        </button>
        <span className="text-[10px] bg-slate-200 text-slate-800 px-3 py-1 rounded-full font-mono font-bold tracking-widest uppercase">
          PROCESO: SGC-USR-MGR
        </span>
      </div>

      {/* Hero Header Area */}
      <div className="bg-[#1A1C1E] text-white rounded-lg p-5 border border-[#2D2F31] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold tracking-tight">Gestión de Usuarios y Permisos Operacionales</h2>
          </div>
          <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
            Consola centralizada para registrar personal operario, supervisores de rampa y administradores de calidad. Configure niveles de acceso para garantizar la integridad de las bitácoras SGC ISO 9001 e ISO 14001.
          </p>
        </div>
        <button
          onClick={handleQuickSeed}
          disabled={saving}
          className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3 py-1.5 rounded transition shadow-sm cursor-pointer whitespace-nowrap self-start md:self-auto flex items-center gap-1.5"
        >
          <UserCheck className="w-3.5 h-3.5" /> Agregar Demos de Prueba
        </button>
      </div>

      {/* Messages banner */}
      {msg.text && (
        <div className={`p-3.5 rounded border text-xs flex items-center gap-2.5 font-medium animate-fade-in ${
          msg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {msg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Column 1: Add New or Edit User Form */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4 h-fit sticky top-6">
          {editingUserId ? (
            // EDIT FORM
            <>
              <div className="border-b pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">Editar Colaborador</h3>
                </div>
                <button
                  onClick={cancelEdit}
                  className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit(editingUserId, editEmail);
              }} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    placeholder="Ej. Ing. Daniel Marroquín"
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none font-medium text-slate-800 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Ej. dmarroquin@biotrash.net"
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none font-medium text-slate-800 focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-50"
                    required
                    disabled={editEmail.toLowerCase() === 'gestor.it@biotrash.net'}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Rol / Nivel de Acceso</label>
                  <select
                    value={editRol}
                    onChange={(e) => setEditRol(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none font-bold text-slate-800 focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-50"
                    disabled={editEmail.toLowerCase() === 'gestor.it@biotrash.net' || editEmail.toLowerCase() === currentUserEmail.toLowerCase()}
                  >
                    <option value="Operador/Llenador">Operador/Llenador (Captura simple)</option>
                    <option value="Supervisor">Supervisor (Captura + Reportes)</option>
                    <option value="Administrador">Administrador (Acceso Completo)</option>
                  </select>
                </div>

                {/* Edit Modules Authorized */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Módulos Autorizados</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditModulosAcceso(AVAILABLE_MODULES.map(m => m.id))}
                        className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-[9px] text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setEditModulosAcceso([])}
                        className="text-[9px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>
                  <div className="border border-slate-300 rounded bg-slate-50 p-2 max-h-48 overflow-y-auto space-y-1">
                    {AVAILABLE_MODULES.map((modulo) => {
                      const isChecked = editModulosAcceso.includes(modulo.id);
                      return (
                        <label key={modulo.id} className="flex items-start gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded text-slate-700">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditModulosAcceso(editModulosAcceso.filter(id => id !== modulo.id));
                              } else {
                                setEditModulosAcceso([...editModulosAcceso, modulo.id]);
                              }
                            }}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <div className="text-[11px] leading-tight font-medium">
                            <span className="font-bold text-slate-800 mr-1">{modulo.code}</span>
                            {modulo.title}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded transition cursor-pointer shadow-sm text-center flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4 text-white" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded transition cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </>
          ) : (
            // CREATE FORM
            <>
              <div className="border-b pb-2 flex items-center gap-2">
                <Plus className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">Registrar Nuevo Colaborador</h3>
              </div>

              <form onSubmit={handleAddUsuario} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Ej. Ing. Daniel Marroquín"
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none font-medium text-slate-800 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Correo Electrónico (BIOTRASH o Aliado)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Ej. dmarroquin@biotrash.net"
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none font-medium text-slate-800 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Rol / Nivel de Acceso</label>
                  <select
                    value={newRol}
                    onChange={(e) => setNewRol(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-1.5 outline-none font-bold text-slate-800 focus:border-blue-500"
                  >
                    <option value="Operador/Llenador">Operador/Llenador (Captura simple)</option>
                    <option value="Supervisor">Supervisor (Captura + Reportes)</option>
                    <option value="Administrador">Administrador (Acceso Completo)</option>
                  </select>
                </div>

                {/* Create Modules Authorized */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Módulos Autorizados</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewModulosAcceso(AVAILABLE_MODULES.map(m => m.id))}
                        className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-[9px] text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setNewModulosAcceso([])}
                        className="text-[9px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Ninguno
                      </button>
                    </div>
                  </div>
                  <div className="border border-slate-300 rounded bg-slate-50 p-2 max-h-48 overflow-y-auto space-y-1">
                    {AVAILABLE_MODULES.map((modulo) => {
                      const isChecked = newModulosAcceso.includes(modulo.id);
                      return (
                        <label key={modulo.id} className="flex items-start gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded text-slate-700">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setNewModulosAcceso(newModulosAcceso.filter(id => id !== modulo.id));
                              } else {
                                setNewModulosAcceso([...newModulosAcceso, modulo.id]);
                              }
                            }}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <div className="text-[11px] leading-tight font-medium">
                            <span className="font-bold text-slate-800 mr-1">{modulo.code}</span>
                            {modulo.title}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#1A1C1E] hover:bg-neutral-800 text-white font-bold text-xs py-2 rounded transition cursor-pointer shadow-sm text-center flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-sky-400" />
                    {saving ? 'Registrando...' : 'Registrar Colaborador'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Quick Informational Tip Card */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 mt-4 text-[11px] leading-relaxed text-slate-600">
            <span className="font-bold text-xs text-slate-800 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Definición de Permisos
            </span>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Administrador:</strong> Acceso completo incluyendo reportes y el gestor de usuarios.</li>
              <li><strong>Supervisor:</strong> Puede llenar cualquier bitácora y consultar reporte mensual de trazabilidad.</li>
              <li><strong>Operador/Llenador:</strong> Acceso exclusivo a ingreso de registros en las bitácoras operacionales autorizadas.</li>
            </ul>
          </div>
        </div>

        {/* Column 2: Dashboard Table */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
          
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-500" />
              Directorio de Personal Autorizado ({filteredUsuarios.length})
            </h3>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded text-xs pl-8 pr-2.5 py-1.5 outline-none font-medium text-slate-800 w-full sm:w-56 focus:border-blue-500"
                />
              </div>
              <button
                onClick={fetchUsuarios}
                className="p-1 px-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-100 transition whitespace-nowrap cursor-pointer"
                title="Sincronizar"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* User Directory Table representation */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-20 space-y-3">
                <RefreshCcw className="w-6 h-6 text-slate-450 animate-spin mx-auto" />
                <p className="text-slate-500 text-xs">Cargando catálogo de colaboradores...</p>
              </div>
            ) : filteredUsuarios.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 border border-dashed rounded-lg">
                <Users className="w-8 h-8 text-slate-400 mx-auto opacity-50 mb-2" />
                <p className="text-slate-600 text-xs font-bold">No se encontraron colaboradores</p>
                <p className="text-slate-400 text-[11px] mt-1">Intente ajustar su parámetro de búsqueda actual.</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-2.5 font-bold text-slate-600 text-[10px] uppercase">Nombre / Correo / Módulos</th>
                    <th className="px-4 py-2.5 font-bold text-slate-600 text-[10px] uppercase">Rango / Rol SGC</th>
                    <th className="px-4 py-2.5 font-bold text-slate-600 text-[10px] uppercase">Rol Rápido</th>
                    <th className="px-4 py-2.5 font-bold text-slate-600 text-[10px] uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsuarios.map((u) => {
                    const isSelfAdmin = u.email.toLowerCase() === currentUserEmail.toLowerCase();
                    const isImmutablePreset = u.email.toLowerCase() === 'gestor.it@biotrash.net';
                    const isEditing = editingUserId === u.id;

                    return (
                      <tr 
                        key={u.id} 
                        className={`hover:bg-slate-50 transition ${
                          isEditing ? 'bg-amber-50/40 border-l-2 border-amber-500' : isSelfAdmin ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        {/* Name Info & Authorized Modules */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            {u.nombre}
                            {isSelfAdmin && (
                              <span className="text-[8px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-mono font-bold">
                                Tú
                              </span>
                            )}
                            {isEditing && (
                              <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-0.5 animate-pulse">
                                <Edit2 className="w-2.5 h-2.5" /> Editando en panel izquierdo
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{u.email}</div>
                          
                          {/* Modulos Autorizados Badges */}
                          <div className="mt-2 space-y-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Módulos SGC Autorizados:</span>
                            {u.modulosAcceso && u.modulosAcceso.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {u.modulosAcceso.map(mId => {
                                  const m = AVAILABLE_MODULES.find(mod => mod.id === mId);
                                  return m ? (
                                    <span key={mId} className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono font-semibold" title={m.title}>
                                      {m.code}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            ) : (
                              <span className="text-[9px] text-rose-500 italic font-bold">Sin acceso a ningún módulo</span>
                            )}
                          </div>
                        </td>

                        {/* Current Role Badger */}
                        <td className="px-4 py-3">
                          {u.rol === 'Administrador' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 font-bold px-2 py-0.5 rounded">
                              <Shield className="w-3 h-3" /> Administrador
                            </span>
                          ) : u.rol === 'Supervisor' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-sky-700 bg-sky-50 border border-sky-200 font-bold px-2 py-0.5 rounded">
                              <Briefcase className="w-3 h-3" /> Supervisor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded">
                              <Wrench className="w-3 h-3" /> Operador/Llenador
                            </span>
                          )}
                        </td>

                        {/* Role switcher picker column */}
                        <td className="px-4 py-3">
                          <select
                            disabled={isImmutablePreset || isSelfAdmin}
                            value={u.rol}
                            onChange={(e) => handleUpdateRole(u.id!, u.email, e.target.value as UserRole)}
                            className="bg-white border select-xs border-slate-300 rounded text-[11px] px-1.5 py-1 text-slate-700 outline-none hover:border-slate-400 font-medium disabled:opacity-50 disabled:bg-slate-100"
                          >
                            <option value="Operador/Llenador">Operador/Llenador</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Administrador">Administrador</option>
                          </select>
                        </td>

                        {/* Actions column */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(u)}
                              className={`p-1 hover:text-sky-600 transition cursor-pointer ${isEditing ? 'text-sky-600' : 'text-slate-400'}`}
                              title="Editar Características y Módulos"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={isImmutablePreset || isSelfAdmin}
                              onClick={() => handleDeleteUsuario(u.id!, u.email)}
                              className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 transition cursor-pointer"
                              title={isSelfAdmin ? "No se puede eliminar a usted mismo" : "Eliminar de base de datos SGC"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
