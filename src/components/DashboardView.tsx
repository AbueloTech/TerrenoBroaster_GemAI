import React, { useState, useMemo } from 'react';
import { sqliteService } from '../db/sqliteService';
import { formatPrice } from '../utils/currency';
import {
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  DollarSign,
  Receipt,
  Award,
  BarChart2,
  PieChart,
  ArrowUpRight
} from 'lucide-react';

interface DayPoint {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // Lun, Mar, etc.
  dayNumber: number; // 1 to 31
  monto: number;
  tickets: number;
  platoTop?: string;
}

export const DashboardView: React.FC = () => {
  // Current week offset: 0 is current week, -1 previous week, etc.
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<DayPoint | null>(null);

  // Compute the 7 days (Monday through Sunday) for the selected week offset
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
    // Calculate distance to current week's Monday
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday + weekOffset * 7);

    const days: DayPoint[] = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      // Query sales for this day from SQLite
      const daySales = sqliteService.getVentas(dateStr, dateStr);
      const totalDayMonto = daySales.reduce((acc, v) => acc + v.Monto, 0);

      // Find top dish for this day if available
      const dayDetails = sqliteService.getAcumuladoProductos(dateStr, dateStr);
      const topDish = dayDetails.length > 0 ? dayDetails[0].Plato : undefined;

      days.push({
        dateStr,
        dayLabel: dayNames[i],
        dayNumber: d.getDate(),
        monto: Number(totalDayMonto.toFixed(2)),
        tickets: daySales.length,
        platoTop: topDish,
      });
    }

    return days;
  }, [weekOffset]);

  // Date range label for the current week view
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 7) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.dateStr} al ${end.dateStr}`;
  }, [weekDays]);

  // Weekly KPIs
  const totalSemana = weekDays.reduce((sum, d) => sum + d.monto, 0);
  const totalTicketsSemana = weekDays.reduce((sum, d) => sum + d.tickets, 0);
  const maxDay = [...weekDays].sort((a, b) => b.monto - a.monto)[0];
  const promedioDiario = totalSemana / 7;

  // Category breakdown for selected week
  const weekStart = weekDays[0]?.dateStr;
  const weekEnd = weekDays[6]?.dateStr;
  const categoryStats = useMemo(() => {
    if (!weekStart || !weekEnd) return [];
    const prods = sqliteService.getAcumuladoProductos(weekStart, weekEnd);
    const catMap = new Map<string, number>();
    prods.forEach((p) => {
      catMap.set(p.Categoria, (catMap.get(p.Categoria) || 0) + p.MontoTotal);
    });
    return Array.from(catMap.entries()).map(([cat, total]) => ({
      categoria: cat,
      monto: total,
    }));
  }, [weekStart, weekEnd]);

  // SVG Area Chart Geometry
  const chartWidth = 720;
  const chartHeight = 260;
  const paddingX = 45;
  const paddingY = 35;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const maxMonto = Math.max(...weekDays.map((d) => d.monto), 10);
  // Scale ceiling to next nice round number
  const yCeil = Math.ceil(maxMonto * 1.15);

  const getCoordinates = (index: number, monto: number) => {
    const x = paddingX + (index / (weekDays.length - 1)) * innerWidth;
    const y = chartHeight - paddingY - (monto / yCeil) * innerHeight;
    return { x, y };
  };

  // Build SVG Path
  const points = weekDays.map((d, i) => getCoordinates(i, d.monto));

  // Build smooth cubic bezier curve
  let curvePath = '';
  let areaPath = '';
  if (points.length > 0) {
    curvePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      curvePath += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const baselineY = chartHeight - paddingY;
    areaPath = `${curvePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-stone-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h1 className="text-2xl font-black text-stone-100 flex items-center space-x-2">
            <span>Dashboard & Evolución de Ventas</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Gráfica Semanal Interactiva
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Visualice la evolución diaria del restaurante. Deslice semana a semana mediante el selector deslizante.
          </p>
        </div>

        {/* WEEK SLIDER CONTROLS */}
        <div className="flex items-center space-x-2 bg-stone-900 border border-stone-800 p-1.5 rounded-2xl shadow-lg">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
            title="Semana Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 py-1 text-center min-w-[210px]">
            <p className="text-xs font-black text-stone-100">
              {weekOffset === 0 ? 'Semana Actual' : weekOffset === -1 ? 'Semana Pasada' : `Semana (${weekOffset})`}
            </p>
            <p className="text-[11px] font-mono text-amber-400 font-semibold">{weekRangeLabel}</p>
          </div>

          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
            title="Semana Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 px-2 py-1 bg-amber-500/10 rounded-lg ml-1"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards for the chosen week */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Ventas de la Semana</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{formatPrice(totalSemana)}</p>
            <p className="text-[11px] text-stone-500 mt-0.5">En 7 días analizados</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Tickets Atendidos</p>
            <p className="text-2xl font-black text-stone-100 mt-1">{totalTicketsSemana} órdenes</p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Promedio: {formatPrice(totalTicketsSemana > 0 ? (totalSemana / totalTicketsSemana) : 0)} / ticket
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Mejor Día de Venta</p>
            <p className="text-lg font-black text-stone-100 mt-1">
              {maxDay ? `${maxDay.dayLabel} (${maxDay.dayNumber})` : 'N/A'}
            </p>
            <p className="text-[11px] text-amber-400 font-bold mt-0.5">{maxDay ? formatPrice(maxDay.monto) : '$0'}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Promedio Diario</p>
            <p className="text-2xl font-black text-stone-100 mt-1">{formatPrice(promedioDiario)}</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Estimación x 30d: {formatPrice(promedioDiario * 30)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* MAIN INTERACTIVE AREA CHART: EVOLUCIÓN DIARIA */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-stone-800/80">
          <div>
            <h3 className="text-base font-black text-stone-100 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span>Evolución Diaria de Ventas (Gráfica de Área)</span>
            </h3>
            <p className="text-xs text-stone-400">
              Desplácese entre semanas o pose el cursor sobre cada día para ver los detalles.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="text-stone-300 font-medium">Facturación ($ USD)</span>
            </div>
          </div>
        </div>

        {/* SVG Container */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto max-h-[320px] overflow-visible"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>

              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.3" />
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = chartHeight - paddingY - pct * innerHeight;
              const val = Math.round(pct * yCeil);
              return (
                <g key={pct}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="#292524"
                    strokeDasharray={pct === 0 ? '0' : '4 4'}
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 10}
                    y={y + 4}
                    fill="#78716c"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    ${val}
                  </text>
                </g>
              );
            })}

            {/* The Area Filled Path */}
            {areaPath && (
              <path d={areaPath} fill="url(#areaGradient)" />
            )}

            {/* The Top Smooth Curve Stroke */}
            {curvePath && (
              <path
                d={curvePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3.5"
                filter="url(#glow)"
                strokeLinecap="round"
              />
            )}

            {/* Interactive Data Points and X labels */}
            {weekDays.map((d, i) => {
              const { x, y } = getCoordinates(i, d.monto);
              const isHovered = hoveredPoint?.dateStr === d.dateStr;

              return (
                <g
                  key={d.dateStr}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(d)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Vertical hover guide */}
                  {isHovered && (
                    <line
                      x1={x}
                      y1={paddingY}
                      x2={x}
                      y2={chartHeight - paddingY}
                      stroke="#f59e0b"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Circle dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 7 : 5}
                    fill={isHovered ? '#fbbf24' : '#1c1917'}
                    stroke="#f59e0b"
                    strokeWidth={isHovered ? 3 : 2.5}
                    className="transition-all duration-150"
                  />

                  {/* Value tag above point */}
                  <text
                    x={x}
                    y={y - 12}
                    fill={isHovered ? '#fbbf24' : '#d6d3d1'}
                    fontSize={isHovered ? '12' : '10'}
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {formatPrice(d.monto)}
                  </text>

                  {/* X Axis Day Label */}
                  <text
                    x={x}
                    y={chartHeight - paddingY + 20}
                    fill={isHovered ? '#f59e0b' : '#a8a29e'}
                    fontSize="11"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {d.dayLabel} {d.dayNumber}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover info panel / tooltip bar */}
        <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
          {hoveredPoint ? (
            <div className="flex items-center space-x-4">
              <span className="font-bold text-amber-400">
                {hoveredPoint.dayLabel} {hoveredPoint.dateStr}:
              </span>
              <span className="text-stone-200">
                Facturado: <strong className="text-white">{formatPrice(hoveredPoint.monto)}</strong>
              </span>
              <span className="text-stone-400">
                Órdenes: <strong className="text-stone-300">{hoveredPoint.tickets}</strong>
              </span>
              {hoveredPoint.platoTop && (
                <span className="text-stone-400 hidden md:inline">
                  Plato estrella: <strong className="text-amber-300">{hoveredPoint.platoTop}</strong>
                </span>
              )}
            </div>
          ) : (
            <span className="text-stone-500 italic">
              Pase el cursor sobre cualquier día de la gráfica para ver el detalle de tickets y plato estrella.
            </span>
          )}

          <div className="text-[11px] text-stone-500 font-mono">
            Deslice con las flechas superiores para ver semanas anteriores.
          </div>
        </div>

      </div>

      {/* LOWER SECTION: Category Distribution & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Categories performance during the week */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="font-bold text-stone-100 text-sm flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span>Ventas por Categoría en esta Semana</span>
          </h3>

          <div className="space-y-3">
            {categoryStats.length === 0 ? (
              <p className="text-xs text-stone-500 py-6 text-center">No hay ventas registradas en esta semana.</p>
            ) : (
              categoryStats.map((cat) => {
                const pct = totalSemana > 0 ? (cat.monto / totalSemana) * 100 : 0;
                return (
                  <div key={cat.categoria} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-stone-200">{cat.categoria}</span>
                      <div className="space-x-2">
                        <span className="font-black text-amber-400">{formatPrice(cat.monto)}</span>
                        <span className="text-[10px] text-stone-400 font-mono">({pct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-stone-950 h-2 rounded-full overflow-hidden border border-stone-800">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Operations Summary */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-stone-100 text-sm flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Resumen Ejecutivo de Rendimiento</span>
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Indicadores clave de productividad del restaurante en la semana activa.
            </p>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Eficiencia de Caja:</span>
                <span className="font-bold text-emerald-400">100% Cuadrado</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Base de Datos:</span>
                <span className="font-bold font-mono text-amber-400">TerrenoBroaster.db</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center">
                <span className="text-stone-400">Esquema SQLite:</span>
                <span className="text-stone-200">Platos, Ventas, Detalles</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
            <span>Actualizado en tiempo real</span>
            <span className="text-amber-400 font-bold">Terreno Broaster POS</span>
          </div>
        </div>

      </div>

    </div>
  );
};
