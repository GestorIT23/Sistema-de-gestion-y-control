import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraInventariosSGC, FilaInventarioSGC } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Plus, Trash2, Database, ShieldCheck, Info, AlertCircle, FileSpreadsheet, FileText, CheckCircle, Flame } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraInventariosSGCModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraInventariosSGC[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [areaFisica, setAreaFisica] = useState('Bodega General de Operaciones');
  const [responsable, setResponsable] = useState(userEmail || '');
  const [observaciones, setObservaciones] = useState('');

  // Table rows
  const [filas, setFilas] = useState<FilaInventarioSGC[]>([]);

  // Row creation inputs
  const [codigoInsumo, setCodigoInsumo] = useState('INS-SGC-01');
  const [descripcion, setDescripcion] = useState('Indicadores Biológicos de Vapor (Autoclave)');
  const [medida, setMedida] = useState('Cada Caja/100u');
  const [stockMinimo, setStockMinimo] = useState(10);
  const [existenciaReal, setExistenciaReal] = useState(15);
  const [estadoEmpaque, setEstadoEmpaque] = useState<'Buen estado' | 'Dañado' | 'Por vencer'>('Buen estado');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_inventarios_sgc'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraInventariosSGC[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraInventariosSGC);
      });
      setRegistros(docs);
    } catch (e) {
      console.error('Error fetching registers:', e);
      const fallback = localStorage.getItem('biotrash_inventarios_sgc_bk');
      if (fallback) {
        setRegistros(JSON.parse(fallback));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddFila = () => {
    if (!codigoInsumo || !descripcion || stockMinimo < 0 || existenciaReal < 0) {
      setMsg({ text: 'Por favor complete todos los campos de insumo.', type: 'error' });
      return;
    }
    setFilas([
      ...filas,
      {
        codigoInsmo: codigoInsumo,
        descripcion,
        medida,
        stockMinimo,
        existenciaReal,
        estadoEmpaque,
      }
    ]);
    // Reset additions inputs
    setCodigoInsumo('INS-SGC-' + Math.floor(Math.random() * 90 + 10));
    setDescripcion('');
    setStockMinimo(5);
    setExistenciaReal(10);
    setEstadoEmpaque('Buen estado');
    setMsg({ text: '', type: '' });
  };

  const handleRemoverFila = (idx: number) => {
    setFilas(filas.filter((_, i) => i !== idx));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filas.length === 0) {
      setMsg({ text: 'Debe ingresar al menos un insumo en la auditoría.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Almacenando en Firebase...', type: 'info' });

    const nuevoRegistro: BitacoraInventariosSGC = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      areaFisica,
      responsable,
      observaciones: observaciones || 'Inventario revisado. Todos los empaques cuadran.',
      filas,
      elaboro: 'Supervisor de Logística e Insumos',
      reviso: 'Coordinador SGC de Auditoría',
      aprobo: 'Dirección Operativa de Planta',
      cambioControl: [
        {
          version: '1.0',
          fecha: '13/06/2026',
          seccion: 'Todas',
          cambio: 'Creación de la bitácora de inventario SGC bajo norma ISO 14001',
          solicitante: 'Comité de Calidad'
        }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_inventarios_sgc'), nuevoRegistro);
      setMsg({ text: '¡Bitácora SGC guardada exitosamente!', type: 'success' });
      setFilas([]);
      setObservaciones('');
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const currentBackup = [nuevoRegistro, ...registros];
      localStorage.setItem('biotrash_inventarios_sgc_bk', JSON.stringify(currentBackup));
      setRegistros(currentBackup);
      setMsg({ text: 'Guardado de contingencia en almacenamiento local.', type: 'success' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (reg: BitacoraInventariosSGC) => {
    generateAndDownloadExcel('inventarios_sgc', reg);
  };

  return (
    <div id="bitacora-inventarios-sgc-root" className="max-w-7xl mx-auto px-4 py-4 space-y-6 animate-fade-in text-slate-800">
      
      {/* Upper action block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-[#1A1C1E] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Tablero
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> ISO 14001 Compliant
        </div>
      </div>

      <FormHeader 
        titulo="BITÁCORA DE CONTROL DE INVENTARIOS E INSUMOS SGC"
        codigo="BIOTRASH 4.0. F-OPR-000-12"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Input Form */}
        <form onSubmit={handleGuardar} className="lg:col-span-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5 font-sans">
            <Database className="w-4 h-4 text-blue-600" /> Auditoría de Existencias SGC
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Auditoría</label>
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Área Física / Bodega</label>
              <select
                value={areaFisica}
                onChange={(e) => setAreaFisica(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Bodega General de Operaciones">Bodega General de Operaciones</option>
                <option value="Laboratorio Químico-Biológico">Laboratorio Químico-Biológico SGC</option>
                <option value="Rampa de Carga y Pesaje">Andén / Rampa de Carga</option>
                <option value="Oficina de Seguridad Industrial">Oficinas y Seguridad Industrial (EPP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Coordinador Auditor</label>
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

          {/* SubForm Row Insertion */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-500" /> Registrar Existencia Física
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Código Item</label>
                <input
                  type="text"
                  value={codigoInsumo}
                  onChange={(e) => setCodigoInsumo(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2.5 font-mono"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Descripción de Material o Reactivo</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Cinta Autoadhesiva Test Autoclave, Filtros Carbón..."
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2.5 font-sans"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Medida</label>
                <input
                  type="text"
                  value={medida}
                  onChange={(e) => setMedida(e.target.value)}
                  placeholder="Ej. Galón, Caja x 100u, Par"
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2.5"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">St. Seguridad (Min)</label>
                <input
                  type="number"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2 font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Existencia Real</label>
                <input
                  type="number"
                  value={existenciaReal}
                  onChange={(e) => setExistenciaReal(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2 font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Estado Material</label>
                <select
                  value={estadoEmpaque}
                  onChange={(e) => setEstadoEmpaque(e.target.value as any)}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2"
                >
                  <option value="Buen estado">Buen estado (OK)</option>
                  <option value="Por vencer">Por vencer</option>
                  <option value="Dañado">Dañado / Derrame</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex items-end justify-end">
                <button
                  type="button"
                  onClick={handleAddFila}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 px-3 rounded flex items-center gap-1 mr-1 transition shadow cursor-pointer justify-center w-full"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Item
                </button>
              </div>
            </div>
          </div>

          {/* Current Table Grid */}
          {filas.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1A1C1E] text-white text-[9px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">SKU / Cód</th>
                    <th className="py-2.5 px-2">Descripción</th>
                    <th className="py-2.5 px-2">Ud. Medida</th>
                    <th className="py-2.5 px-2 text-right">Mínimo</th>
                    <th className="py-2.5 px-2 text-right">Existencia</th>
                    <th className="py-2.5 px-2 text-center">Estado</th>
                    <th className="py-2.5 px-2 text-center">Alerta</th>
                    <th className="py-2.5 px-2 text-center">Elim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filas.map((f, i) => {
                    const isShortage = f.existenciaReal < f.stockMinimo;
                    return (
                      <tr key={i} className={`hover:bg-slate-50 transition ${isShortage ? 'bg-amber-50/45' : ''}`}>
                        <td className="py-2 px-3 text-blue-600 font-bold">{f.codigoInsmo}</td>
                        <td className="py-2 px-2 font-sans font-medium text-slate-800">{f.descripcion}</td>
                        <td className="py-2 px-2 text-slate-500 font-sans">{f.medida}</td>
                        <td className="py-2 px-2 text-right text-slate-600 font-semibold">{f.stockMinimo}</td>
                        <td className="py-2 px-2 text-right font-extrabold text-slate-900">{f.existenciaReal}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold capitalize ${
                            f.estadoEmpaque === 'Buen estado' ? 'bg-emerald-50 text-emerald-700' :
                            f.estadoEmpaque === 'Por vencer' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {f.estadoEmpaque}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {isShortage ? (
                            <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black animate-pulse flex items-center justify-center gap-0.5 mx-auto w-max">
                              <AlertCircle className="w-2.5 h-2.5 shrink-0" /> BAJO MÍNIMO
                            </span>
                          ) : (
                            <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold">SUFICIENTE</span>
                          )}
                        </td>
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
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones o Alertas Generales</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Describa si se necesita emitir una orden de compra urgente de reactivos, EPP, bolsas plásticas, desinfectantes o repuestos de la trituradora."
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
              className="bg-[#1A1C1E] hover:bg-[#2D2F31] disabled:opacity-50 text-white text-xs font-bold px-6 py-2 rounded transition cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar Formulario SGC-12'}
            </button>
          </div>
        </form>

        {/* Right Log column */}
        <div className="lg:col-span-4 bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 col-span-3">
              <Calendar className="w-4 h-4 text-[#8ec23f]" /> Registro Auditoría SGC
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
              <p className="text-xs mt-2">No se han guardado auditorías SGC hoy.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {registros.map((reg) => (
                <div key={reg.id} className="bg-white p-4 rounded border border-slate-200 shadow-xs hover:border-slate-300 transition animate-fade-in">
                  <div className="flex justify-between items-start gap-1">
                    <div>
                      <span className="font-mono text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">F-OPR-000-12</span>
                      <h4 className="text-xs font-bold text-slate-900 mt-2">{reg.fecha}</h4>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-mono mt-1 pt-1.5 border-t border-slate-100">
                    Bodega: <span className="font-sans text-slate-700 font-bold">{reg.areaFisica.split(' ')[0]}</span>
                  </p>

                  <div className="mt-3 space-y-1 text-[10px] font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                    {reg.filas?.map((f, ind) => {
                      const shortage = f.existenciaReal < f.stockMinimo;
                      return (
                        <div key={ind} className="flex justify-between items-center">
                          <span className="truncate max-w-[150px]" title={f.descripcion}>{f.descripcion}</span>
                          <span className={`font-bold px-1 rounded ${shortage ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-800'}`}>
                            {f.existenciaReal} u
                          </span>
                        </div>
                      );
                    })}
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
                      onClick={() => generateAndDownloadPDF('inventarios_sgc', reg)}
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
        elaboroCargo="Supervisor de Logística e Insumos"
        revisoCargo="Coordinador SGC de Auditoría"
        aproboCargo="Dirección Operativa de Planta"
        cambios={[
          {
            version: '1.0',
            fecha: '13/06/2026',
            seccion: 'Todas',
            cambio: 'Creación de la bitácora de inventario SGC bajo norma ISO 14001',
            solicitante: 'Comité de Calidad'
          }
        ]}
      />
    </div>
  );
}
