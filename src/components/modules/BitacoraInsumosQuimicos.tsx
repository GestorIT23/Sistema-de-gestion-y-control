import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BitacoraInsumosQuimicos, FilaInsumoQuimico } from '../../types';
import FormHeader from '../FormHeader';
import FormFooter from '../FormFooter';
import { Calendar, User, ArrowLeft, Plus, Trash2, Database, ShieldCheck, Info, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react';
import { generateAndDownloadPDF } from '../../utils/pdfGenerator';
import { generateAndDownloadExcel } from '../../utils/excelGenerator';

interface Props {
  onBack: () => void;
  userEmail: string;
}

export default function BitacoraInsumosQuimicosModule({ onBack, userEmail }: Props) {
  const [registros, setRegistros] = useState<BitacoraInsumosQuimicos[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Form Fields
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState('Día');
  const [responsable, setResponsable] = useState(userEmail || '');
  const [observaciones, setObservaciones] = useState('');

  // Table rows
  const [filas, setFilas] = useState<FilaInsumoQuimico[]>([]);

  // Add row fields
  const [nuevoProducto, setNuevoProducto] = useState('Bolsas Rojas Plásticas (Calibre 200)');
  const [medida, setMedida] = useState('Unidades');
  const [stockInicial, setStockInicial] = useState(250);
  const [unidadesRecibidas, setUnidadesRecibidas] = useState(0);
  const [unidadesConsumidas, setUnidadesConsumidas] = useState(35);
  const [lote, setLote] = useState('LT-2025-XQ4');

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_insumos_quimicos'), orderBy('fechaRegistro', 'desc'), limit(15));
      const querySnapshot = await getDocs(q);
      const docs: BitacoraInsumosQuimicos[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as BitacoraInsumosQuimicos);
      });
      setRegistros(docs);
    } catch (e) {
      console.error('Error fetching registers:', e);
      const fallback = localStorage.getItem('biotrash_insumos_quimicos_bk');
      if (fallback) {
        setRegistros(JSON.parse(fallback));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddFila = () => {
    if (!nuevoProducto || stockInicial < 0 || unidadesRecibidas < 0 || unidadesConsumidas < 0 || !lote) {
      setMsg({ text: 'Por favor complete correctamente los campos de fila.', type: 'error' });
      return;
    }
    const finalStock = stockInicial + unidadesRecibidas - unidadesConsumidas;
    setFilas([
      ...filas,
      {
        producto: nuevoProducto,
        unidadMedida: medida,
        stockInicial,
        unidadesRecibidas,
        unidadesConsumidas,
        stockFinal: finalStock,
        noLoteProveedor: lote,
      }
    ]);
    // Reset additions fields
    setStockInicial(0);
    setUnidadesRecibidas(0);
    setUnidadesConsumidas(0);
    setLote('LT-2025-X');
    setMsg({ text: '', type: '' });
  };

  const handleRemoverFila = (idx: number) => {
    setFilas(filas.filter((_, i) => i !== idx));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filas.length === 0) {
      setMsg({ text: 'Debe ingresar al menos un insumo en la tabla de control.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Guardando datos en Firebase...', type: 'info' });

    const nuevoRegistro: BitacoraInsumosQuimicos = {
      fechaRegistro: new Date().toISOString(),
      fecha,
      turno,
      responsable,
      observaciones: observaciones || 'Control ordinario de consumibles. Inventarios cuadrando.',
      filas,
      elaboro: 'Supervisor de Planta e Inventarios',
      reviso: 'Coordinador SGI de Operaciones',
      aprobo: 'Gerente General',
      cambioControl: [
        {
          version: '1.0',
          fecha: '15/06/2025',
          seccion: 'Todas',
          cambio: 'Lanzamiento del formato de control químico-plástico',
          solicitante: 'Comité de Inventarios'
        }
      ]
    };

    try {
      await addDoc(collection(db, 'bitacora_insumos_quimicos'), nuevoRegistro);
      setMsg({ text: '¡Registro guardado exitosamente!', type: 'success' });
      setFilas([]);
      setObservaciones('');
      fetchRegistros();
    } catch (err) {
      console.error(err);
      const currentBackup = [nuevoRegistro, ...registros];
      localStorage.setItem('biotrash_insumos_quimicos_bk', JSON.stringify(currentBackup));
      setRegistros(currentBackup);
      setMsg({ text: 'Se ha guardado localmente el formulario por prevención.', type: 'success' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = (reg: BitacoraInsumosQuimicos) => {
    generateAndDownloadExcel('insumos_quimicos', reg);
  };

  return (
    <div id="bitacora-insumos-quimicos-root" className="max-w-7xl mx-auto px-4 py-4 space-y-6 animate-fade-in text-slate-800">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-[#1A1C1E] flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al Tablero
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> ISO 9001:2015 Certificado
        </div>
      </div>

      <FormHeader 
        titulo="BITÁCORA DE CONTROL DE INSUMOS QUÍMICOS Y PLÁSTICOS"
        codigo="BIOTRASH 4.0. F-OPR-000-11"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form Panel */}
        <form onSubmit={handleGuardar} className="lg:col-span-8 bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5 font-sans">
            <Database className="w-4 h-4 text-blue-600" /> Nuevo Reporte de Insumos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Reporte</label>
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turno</label>
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Encargado SGC</label>
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

          {/* Sub-form: Row addition */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase border-b border-slate-200 pb-1.5">
              Fórmula de Gestión de Fila
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Producto Consumible / Químico</label>
                <select
                  value={nuevoProducto}
                  onChange={(e) => setNuevoProducto(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Bolsas Rojas Plásticas (Calibre 200)">Bolsas Rojas Plásticas (Calibre 200)</option>
                  <option value="Bolsas Amarillas Patológico (Calibre 200)">Bolsas Amarillas Patológico (Calibre 200)</option>
                  <option value="Bolsas Negras Desechos Comunes">Bolsas Negras Desechos Comunes</option>
                  <option value="Cloro Industrial Líquido al 5%">Cloro Industrial Líquido al 5%</option>
                  <option value="Amonio Cuaternario Concentrado">Amonio Cuaternario Concentrado</option>
                  <option value="Alcohol Isopropílico Desinfectante">Alcohol Isopropílico Desinfectante</option>
                  <option value="Contenedores Plásticos Rojos 15L">Contenedores Plásticos Rojos 15L</option>
                  <option value="Film Stretch Transparente de Embalar">Film Stretch Transparente de Embalar</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Medida</label>
                <select
                  value={medida}
                  onChange={(e) => setMedida(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2.5"
                >
                  <option value="Unidades">Unidades</option>
                  <option value="Galón">Galón</option>
                  <option value="Rollo">Rollo / Bobina</option>
                  <option value="Kilogramo">Kilogramo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">St. Inicial (Inv.)</label>
                <input
                  type="number"
                  value={stockInicial}
                  onChange={(e) => setStockInicial(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Entradas</label>
                <input
                  type="number"
                  value={unidadesRecibidas}
                  onChange={(e) => setUnidadesRecibidas(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Salidas / Despachos</label>
                <input
                  type="number"
                  value={unidadesConsumidas}
                  onChange={(e) => setUnidadesConsumidas(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">N° Lote / Proveedor</label>
                <input
                  type="text"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  placeholder="Ej. LOT-55-992"
                  className="w-full text-xs bg-white border border-slate-200 rounded py-1.5 px-2.5 font-mono"
                />
              </div>

              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={handleAddFila}
                  className="bg-[#8ec23f] hover:bg-[#7ba834] text-white text-[11px] font-bold py-2 px-4 rounded flex items-center gap-1.5 transition shadow cursor-pointer w-full justify-center"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Item
                </button>
              </div>
            </div>
          </div>

          {/* Current Table Rows */}
          {filas.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1A1C1E] text-white text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-2 text-center">Unidad</th>
                    <th className="py-2.5 px-2 text-right">Inicial</th>
                    <th className="py-2.5 px-2 text-right">Entradas</th>
                    <th className="py-2.5 px-2 text-right">Salidas</th>
                    <th className="py-2.5 px-2 text-right bg-emerald-900 border-r border-[#2D2F31]">Calculado</th>
                    <th className="py-2.5 px-3">Lote</th>
                    <th className="py-2.5 px-2 text-center">Rem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filas.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-sans font-medium text-slate-900">{f.producto}</td>
                      <td className="py-2 px-2 text-center text-slate-500">{f.unidadMedida}</td>
                      <td className="py-2 px-2 text-right text-slate-600">{f.stockInicial}</td>
                      <td className="py-2 px-2 text-right text-indigo-600 font-bold">+{f.unidadesRecibidas}</td>
                      <td className="py-2 px-2 text-right text-rose-600 font-bold">-{f.unidadesConsumidas}</td>
                      <td className="py-2 px-2 text-right bg-emerald-50 text-emerald-800 font-extrabold border-r border-slate-100">{f.stockFinal}</td>
                      <td className="py-2 px-3 text-slate-500 text-[10px]">{f.noLoteProveedor}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones / Anomalías de la Bitácora</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Describa diferencias, mermas de plástico, botes rotos, o devoluciones de químicos por mal estado."
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
              {saving ? 'Guardando...' : 'Guardar Formulario F-OPR-11'}
            </button>
          </div>
        </form>

        {/* Right Log column */}
        <div className="lg:col-span-4 bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 col-span-3">
              <Calendar className="w-4 h-4 text-[#8ec23f]" /> Registro Diario Histórico
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
              <p className="text-xs mt-2">No se han guardado reportes de insumos hoy.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {registros.map((reg) => (
                <div key={reg.id} className="bg-white p-4 rounded border border-slate-200 shadow-xs hover:border-slate-300 transition">
                  <div className="flex justify-between items-start gap-1">
                    <div>
                      <span className="font-mono text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">F-OPR-000-11</span>
                      <h4 className="text-xs font-bold text-slate-900 mt-2">{reg.fecha}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Turno: {reg.turno}</span>
                  </div>

                  <p className="text-[10px] text-slate-500 font-mono mt-1 pt-1.5 border-t border-slate-100">
                    SGC: {reg.responsable}
                  </p>

                  <div className="mt-3 space-y-1.5 text-[10px] font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                    {reg.filas?.map((f, ind) => (
                      <div key={ind} className="flex justify-between items-center">
                        <span className="truncate font-sans font-medium text-slate-800 max-w-[120px]">{f.producto}</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-1 rounded">St. F: {f.stockFinal}</span>
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
                      onClick={() => generateAndDownloadPDF('insumos_quimicos', reg)}
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
        elaboroCargo="Supervisor de Planta e Inventarios"
        revisoCargo="Coordinador SGI de Operaciones"
        aproboCargo="Gerente General"
        cambios={[
          {
            version: '1.0',
            fecha: '15/06/2025',
            seccion: 'Todas',
            cambio: 'Lanzamiento del formato de control químico-plástico',
            solicitante: 'Comité de Inventarios'
          }
        ]}
      />
    </div>
  );
}
