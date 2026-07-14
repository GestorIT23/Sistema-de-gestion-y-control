import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraLavadoBanos } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Download, Database, ShieldCheck, Heart, AlertCircle, Info, FileSpreadsheet, CheckCircle, FileText } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';
import BulkUploadPanel from '../BulkUploadPanel';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraLavadoBanosModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraLavadoBanos[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState('Día');
  const [ubicacionBanos, setUbicacionBanos] = useState('Planta Baja (Producción)');
  const [responsable, setResponsable] = useState(userEmail || '');
  const [desinfectanteUsado, setDesinfectanteUsado] = useState('Cloro Industrial 5% / Amonio Cuaternario');
  const [observaciones, setObservaciones] = useState('');

  // Checklists
  const [checklist, setChecklist] = useState({
    lavadoSanitarios: true,
    lavadoLavamanos: true,
    barridoTrapeado: true,
    limpiezaEspejos: true,
    limpiezaVidrios: false,
    desinfeccionSuperficies: true,
    vaciadoPapeleras: true,
  });

  const [abastecimiento, setAbastecimiento] = useState({
    papelHigienico: true,
    jabonManos: true,
    toallasPapel: true,
    sanitizante: true,
  });

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_lavado_banos'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraLavadoBanos[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraLavadoBanos);
      });
      setRegistros(docs);
    } catch (e) {
      console.error('Error fetching registers:', e);
      const fallback = localStorage.getItem('biotrash_banos_bk');
      if (fallback) {
        setRegistros(JSON.parse(fallback));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: 'Almacenando bitácora de sanidad...', type: 'info' });

    const nuevoRegistro: BitacoraLavadoBanos = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      turno,
      ubicacionBanos,
      responsable,
      desinfectanteUsado,
      observaciones: observaciones || 'Ninguna anomalía detectada. Área limpia.',
      checklistBanos: checklist,
      abastecimientoBanos: abastecimiento,
      elaboro: 'Supervisor de Higiene / Operador SGI',
      reviso: 'Coordinador SGI de Planta',
      aprobo: 'Comité de Gestión Ambiental e Inocuidad',
      cambioControl: [
        {
          version: '1.0',
          fecha: '15/06/2025',
          seccion: 'Todas',
          cambio: 'Lanzamiento del formato higiénico-sanitario SGI',
          solicitante: 'Comité de Calidad'
        }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_lavado_banos'), nuevoRegistro);
      setMsg({ text: '¡Bitácora guardada con éxito!', type: 'success' });
      
      // Reset form variables
      setObservaciones('');
      fetchRegistros();
    } catch (err) {
      console.error(err);
      // Fallback local storage
      const currentBackup = [nuevoRegistro, ...registros];
      localStorage.setItem('biotrash_banos_bk', JSON.stringify(currentBackup));
      setRegistros(currentBackup);
      setMsg({ text: 'Guardado localmente debido a caída de red celular.', type: 'success' });
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist({ ...checklist, [key]: !checklist[key] });
  };

  const toggleAbastecimiento = (key: keyof typeof abastecimiento) => {
    setAbastecimiento({ ...abastecimiento, [key]: !abastecimiento[key] });
  };

  const handleExportExcel = (reg: BitacoraLavadoBanos) => {
    generateAndDownloadExcel('lavado_banos', reg);
  };

  return (
    <div id="bitacora-lavado-banos-root" className="max-w-7xl mx-auto px-4 py-4 space-y-6 animate-fade-in text-slate-800">
      
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-[#1A1C1E] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Tablero
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> ISO 14001:2015 Certificado
        </div>
      </div>

      <FormHeader 
        titulo="BITÁCORA DE LAVADO DE BAÑOS Y ÁREA ADMINISTRATIVA"
        codigo="BIOTRASH 4.0. F-OPR-000-10"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: input form */}
        <form onSubmit={handleGuardar} className="lg:col-span-7 bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" /> Registro de Checklist Sanitario
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Inspección</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turno de Trabajo</label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Día">Día (06:00 - 14:00)</option>
                <option value="Tarde">Tarde (14:00 - 22:00)</option>
                <option value="Noche">Noche (22:00 - 06:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ubicación de Baños / Oficinas</label>
              <select
                value={ubicacionBanos}
                onChange={(e) => setUbicacionBanos(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Planta Baja (Producción)">Planta Baja (Área de Operación)</option>
                <option value="Planta Alta (Oficinas)">Planta Alta (Área Administrativa)</option>
                <option value="Comedor de Personal">Comedor / Cocina de Personal</option>
                <option value="Garita y Recepción">Garita y Recepción Principal</option>
                <option value="Todas las Áreas">Todas las Áreas Sanitarias (Consolidado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Responsable del Sanamiento</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Marca / Tipo de Desinfectante</label>
            <input
              type="text"
              required
              value={desinfectanteUsado}
              onChange={(e) => setDesinfectanteUsado(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              placeholder="Ej. Cloro al 5%, Amonio Cuaternario, Desinfectante de Pino"
            />
          </div>

          {/* Checklist de Tareas Sanitarias */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <CheckCircle className="w-4 h-4 text-[#8ec23f]" /> Checklist de Limpieza Realizada
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[
                { key: 'lavadoSanitarios', label: 'Lavado Profundo Sanitarios e Inodoros' },
                { key: 'lavadoLavamanos', label: 'Desinfección de Lavamanos e Grifería' },
                { key: 'barridoTrapeado', label: 'Barrido y Trapeado de Pisos y Zócalos' },
                { key: 'limpiezaEspejos', label: 'Limpieza de Espejos y Azulejos' },
                { key: 'limpiezaVidrios', label: 'Limpieza de Ventanas y Vidrios Exteriores' },
                { key: 'desinfeccionSuperficies', label: 'Sanitizado de Perillas, Manijas y Cafetera' },
                { key: 'vaciadoPapeleras', label: 'Vaciado de botes de papel y bolsas rojas' }
              ].map((task) => (
                <label key={task.key} className="flex items-center gap-3.5 bg-white p-2.5 rounded border border-slate-200/60 cursor-pointer hover:bg-slate-100/50 transition">
                  <input
                    type="checkbox"
                    checked={checklist[task.key as keyof typeof checklist]}
                    onChange={() => toggleChecklist(task.key as keyof typeof checklist)}
                    className="w-4 h-4 rounded text-[#8ec23f] border-slate-300 focus:ring-[#8ec23f]"
                  />
                  <span className="text-xs font-medium text-slate-700 select-none">{task.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Checklist de Abastecimiento */}
          <div className="bg-[#effaf4] p-4 rounded-lg border border-emerald-100">
            <h4 className="text-xs font-bold text-emerald-800 uppercase mb-3 flex items-center gap-1.5 border-b border-emerald-200 pb-1.5">
              <Heart className="w-4 h-4 text-emerald-600" /> Abastecimiento de Consumibles
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: 'papelHigienico', label: 'Papel Higiénico' },
                { key: 'jabonManos', label: 'Jabón para Manos' },
                { key: 'toallasPapel', label: 'Toallas de Papel' },
                { key: 'sanitizante', label: 'Gel / Alcohol' }
              ].map((item) => (
                <label key={item.key} className="flex flex-col items-center justify-center p-3.5 rounded bg-white border border-emerald-200 cursor-pointer hover:bg-emerald-50 transition shadow-sm text-center">
                  <input
                    type="checkbox"
                    checked={abastecimiento[item.key as keyof typeof abastecimiento]}
                    onChange={() => toggleAbastecimiento(item.key as keyof typeof abastecimiento)}
                    className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500 mb-2"
                  />
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight leading-none">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Novedades o Anomalías (Observaciones)</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Describa si hay fallos (grifería dañada, falta de presión de agua, rotura de espejos o botes de pedal)."
              rows={3}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Feedback Msg */}
          {msg.text && (
            <div className={`p-3 rounded text-xs flex items-center gap-2 ${msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{msg.text}</span>
            </div>
          )}

          <div className="text-right">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1A1C1E] hover:bg-[#2D2F31] text-white disabled:opacity-50 text-xs font-bold px-6 py-2 rounded transition shadow cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-slate-800"
            >
              {saving ? 'Guardando...' : 'Guardar en Base de Datos SGI'}
            </button>
          </div>
        </form>

        {/* Right column: recent registers log */}
        <div className="lg:col-span-5 bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
          <BulkUploadPanel tipo="lavado_banos" userEmail={userEmail} onSuccess={fetchRegistros} />

          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#8ec23f]" /> Últimas Sanitizaciones
            </h3>
            <span className="bg-[#8ec23f]/15 text-[#6c9c22] font-mono text-[9px] px-2 py-0.5 rounded-full font-bold">LIVE</span>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1C1E] mx-auto"></div>
              <p className="text-xs text-slate-500 mt-2 font-mono">Conectando a bases de datos de seguridad...</p>
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-12 bg-white rounded border border-dashed border-slate-200 text-slate-400">
              <Info className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs mt-2 font-medium">No se han guardado registros hoy.</p>
              <p className="text-[10px] mt-0.5">Usa el panel izquierdo para crear registros de higiene.</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
              {registros.map((reg) => (
                <div key={reg.id} className="bg-white p-4 rounded border border-slate-200 hover:border-slate-300 shadow-sm transition">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        F-OPR-000-10
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1.5 flex items-center gap-1">
                        {reg.fecha} <span className="text-slate-400 text-[10px] font-normal">({reg.turno})</span>
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded capitalize">
                      {reg.ubicacionBanos.split(' ')[0]}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 mt-2 font-mono flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Resp: {reg.responsable}
                  </div>

                  {/* Sanitación metrics pills */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {reg.checklistBanos?.lavadoSanitarios && (
                      <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded-full font-medium">Sanitarios OK</span>
                    )}
                    {reg.checklistBanos?.lavadoLavamanos && (
                      <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded-full font-medium">Lavamanos OK</span>
                    )}
                    {reg.checklistBanos?.barridoTrapeado && (
                      <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded-full font-medium">Pisos OK</span>
                    )}
                    {reg.abastecimientoBanos?.papelHigienico && (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-bold">Papel OK</span>
                    )}
                    {reg.abastecimientoBanos?.jabonManos && (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-bold">Jabón OK</span>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 italic mt-3 bg-slate-50 p-2 rounded border border-slate-100">
                    "{reg.observaciones}"
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleExportExcel(reg)}
                      className="text-cyan-600 hover:text-cyan-900 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => generateAndDownloadPDF('lavado_banos', reg)}
                      className="text-red-700 hover:text-red-900 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-500" /> PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FormFooter 
        elaboroCargo="Supervisor de Higiene / Operador SGI"
        revisoCargo="Coordinador SGI de Planta"
        aproboCargo="Comité de Gestión Ambiental e Inocuidad"
        cambios={[
          {
            version: '1.0',
            fecha: '15/06/2025',
            seccion: 'Todas',
            cambio: 'Lanzamiento del formato higiénico-sanitario SGI',
            solicitante: 'Comité de Calidad'
          }
        ]}
      />
    </div>
  );
}
