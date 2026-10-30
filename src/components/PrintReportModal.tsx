import React from 'react';
import { Printer, Download, X, FileText, CheckCircle2 } from 'lucide-react';

export interface ReportColumn {
  header: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface ReportSummaryCard {
  label: string;
  value: string;
  subtext?: string;
  isHighlight?: boolean;
}

export interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  categoryBadge?: string;
  summaryCards?: ReportSummaryCard[];
  columns: ReportColumn[];
  rows: (string | number)[][];
  footerRow?: (string | number)[];
  notes?: string;
  downloadFilename?: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  categoryBadge,
  summaryCards,
  columns,
  rows,
  footerRow,
  notes,
  downloadFilename,
}) => {
  if (!isOpen) return null;

  const nowStr = new Date().toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    let csv = `"${title}"\n`;
    if (subtitle) csv += `"${subtitle}"\n`;
    csv += `"Emitido el: ${nowStr}"\n\n`;

    if (summaryCards && summaryCards.length > 0) {
      csv += summaryCards.map((c) => `"${c.label}: ${c.value}"`).join(',') + '\n\n';
    }

    csv += columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',') + '\n';

    rows.forEach((row) => {
      csv += row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    if (footerRow) {
      csv += footerRow.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename || `${title.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* On-Screen Modal Top Bar */}
        <div className="p-4 sm:px-6 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-white">{title}</h3>
                {categoryBadge && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {categoryBadge}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-stone-400 font-medium">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold transition-all cursor-pointer"
              title="Descargar datos en formato CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
              title="Imprimir documento o Guardar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Reporte</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="Cerrar vista"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Area (Also serves as Print Target via #printable-report) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-900/60 space-y-6">
          <div id="printable-report" className="space-y-4">
            
            {/* Report Header for Paper & Screen */}
            <div className="border-b border-stone-800 pb-4 flex flex-wrap items-start justify-between gap-3 text-left">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🍗</span>
                  <span className="text-xl font-black tracking-tight text-white print:text-black">
                    TERRENO BROASTER
                  </span>
                </div>
                <p className="text-xs text-stone-400 print:text-gray-600 mt-0.5">
                  Sistema POS & Gestión Gastronómica • Terreno Broaster C.A.
                </p>
                <h2 className="text-base sm:text-lg font-black text-amber-400 print:text-black mt-2">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs font-semibold text-stone-300 print:text-gray-700">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="text-right text-xs text-stone-400 print:text-gray-600 font-mono space-y-0.5">
                <div>Fecha de emisión: <strong>{nowStr}</strong></div>
                <div>Filas en reporte: <strong>{rows.length}</strong></div>
              </div>
            </div>

            {/* Summary Cards */}
            {summaryCards && summaryCards.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {summaryCards.map((card, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border text-left ${
                      card.isHighlight
                        ? 'bg-amber-500/10 border-amber-500/30 print:border-gray-400 print:bg-gray-100'
                        : 'bg-stone-950/80 border-stone-800 print:border-gray-300 print:bg-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 print:text-gray-600">
                      {card.label}
                    </div>
                    <div
                      className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
                        card.isHighlight ? 'text-amber-400 print:text-black' : 'text-stone-100 print:text-black'
                      }`}
                    >
                      {card.value}
                    </div>
                    {card.subtext && (
                      <div className="text-[10px] text-stone-400 print:text-gray-500 mt-0.5">
                        {card.subtext}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Data Table */}
            <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow-xl print:border-gray-300 print:shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 print:bg-gray-100 print:text-black font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      {columns.map((col, idx) => (
                        <th
                          key={idx}
                          className={`py-3 px-3.5 ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          } ${col.className || ''}`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80 print:divide-gray-200">
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="py-10 text-center text-stone-500 print:text-gray-500 italic"
                        >
                          No se encontraron registros para los criterios seleccionados.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-stone-800/40 print:hover:bg-transparent transition-colors"
                        >
                          {row.map((cell, cIdx) => {
                            const col = columns[cIdx];
                            const isRight = col?.align === 'right';
                            const isCenter = col?.align === 'center';
                            return (
                              <td
                                key={cIdx}
                                className={`py-2.5 px-3.5 ${
                                  isRight
                                    ? 'text-right font-mono'
                                    : isCenter
                                    ? 'text-center font-mono'
                                    : 'text-left'
                                } text-stone-200 print:text-black`}
                              >
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                  {footerRow && footerRow.length > 0 && (
                    <tfoot className="bg-stone-900 border-t-2 border-stone-700 print:bg-gray-100 print:border-gray-400 font-bold">
                      <tr>
                        {footerRow.map((fCell, idx) => {
                          const col = columns[idx];
                          const isRight = col?.align === 'right';
                          const isCenter = col?.align === 'center';
                          return (
                            <td
                              key={idx}
                              className={`py-3 px-3.5 ${
                                isRight
                                  ? 'text-right font-mono'
                                  : isCenter
                                  ? 'text-center font-mono'
                                  : 'text-left'
                              } text-stone-100 print:text-black text-xs font-black`}
                            >
                              {fCell}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Optional Notes */}
            {notes && (
              <div className="text-[11px] text-stone-400 print:text-gray-600 bg-stone-950/60 p-3 rounded-xl border border-stone-800/80 print:border-gray-200">
                <span className="font-bold">Observaciones: </span>
                <span>{notes}</span>
              </div>
            )}

            {/* Signature & Validation Footer for Print */}
            <div className="hidden print:flex items-center justify-between pt-12 text-xs text-gray-700 border-t border-gray-300 mt-8">
              <div className="text-center w-48">
                <div className="border-t border-black pt-1 font-bold">Elaborado por</div>
                <div className="text-[10px] text-gray-500">Administración / Inventario</div>
              </div>
              <div className="text-center w-48">
                <div className="border-t border-black pt-1 font-bold">Revisado y Aprobado</div>
                <div className="text-[10px] text-gray-500">Gerencia General</div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center space-x-1.5 text-stone-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Listo para imprimir en formato A4 o Ticket Carta.</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
