import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraInventarios, FilaInventario } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, Clock, Plus, Trash2, ArrowLeft, Download, CheckCircle, Database, FileText, FileSpreadsheet } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraInventariosModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraInventarios[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState('Día');
  const [area, setArea] = useState('Almacén Principal');
  const [responsable, setResponsable] = useState(userEmail || 'Ing. de Procesos');
  const [observaciones, setObservaciones] = useState('');
  
  // Table Rows (starts with blank entries)
  const [filas, setFilas] = useState<FilaInventario[]>([]);

  const [nuevaHora, setNuevaHora] = useState('');
  const [nuevoProducto, setNuevoProducto] = useState('Bioinfeccioso Inorganico');
  const [useCustomProducto, setUseCustomProducto] = useState(false);
  const [nuevaCantidad, setNuevaCantidad] = useState(0);
  const [nuevaFirma, setNuevaFirma] = useState('');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_inventarios'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraInventarios[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraInventarios);
      });
      setRegistros(docs);
    } catch (e) {
      console.error('Error fetching registers:', e);
      // Fallback local storage for resilience
      const fallback = localStorage.getItem('biotrash_inv_bk');
      if (fallback) {
        setRegistros(JSON.parse(fallback));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddFila = () => {
    if (!nuevaHora || !nuevoProducto || nuevaCantidad <= 0 || !nuevaFirma) {
      setMsg({ text: 'Por favor complete todos los campos de la nueva fila.', type: 'error' });
      return;
    }
    setFilas([...filas, { hora: nuevaHora, producto: nuevoProducto, cantidad: nuevaCantidad, firma: nuevaFirma }]);
    setNuevaHora('');
    setNuevoProducto('Bioinfeccioso Inorganico');
    setUseCustomProducto(false);
    setNuevaCantidad(0);
    setNuevaFirma('');
    setMsg({ text: '', type: '' });
  };

  const handleRemoverFila = (idx: number) => {
    setFilas(filas.filter((_, i) => i !== idx));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filas.length === 0) {
      setMsg({ text: 'Debe ingresar al menos un producto en la bitácora.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Guardando en la base de datos de Firebase...', type: 'info' });

    const nuevoRegistro: BitacoraInventarios = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      turno,
      area,
      responsable,
      observaciones,
      filas,
      elaboro: 'Gerente Comercial Industrial',
      reviso: 'Comité ISO',
      aprobo: 'Gerente General',
      cambioControl: [
        { version: '1.0', fecha: '13/06/2026', seccion: 'Todas', cambio: 'Creación del formato inicial bajo norma ISO 14001', solicitante: 'Comité de Calidad' }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_inventarios'), nuevoRegistro);
      generateAndDownloadPDF('inventarios', nuevoRegistro);
      setMsg({ text: 'La bitácora se ha guardado exitosamente en Firestore y se ha generado el reporte PDF oficial SGC.', type: 'success' });
      setObservaciones('');
      setFilas([]);
      fetchRegistros();
    } catch (err) {
      console.error('Error saving document:', err);
      // Local backup strategy
      const updatedList = [nuevoRegistro, ...registros];
      setRegistros(updatedList);
      localStorage.setItem('biotrash_inv_bk', JSON.stringify(updatedList));
      generateAndDownloadPDF('inventarios', nuevoRegistro);
      setMsg({ text: 'Guardado localmente y PDF generado con éxito. La base de datos no está disponible temporalmente.', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (registro: BitacoraInventarios) => {
    generateAndDownloadExcel('inventarios', registro);
  };

  return (
    <div id="bitacora-inventario-root" className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Back & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-dashboard"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Tablero Principal
        </button>
        <span className="text-[11px] font-semibold uppercase font-mono tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Módulo de Control F-OPR-000 / Format N° 1
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Creator Section */}
        <div className="lg:col-span-2 space-y-6">
          <form id="bitacora-inventario-form" onSubmit={handleGuardar} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            
            {/* Paper Header Clone */}
            <FormHeader titulo="Bitácora de Inventarios e Insumos" />

            {/* Sub-Header Metadata Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Fecha:</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    id="date-input"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded text-xs pl-9 pr-2.5 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Turno:</label>
                <select
                  id="turno-select"
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Día">Día (Matutino)</option>
                  <option value="Tarde">Tarde (Vespertino)</option>
                  <option value="Noche">Noche (Nocturno)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Área:</label>
                <input
                  id="area-input"
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Responsable:</label>
                <input
                  id="responsable-input"
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded text-xs px-2.5 py-2 outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Grid Form Row Creator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Registro de Movimientos de Insumos</h3>
                <span className="text-[10px] text-slate-400">Inserte filas para alimentar el formato</span>
              </div>

              {/* Temporary Inputs to Add to Sub-table */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-[#f8fbfa] border border-[#e2eff0] rounded-lg items-end">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Hora</label>
                  <input
                    id="new-hora"
                    type="time"
                    value={nuevaHora}
                    onChange={(e) => setNuevaHora(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none"
                  />
                </div>
                <div className="sm:col-span-5 space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Producto / Insumo</label>
                  {useCustomProducto ? (
                    <div className="flex gap-1.5">
                      <input
                        id="new-producto"
                        type="text"
                        value={nuevoProducto}
                        onChange={(e) => setNuevoProducto(e.target.value)}
                        placeholder="Escriba el producto/insumo..."
                        className="flex-1 bg-white border border-emerald-300 rounded text-xs px-2 py-1.5 outline-none font-medium text-slate-800"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomProducto(false);
                          setNuevoProducto('Bioinfeccioso Inorganico');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-250 text-slate-600 rounded text-[10px] font-medium border border-slate-205 transition"
                        title="Ver lista predefinida"
                      >
                        Lista
                      </button>
                    </div>
                  ) : (
                    <select
                      id="new-producto"
                      value={nuevoProducto}
                      onChange={(e) => {
                        if (e.target.value === '__OTRO__') {
                          setUseCustomProducto(true);
                          setNuevoProducto('');
                        } else {
                          setNuevoProducto(e.target.value);
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none font-medium text-slate-800"
                    >
                      <option value="Bioinfeccioso Inorganico">Bioinfeccioso Inorganico</option>
                      <option value="Organo patologico">Organo patologico</option>
                      <option value="Punzocortante">Punzocortante</option>
                      <option value="__OTRO__">✏️ Agregar / Escribir otro...</option>
                    </select>
                  )}
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Cantidad</label>
                  <input
                    id="new-cantidad"
                    type="number"
                    value={nuevaCantidad}
                    onChange={(e) => setNuevaCantidad(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Firma</label>
                  <input
                    id="new-firma"
                    type="text"
                    value={nuevaFirma}
                    onChange={(e) => setNuevaFirma(e.target.value)}
                    placeholder="Firma/Cod"
                    className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none"
                  />
                </div>
                <div className="sm:col-span-1">
                  <button
                    id="btn-add-row"
                    type="button"
                    onClick={handleAddFila}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded p-2 flex items-center justify-center transition focus:outline-none"
                    title="Añadir Fila"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Render Current Table Grid */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table id="insumos-current-table" className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-200 text-slate-700 uppercase p-2 font-semibold text-[10px]">
                    <tr>
                      <th className="px-4 py-2 border-r border-slate-300 w-1/6">Hora</th>
                      <th className="px-4 py-2 border-r border-slate-300">Producto</th>
                      <th className="px-4 py-2 border-r border-slate-300 w-24 text-center">Cantidad</th>
                      <th className="px-4 py-2 border-r border-slate-300 w-32">Firma Autoriza</th>
                      <th className="px-2 py-2 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filas.map((f, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-2 border-r border-slate-200 font-mono">{f.hora}</td>
                        <td className="px-4 py-2 border-r border-slate-200 font-medium text-slate-800">{f.producto}</td>
                        <td className="px-4 py-2 border-r border-slate-200 text-center font-bold text-slate-700">{f.cantidad}</td>
                        <td className="px-4 py-2 border-r border-slate-200 italic font-medium">{f.firma}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            id={`btn-rem-row-${index}`}
                            type="button"
                            onClick={() => handleRemoverFila(index)}
                            className="text-red-500 hover:text-red-700 p-0.5 rounded focus:outline-none transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filas.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                          No hay productos añadidos en esta bitácora aún. Ingrese registros en la barra de arriba.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Obs generales */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Observaciones Generales:</label>
              <textarea
                id="observaciones-textarea"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Escriba comentarios, novedades de merma de inventario o validaciones de calidad de embalaje..."
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs md:text-sm outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Dynamic Signatures Block & ISO standard changes */}
            <FormFooter />

            {/* Action Panel */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {msg.text && (
                <div
                  id="form-feedback-msg"
                  className={`flex-1 text-xs px-4 py-2 rounded-lg font-medium ${
                    msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                    msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                    msg.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-sky-50 text-sky-800 border border-sky-100'
                  }`}
                >
                  {msg.text}
                </div>
              )}
              <button
                id="submit-register"
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm px-6 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar y Sincronizar'}
              </button>
            </div>

          </form>
        </div>

        {/* History Checklist and Stats Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-slate-950 text-slate-100 rounded-xl p-6 shadow-md border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Control del Proceso
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              De acuerdo con las regulaciones de la norma <strong>BIOTRASH ISO 14001</strong> de gestión de residuos peligrosos biológico-infecciosos (RPBI), este formato monitorea la correcta disponibilidad de bolsas y envases herméticos en las áreas designadas.
            </p>
            <div className="border-t border-slate-800 pt-4 space-y-3 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span>Total de insumos hoy:</span>
                <span className="font-bold text-emerald-400">
                  {filas.reduce((total, f) => total + f.cantidad, 0)} pzas
                </span>
              </div>
              <div className="flex justify-between">
                <span>Registros del Turno:</span>
                <span className="font-bold text-cyan-400">{turno}</span>
              </div>
              <div className="flex justify-between">
                <span>Ubicación:</span>
                <span className="font-bold text-indigo-400">{area}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Histórico en la nube
              </h3>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">Firestore</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
            ) : registros.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">
                No hay historiales digitales en el servidor correspondientes a esta bitácora todavía.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {registros.map((reg) => (
                  <div
                    key={reg.id}
                    className="border border-slate-100 hover:border-emerald-200 rounded-lg p-3 bg-slate-50 hover:bg-emerald-50/20 transition group text-xs"
                  >
                    <div className="flex items-center justify-between font-mono font-semibold text-slate-700">
                      <span>{reg.fecha}</span>
                      <span className="text-emerald-600">{reg.turno}</span>
                    </div>
                    <div className="text-slate-500 mt-1 font-mono">
                      Resp: {reg.responsable}
                    </div>
                    <div className="text-slate-400 mt-1 truncate">
                      Obs: {reg.observaciones || 'Ninguna'}
                    </div>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/50">
                      <span className="font-bold text-slate-600 text-[10px] uppercase font-mono bg-slate-200 px-1.5 py-0.5 rounded">
                        {reg.filas?.length || 0} Filas
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExportExcel(reg)}
                          className="text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-semibold text-[10px] cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-emerald-600" /> Descargar Excel
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => generateAndDownloadPDF('inventarios', reg)}
                          className="text-slate-500 hover:text-rose-700 flex items-center gap-1 font-semibold text-[10px] cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-rose-500" /> Descargar PDF (SGC)
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
