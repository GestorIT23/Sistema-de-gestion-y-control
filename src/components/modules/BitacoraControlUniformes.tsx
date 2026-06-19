import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraControlUniformes, FilaControlUniforme } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Plus, Trash2, Database, ShieldCheck, Info, AlertCircle, FileSpreadsheet, FileText, Sparkles, CheckCircle } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraControlUniformesModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraControlUniformes[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [responsableEntrega, setResponsableEntrega] = useState(userEmail || '');
  const [observaciones, setObservaciones] = useState('');

  // Table rows
  const [filas, setFilas] = useState<FilaControlUniforme[]>([]);

  // Row additions inputs
  const [colaborador, setColaborador] = useState('');
  const [puesto, setPuesto] = useState('Operador de Horno Incinerador');
  const [tallaCamisa, setTallaCamisa] = useState('M');
  const [tallaPantalon, setTallaPantalon] = useState('32');
  const [tallaBotas, setTallaBotas] = useState('41');
  const [tieneMandil, setTieneMandil] = useState(true);
  const [tieneGuantes, setTieneGuantes] = useState(true);
  const [tieneCareta, setTieneCareta] = useState(true);
  const [motivoDotacion, setMotivoDotacion] = useState('Reemplazo por desgaste de planta');
  const [firmaRecibido, setFirmaRecibido] = useState('');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_control_uniformes'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraControlUniformes[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraControlUniformes);
      });
      setRegistros(docs);
    } catch (e) {
      console.error('Error fetching registers:', e);
      const fallback = localStorage.getItem('biotrash_control_uniformes_bk');
      if (fallback) {
        setRegistros(JSON.parse(fallback));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddFila = () => {
    if (!colaborador || !firmaRecibido) {
      setMsg({ text: 'Por favor, ingrese el nombre del Colaborador y su Firma de conformidad.', type: 'error' });
      return;
    }
    setFilas([
      ...filas,
      {
        colaborador,
        puesto,
        tallaCamisa,
        tallaPantalon,
        tallaBotas,
        tieneMandil,
        tieneGuantes,
        tieneCareta,
        motivoDotacion,
        firmaRecibido,
      }
    ]);
    // Reset selections
    setColaborador('');
    setFirmaRecibido('');
    setMsg({ text: '', type: '' });
  };

  const handleRemoverFila = (idx: number) => {
    setFilas(filas.filter((_, i) => i !== idx));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filas.length === 0) {
      setMsg({ text: 'Debe ingresar al menos un colaborador y uniforme entregado.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Guardando datos en Firebase...', type: 'info' });

    const nuevoRegistro: BitacoraControlUniformes = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      responsable: responsableEntrega,
      responsableEntrega,
      observaciones: observaciones || 'Dotación completada. Todo el personal de planta cuenta con EPP reglamentario.',
      filas,
      elaboro: 'Supervisor de Higiene, Seguridad y EPP',
      reviso: 'Comité de Calidad y Seguridad',
      aprobo: 'Gerente Comercial Industrial',
      cambioControl: [
        {
          version: '1.0',
          fecha: '15/06/2026',
          seccion: 'Todas',
          cambio: 'Lanzamiento del formato de uniformes de planta',
          solicitante: 'Comité de Calidad'
        }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_control_uniformes'), nuevoRegistro);
      setMsg({ text: '¡Registro de uniformes guardado con éxito!', type: 'success' });
      setFilas([]);
      setObservaciones('');
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const currentBackup = [nuevoRegistro, ...registros];
      localStorage.setItem('biotrash_control_uniformes_bk', JSON.stringify(currentBackup));
      setRegistros(currentBackup);
      setMsg({ text: 'Guardado de contingencia local en disco de la aplicación.', type: 'success' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (reg: BitacoraControlUniformes) => {
    generateAndDownloadExcel('control_uniformes', reg);
  };

  return (
    <div id="bitacora-control-uniformes-root" className="max-w-7xl mx-auto px-4 py-4 space-y-6 animate-fade-in text-slate-800 font-sans">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-[#1A1C1E] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Tablero
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> ISO 45001 / ISO 14001 Certificado
        </div>
      </div>

      <FormHeader 
        titulo="BITÁCORA DE CONTROL DE UNIFORMES DE PLANTA Y EPP"
        codigo="BIOTRASH 4.0. F-OPR-000-13"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form module */}
        <form onSubmit={handleGuardar} className="lg:col-span-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-blue-600" /> Registro de Entrega de EPP y Uniformes
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Entrega</label>
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Responsable Operación / Bodega</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={responsableEntrega}
                  onChange={(e) => setResponsableEntrega(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* SubForm additions block */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase border-b border-slate-200 pb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#8ec23f]" /> Formulario de Registro por Colaborador
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Nombre Colaborador</label>
                <input
                  type="text"
                  value={colaborador}
                  onChange={(e) => setColaborador(e.target.value)}
                  placeholder="Ej. Pedro Pérez López"
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Puesto Operacional</label>
                <select
                  value={puesto}
                  onChange={(e) => setPuesto(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2 focus:outline-none"
                >
                  <option value="Operador de Horno Incinerador">Operador de Horno Incinerador</option>
                  <option value="Operador de Autoclave de Presión">Operador de Autoclave de Presión</option>
                  <option value="Piloto Chofer de Ruta Recolección">Piloto Chofer de Ruta Recolección</option>
                  <option value="Auxiliar Operador de Rampa">Auxiliar Operador de Rampa</option>
                  <option value="Supervisor de Higiene e Inocuidad">Supervisor de Higiene e Inocuidad</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Talla Camisa</label>
                <select value={tallaCamisa} onChange={(e) => setTallaCamisa(e.target.value)} className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2">
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="XL">Extra Large (XL)</option>
                  <option value="XXL">Double Extra (XXL)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Talla Pantalón</label>
                <select value={tallaPantalon} onChange={(e) => setTallaPantalon(e.target.value)} className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2">
                  <option value="28">Talla 28</option>
                  <option value="30">Talla 30</option>
                  <option value="32">Talla 32</option>
                  <option value="34">Talla 34</option>
                  <option value="36">Talla 36</option>
                  <option value="38">Talla 38</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Calzado / Botas Casquillo</label>
                <select value={tallaBotas} onChange={(e) => setTallaBotas(e.target.value)} className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2">
                  <option value="38">Talla 38</option>
                  <option value="39">Talla 39</option>
                  <option value="40">Talla 40</option>
                  <option value="41">Talla 41</option>
                  <option value="42">Talla 42</option>
                  <option value="43">Talla 43</option>
                  <option value="44">Talla 44</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Motivo Dotación</label>
                <input
                  type="text"
                  value={motivoDotacion}
                  onChange={(e) => setMotivoDotacion(e.target.value)}
                  placeholder="Ej. Dotación trimestral reglamentaria"
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-3 font-sans"
                />
              </div>

              {/* Checkboxes for EPP delivered */}
              <div className="sm:col-span-12 grid grid-cols-3 gap-2 py-2">
                <label className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200 shadow-xs cursor-pointer">
                  <input type="checkbox" checked={tieneMandil} onChange={() => setTieneMandil(!tieneMandil)} className="w-4 h-4 text-emerald-600 cursor-pointer" />
                  <span className="text-[10px] font-bold text-slate-700">Peto / Mandil Plástico</span>
                </label>
                <label className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200 shadow-xs cursor-pointer">
                  <input type="checkbox" checked={tieneGuantes} onChange={() => setTieneGuantes(!tieneGuantes)} className="w-4 h-4 text-emerald-600 cursor-pointer" />
                  <span className="text-[10px] font-bold text-slate-700">Guantes de Protección</span>
                </label>
                <label className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200 shadow-xs cursor-pointer">
                  <input type="checkbox" checked={tieneCareta} onChange={() => setTieneCareta(!tieneCareta)} className="w-4 h-4 text-emerald-600 cursor-pointer" />
                  <span className="text-[10px] font-bold text-slate-700">Careta de Protección SGC</span>
                </label>
              </div>

              <div className="sm:col-span-9">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Firma / Inicial Conformidad</label>
                <input
                  type="text"
                  value={firmaRecibido}
                  onChange={(e) => setFirmaRecibido(e.target.value)}
                  placeholder="Ej. Pedro Pérez L. - Firma Digital"
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-3 font-mono"
                />
              </div>

              <div className="sm:col-span-3 flex items-end justify-end">
                <button
                  type="button"
                  onClick={handleAddFila}
                  className="bg-[#8ec23f] hover:bg-[#7ba834] text-white text-[11px] font-bold py-2 px-3 rounded flex items-center gap-1.5 hover:shadow transition cursor-pointer w-full justify-center"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Colaborante
                </button>
              </div>
            </div>
          </div>

          {filas.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1A1C1E] text-white text-[9px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Colaborante</th>
                    <th className="py-2.5 px-2">Puesto</th>
                    <th className="py-2.5 px-2 text-center">Talla Filip.</th>
                    <th className="py-2.5 px-2 text-center">Talla Pantл.</th>
                    <th className="py-2.5 px-2 text-center">Botas No.</th>
                    <th className="py-2.5 px-2 text-center">EPP OK</th>
                    <th className="py-2.5 px-3 font-mono">Firma</th>
                    <th className="py-2.5 px-2 text-center">Rem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-xs">
                  {filas.map((f, i) => {
                    const eppCount = [f.tieneMandil, f.tieneGuantes, f.tieneCareta].filter(Boolean).length;
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-medium text-slate-900">{f.colaborador}</td>
                        <td className="py-2 px-2 text-slate-500 font-sans text-[11px]">{f.puesto.split(' ')[0]}...</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-600">{f.tallaCamisa}</td>
                        <td className="py-2 px-2 text-center font-mono text-indigo-600">{f.tallaPantalon}</td>
                        <td className="py-2 px-2 text-center font-mono text-emerald-700 font-bold">{f.tallaBotas}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${eppCount === 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {eppCount}/3 EPP
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[10px] truncate max-w-[100px]">{f.firmaRecibido}</td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoverFila(i)}
                            className="text-red-500 hover:text-red-800 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Novedades o Acuerdos sobre Seguridad</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Describa devoluciones de botas defectuosas por fabricante, tallas agotadas o solicitudes de impermeables en época de lluvias."
              rows={3}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none"
            />
          </div>

          {msg.text && (
            <div className={`p-3 rounded text-xs flex items-center gap-2 ${msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{msg.text}</span>
            </div>
          )}

          <div className="text-right">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1A1C1E] hover:bg-[#2D2F31] disabled:opacity-50 text-white text-xs font-bold px-6 py-2 rounded transition cursor-pointer font-sans"
            >
              {saving ? 'Guardando...' : 'Guardar Formulario F-OPR-13'}
            </button>
          </div>
        </form>

        {/* Right historical reports columns */}
        <div className="lg:col-span-4 bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 col-span-3">
              <Calendar className="w-4 h-4 text-[#8ec23f]" /> Entregas Completas Recientes
            </h3>
            <span className="bg-[#8ec23f]/15 text-[#6c9c22] font-mono text-[9px] px-2 py-0.5 rounded font-bold">LIVE</span>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1C1E] mx-auto"></div>
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-10 bg-white rounded border border-dashed border-slate-200 text-slate-400">
              <Info className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs mt-2">No se han registrado entregas de uniformes hoy.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {registros.map((reg) => (
                <div key={reg.id} className="bg-white p-4 rounded border border-slate-200 shadow-xs hover:border-slate-300 transition animate-fade-in">
                  <div className="flex justify-between items-start gap-1">
                    <div>
                      <span className="font-mono text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-bold">F-OPR-000-13</span>
                      <h4 className="text-xs font-bold text-slate-900 mt-2">{reg.fecha}</h4>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-mono mt-1 pt-1.5 border-t border-slate-100">
                    SGC: <span className="font-sans text-slate-700 font-bold">{reg.responsableEntrega}</span>
                  </p>

                  <div className="mt-3 space-y-1 text-[10px] font-mono bg-slate-50 p-2 rounded border border-slate-100">
                    {reg.filas?.map((f, ind) => (
                      <div key={ind} className="flex justify-between items-center text-slate-700">
                        <span className="font-medium font-sans text-slate-900">{f.colaborador}</span>
                        <span className="bg-blue-50 text-blue-700 px-1.5 rounded text-[9px] font-bold">Botas: {f.tallaBotas}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] italic text-slate-500 truncate mt-2">"{reg.observaciones}"</p>

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
                      onClick={() => generateAndDownloadPDF('control_uniformes', reg)}
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
        elaboroCargo="Supervisor de Higiene, Seguridad y EPP"
        revisoCargo="Comité de Calidad y Seguridad"
        aproboCargo="Gerente Comercial Industrial"
        cambios={[
          {
            version: '1.0',
            fecha: '15/06/2026',
            seccion: 'Todas',
            cambio: 'Lanzamiento del formato de uniformes de planta',
            solicitante: 'Comité de Calidad'
          }
        ]}
      />
    </div>
  );
}
