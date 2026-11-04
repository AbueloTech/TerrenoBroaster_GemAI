import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  Printer,
  X,
  Sparkles,
  ShoppingBag,
  ChefHat,
  MessageSquare,
  Clock,
  Package,
  Calculator,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  Film,
  Presentation,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  Sun,
  Moon,
  Smartphone,
  Info,
  Check,
  MousePointer,
  Hand,
  Layers,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface VideoTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SlideData {
  id: number;
  chapter: string;
  title: string;
  subtitle: string;
  durationSec: number;
  icon: React.ElementType;
  badgeColor: string;
  speechText: string;
  bullets: { step: string; label: string; desc: string; tag?: string }[];
  visualType: 'pos' | 'whatsapp' | 'kds' | 'inventario' | 'escandallos' | 'cierre' | 'seguridad' | 'intro';
  keyStat: { value: string; label: string };
}

const SLIDES: SlideData[] = [
  {
    id: 1,
    chapter: 'Capítulo 1 de 8',
    title: 'Visión General & Motor SQLite Local',
    subtitle: 'Arquitectura gastronómica 100% local, privada y sin demoras por internet',
    durationSec: 14,
    icon: HardDrive,
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    speechText:
      'Bienvenido a Terreno Broaster. El sistema funciona con una base de datos local SQLite en tu propia computadora, lo que garantiza máxima rapidez, privacidad y funcionamiento continuo incluso sin internet.',
    bullets: [
      {
        step: '1',
        label: 'Base de Datos SQLite (TerrenoBroaster.db)',
        desc: 'Toda la información se procesa localmente en milisegundos sin depender de servidores externos caídos.',
        tag: 'Local',
      },
      {
        step: '2',
        label: 'Cero Latencia en Horas Pico',
        desc: 'Toma comandas, despacha en cocina e imprime tickets al instante durante momentos de alta demanda.',
        tag: '0 ms',
      },
      {
        step: '3',
        label: 'Copia de Respaldo Directa en la PC',
        desc: 'Descarga o sincroniza tu archivo de base de datos con un clic para no perder nunca el trabajo de la jornada.',
        tag: 'Seguro',
      },
    ],
    visualType: 'intro',
    keyStat: { value: '0 ms', label: 'Latencia local SQLite' },
  },
  {
    id: 2,
    chapter: 'Capítulo 2 de 8',
    title: 'Punto de Venta (POS) & Atención de Salón',
    subtitle: 'Cómo tomar pedidos, elegir mesas, cargar clientes y mandar comandas a cocina',
    durationSec: 16,
    icon: ShoppingBag,
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    speechText:
      'En el Punto de Venta, seleccionas la mesa o servicio, agregas platos del catálogo con un toque y usas el carrito lateral para ingresar el nombre del cliente y enviar la comanda directamente a la cocina.',
    bullets: [
      {
        step: '1',
        label: 'Selector de Ubicación & Zonas',
        desc: 'Elige fácilmente entre Mesas 1 a 10, Barra, Terraza, Para Llevar o Delivery en la parte superior.',
        tag: 'Zonas',
      },
      {
        step: '2',
        label: 'Tarjetas de Platos con Fotos y Precios',
        desc: 'Toca cualquier combo de pollo, ración o bebida para agregarlo instantáneamente al pedido.',
        tag: 'Catálogo',
      },
      {
        step: '3',
        label: 'Carrito Lateral con Datos del Cliente',
        desc: 'Añade el nombre del cliente, notas de preparación y selecciona la forma de pago (Efectivo, Transferencia).',
        tag: 'Carrito',
      },
      {
        step: '4',
        label: 'Botón "Enviar a Cocina"',
        desc: 'Genera el ticket e inicia el temporizador de cocción en el monitor KDS en menos de un segundo.',
        tag: 'Envío',
      },
    ],
    visualType: 'pos',
    keyStat: { value: '< 2 seg', label: 'Toma y envío a cocina' },
  },
  {
    id: 3,
    chapter: 'Capítulo 3 de 8',
    title: 'Pedidos Online & WhatsApp Directo',
    subtitle: 'Menú con código QR para clientes y campana sonora en la caja del restaurante',
    durationSec: 16,
    icon: MessageSquare,
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    speechText:
      'Tus clientes pueden escanear el código QR en la mesa para ver la carta digital en su celular. Al ordenar por WhatsApp, la caja recibe una alerta sonora de campana y pasa el pedido a cocina con un solo clic.',
    bullets: [
      {
        step: '1',
        label: 'Código QR en Cada Mesa',
        desc: 'Los comensales abren la carta digital en su teléfono sin necesidad de instalar ninguna aplicación.',
        tag: 'QR Móvil',
      },
      {
        step: '2',
        label: 'Recepción en Pantalla de Caja',
        desc: 'Aviso visual flotante y timbre de campana sonoro para no perder ningún pedido entrante.',
        tag: 'Alerta',
      },
      {
        step: '3',
        label: 'Conversión con 1 Clic a Cocina',
        desc: 'El botón "Pasar a Cocina" arranca de inmediato el cronómetro del monitor KDS.',
        tag: '1 Clic',
      },
    ],
    visualType: 'whatsapp',
    keyStat: { value: '+35%', label: 'Ventas por WhatsApp' },
  },
  {
    id: 4,
    chapter: 'Capítulo 4 de 8',
    title: 'Monitor de Cocina (KDS) & Tiempos en Vivo',
    subtitle: 'Cronómetros en tiempo real y semáforo de colores para cocineros y despachadores',
    durationSec: 16,
    icon: ChefHat,
    badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    speechText:
      'El Monitor de Cocina KDS muestra las órdenes en tiempo real con cronómetros activos y un semáforo de alerta: verde para órdenes recientes, amarillo para aviso y rojo para pedidos urgentes.',
    bullets: [
      {
        step: '1',
        label: 'Cronómetro Activo en Segundos',
        desc: 'Tanto los pedidos de salón como los pedidos de WhatsApp inician su conteo desde el segundo 0.',
        tag: 'En Vivo',
      },
      {
        step: '2',
        label: 'Semáforo de Alerta Gastronómico',
        desc: 'Verde (<10 min), Amarillo (<20 min) y Rojo urgente (>20 min) para evitar retrasos en las entregas.',
        tag: 'Semáforo',
      },
      {
        step: '3',
        label: 'Flujo de Estados & Ticket de Cocina',
        desc: 'Marca órdenes como "Listo / Entregado" e imprime el ticket físico para el cocinero.',
        tag: 'Despacho',
      },
    ],
    visualType: 'kds',
    keyStat: { value: '100%', label: 'Control visual de tiempos' },
  },
  {
    id: 5,
    chapter: 'Capítulo 5 de 8',
    title: 'Inventario & Nueva Estructura de Venta Directa',
    subtitle: 'Costeo y márgenes sin necesidad de crear recetas de cocina para productos listos',
    durationSec: 18,
    icon: Package,
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    speechText:
      'La nueva función de Venta Directa permite que refrescos, postres o cervezas tengan su propia estructura de costos, margen bruto y markup sin obligarte a crear una receta culinaria en cocina.',
    bullets: [
      {
        step: '1',
        label: 'Estructura de Costos para Venta Directa',
        desc: 'Compara costo de compra unitario, precio de venta, margen bruto en pesos y markup porcentual.',
        tag: 'Novedad',
      },
      {
        step: '2',
        label: 'Botones de Precio Sugerido en 1 Clic',
        desc: 'Fija precios instantáneos con márgenes estándar gastronómicos al 40%, 50%, 60% o 70%.',
        tag: '1 Clic',
      },
      {
        step: '3',
        label: 'Sincronización Inmediata con la Carta POS',
        desc: 'Marca la casilla y el producto aparece disponible de inmediato para venderse en caja.',
        tag: 'Carta POS',
      },
    ],
    visualType: 'inventario',
    keyStat: { value: '60%', label: 'Margen sugerido TOP' },
  },
  {
    id: 6,
    chapter: 'Capítulo 6 de 8',
    title: 'Escandallos & Food Cost de Recetas',
    subtitle: 'Costeo científico de cada plato de pollo broaster para garantizar máxima rentabilidad',
    durationSec: 16,
    icon: Calculator,
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    speechText:
      'En Escandallos desglosas los ingredientes exactos de cada plato: pollo fresco, harina, aceite y condimentos. El sistema calcula el porcentaje de costo de comida y el margen neto de ganancia.',
    bullets: [
      {
        step: '1',
        label: 'Costeo por Porción y Gramaje',
        desc: 'Calcula el costo real de materias primas por ración según los rendimientos y mermas.',
        tag: 'Gramos/ml',
      },
      {
        step: '2',
        label: 'Indicador de Food Cost Saludable',
        desc: 'Mantén el costo de ingredientes entre el 30% y 35% para proteger la ganancia del restaurante.',
        tag: 'Food Cost',
      },
      {
        step: '3',
        label: 'Recálculo Automático por Inflación',
        desc: 'Si sube el precio del pollo o aceite en el inventario, el escandallo se actualiza al instante.',
        tag: 'Dinámico',
      },
    ],
    visualType: 'escandallos',
    keyStat: { value: '30-35%', label: 'Food Cost ideal del sector' },
  },
  {
    id: 7,
    chapter: 'Capítulo 7 de 8',
    title: 'Cierre de Caja Diario (Cierre Z) & Resguardo en PC',
    subtitle: 'Arqueo en Pesos Colombianos (COP) y actualización obligatoria de la base de datos',
    durationSec: 17,
    icon: DollarSign,
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    speechText:
      'Al terminar el día, el Cierre de Caja calcula el balance en Pesos Colombianos, detallando efectivo, tarjetas y transferencias, con la función obligatoria de descargar o actualizar la base de datos en tu PC.',
    bullets: [
      {
        step: '1',
        label: 'Balance Total en Pesos Colombianos (COP)',
        desc: 'Monto total facturado, ticket promedio y número de pedidos atendidos en la jornada.',
        tag: 'COP $',
      },
      {
        step: '2',
        label: 'Arqueo Desglosado por Forma de Pago',
        desc: 'Visualiza cuánto dinero hay en efectivo en gaveta y cuánto en transferencias o punto de venta.',
        tag: 'Arqueo',
      },
      {
        step: '3',
        label: 'Botón Clave: Guardar SQLite en PC',
        desc: 'Descarga o actualiza TerrenoBroaster.db en tu computadora para evitar pérdidas si se borra el navegador.',
        tag: 'Seguridad',
      },
    ],
    visualType: 'cierre',
    keyStat: { value: 'COP $', label: 'Moneda configurada' },
  },
  {
    id: 8,
    chapter: 'Capítulo 8 de 8',
    title: 'Seguridad por Roles & Modo Claro/Oscuro',
    subtitle: 'Permisos de acceso para administradores vs cajeros y switcher de apariencia visual',
    durationSec: 15,
    icon: ShieldCheck,
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    speechText:
      'Terreno Broaster protege tu información con perfiles de usuario. El Administrador tiene acceso a costos y finanzas, mientras los meseros solo atienden comandas. Además, incluye switcher de tema claro u oscuro.',
    bullets: [
      {
        step: '1',
        label: 'Control de Acceso Seguro (Login)',
        desc: 'Las áreas de costos, inventario y cierre de caja requieren permisos de Administrador.',
        tag: 'Roles',
      },
      {
        step: '2',
        label: 'Perfil Restringido para Cajeros/Meseros',
        desc: 'Evita que el personal acceda o modifique costos de recetas o márgenes de ganancia.',
        tag: 'Privilegios',
      },
      {
        step: '3',
        label: 'Switcher de Tema Claro / Oscuro',
        desc: 'Adapta la pantalla a la luz del día o la noche con un solo clic para descansar la vista.',
        tag: 'Día / Noche',
      },
    ],
    visualType: 'seguridad',
    keyStat: { value: '24/7', label: 'Protección de datos' },
  },
];

export const VideoTutorialModal: React.FC<VideoTutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0); // 0 to 100 within current slide
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{ pct: number; msg: string }>({
    pct: 0,
    msg: '',
  });

  // Simulated live clock for KDS simulation
  const [kdsSeconds, setKdsSeconds] = useState<number>(268); // 04:28

  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentSlide = SLIDES[currentSlideIndex];
  const totalSlides = SLIDES.length;

  // Total presentation time
  const totalDurationSec = SLIDES.reduce((acc, s) => acc + s.durationSec, 0);
  const elapsedSeconds =
    SLIDES.slice(0, currentSlideIndex).reduce((acc, s) => acc + s.durationSec, 0) +
    Math.round((progress / 100) * currentSlide.durationSec);

  // Tick simulated KDS seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setKdsSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Speech synthesis for native Spanish narration
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isMuted) return;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = playbackSpeed;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(
        (v) =>
          v.lang.startsWith('es') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Lucia') ||
            v.name.includes('Sabina') ||
            v.name.includes('Jorge') ||
            v.name.includes('Helena'))
      );
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Graceful ignore
    }
  };

  // Play narration on slide change
  useEffect(() => {
    if (isOpen && isPlaying && !isMuted) {
      speakText(currentSlide.speechText);
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentSlideIndex, isPlaying, isMuted, isOpen, playbackSpeed]);

  // Handle slide timing when playing in video mode
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    setProgress(0);
    const intervalMs = 100;
    const totalSteps = (currentSlide.durationSec * 1000) / intervalMs / playbackSpeed;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentPct = Math.min(100, (step / totalSteps) * 100);
      setProgress(currentPct);

      if (step >= totalSteps) {
        clearInterval(timer);
        setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentSlideIndex, playbackSpeed, currentSlide.durationSec, totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlideIndex]);

  const handleNext = () => {
    setProgress(0);
    setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  const handlePrev = () => {
    setProgress(0);
    setCurrentSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      } else {
        speakText(currentSlide.speechText);
      }
      return next;
    });
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // REAL CLIENT-SIDE VIDEO GENERATION & DOWNLOAD ENGINE (Canvas + MediaRecorder)
  // =========================================================================
  const handleDownloadVideo = async () => {
    try {
      setIsDownloadingVideo(true);
      setIsPlaying(false); // Pause live presentation while recording
      setDownloadProgress({ pct: 5, msg: 'Iniciando grabador de video HD...' });

      // Create a 1280x720 16:9 canvas
      let canvas = hiddenCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        hiddenCanvasRef.current = canvas;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo inicializar el lienzo gráfico.');

      // Check MediaRecorder support
      if (typeof window.MediaRecorder === 'undefined' || typeof canvas.captureStream === 'undefined') {
        throw new Error('Tu navegador no soporta MediaRecorder para captura de video.');
      }

      // Determine supported mime type
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      let selectedMime = 'video/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const stream = canvas.captureStream(30); // 30 FPS
      const recorder = new MediaRecorder(stream, { mimeType: selectedMime });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.start();

      // Draw all 8 slides sequentially to produce the video
      const totalSteps = SLIDES.length;
      for (let i = 0; i < totalSteps; i++) {
        const slide = SLIDES[i];
        setDownloadProgress({
          pct: Math.round(((i + 1) / totalSteps) * 90),
          msg: `Grabando ${slide.chapter}: ${slide.title}...`,
        });

        // Render multiple frames for this slide to generate a smooth video timeline
        const framesPerSlide = 40; // ~1.3 seconds per slide for fast, crisp compilation
        for (let f = 0; f < framesPerSlide; f++) {
          // 1. Background
          const grad = ctx.createLinearGradient(0, 0, 1280, 720);
          grad.addColorStop(0, '#0c0a09');
          grad.addColorStop(0.5, '#18181b');
          grad.addColorStop(1, '#09090b');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1280, 720);

          // 2. Top Header Bar
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0, 0, 1280, 70);
          ctx.strokeStyle = '#27272a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 70);
          ctx.lineTo(1280, 70);
          ctx.stroke();

          // Brand Logo & Title
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 22px system-ui, sans-serif';
          ctx.fillText('🍗 TERRENO BROASTER', 40, 44);

          ctx.fillStyle = '#a1a1aa';
          ctx.font = '14px system-ui, sans-serif';
          ctx.fillText('· TUTORIAL DEMOSTRATIVO EN VIDEO HD', 285, 44);

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 15px monospace';
          ctx.fillText(`CAPÍTULO ${slide.id}/8`, 1120, 44);

          // 3. Left Column: Chapter Title & Detailed Functional Bullets
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 14px system-ui, sans-serif';
          ctx.fillText(slide.chapter.toUpperCase(), 50, 120);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px system-ui, sans-serif';
          ctx.fillText(slide.title, 50, 160);

          ctx.fillStyle = '#a1a1aa';
          ctx.font = '15px system-ui, sans-serif';
          ctx.fillText(slide.subtitle, 50, 190);

          // Bullets
          let bulletY = 240;
          slide.bullets.forEach((b) => {
            // Bullet badge
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(65, bulletY + 6, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0c0a09';
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.fillText(b.step, 61, bulletY + 11);

            // Label & description
            ctx.fillStyle = '#fafafa';
            ctx.font = 'bold 17px system-ui, sans-serif';
            ctx.fillText(b.label, 90, bulletY + 10);

            ctx.fillStyle = '#a1a1aa';
            ctx.font = '13px system-ui, sans-serif';
            ctx.fillText(b.desc.substring(0, 70) + (b.desc.length > 70 ? '...' : ''), 90, bulletY + 32);

            bulletY += 65;
          });

          // 4. Right Column: High-Fidelity UI Mockup Box
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#3f3f46';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(680, 110, 550, 480, 24);
          ctx.fill();
          ctx.stroke();

          // Mockup Header
          ctx.fillStyle = '#27272a';
          ctx.beginPath();
          ctx.roundRect(680, 110, 550, 50, [24, 24, 0, 0]);
          ctx.fill();

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 14px system-ui, sans-serif';
          ctx.fillText('SIMULACIÓN VISUAL DEL SISTEMA EN ACCIÓN', 710, 142);

          // Mockup Body specific to slide
          if (slide.visualType === 'pos') {
            // Mesas buttons
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(710, 180, 90, 36);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 13px system-ui';
            ctx.fillText('MESA 1', 730, 204);

            ctx.fillStyle = '#27272a';
            ctx.fillRect(810, 180, 90, 36);
            ctx.fillStyle = '#fff';
            ctx.fillText('MESA 2', 830, 204);

            ctx.fillStyle = '#27272a';
            ctx.fillRect(910, 180, 90, 36);
            ctx.fillText('BARRA', 930, 204);

            // Dish card
            ctx.fillStyle = '#09090b';
            ctx.fillRect(710, 235, 230, 160);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 15px system-ui';
            ctx.fillText('Combo Broaster Familiar', 725, 270);
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 18px monospace';
            ctx.fillText('$45.000 COP', 725, 305);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(725, 330, 200, 35);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 13px system-ui';
            ctx.fillText('+ Agregar al Carrito', 760, 353);

            // Cart Panel
            ctx.fillStyle = '#09090b';
            ctx.fillRect(960, 180, 245, 370);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 14px system-ui';
            ctx.fillText('CARRITO DE PEDIDO', 980, 215);
            ctx.fillStyle = '#a1a1aa';
            ctx.font = '12px system-ui';
            ctx.fillText('Cliente: Juan Pérez (Mesa 1)', 980, 240);

            ctx.fillStyle = '#fff';
            ctx.font = '12px system-ui';
            ctx.fillText('1x Combo Broaster · $45.000', 980, 280);
            ctx.fillText('2x Pepsi 1.5L · $12.000', 980, 310);

            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('TOTAL: $57.000', 980, 420);

            ctx.fillStyle = '#10b981';
            ctx.fillRect(980, 460, 205, 45);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px system-ui';
            ctx.fillText('⚡ ENVIAR A COCINA', 1010, 488);
          } else if (slide.visualType === 'kds') {
            // KDS kitchen board
            ctx.fillStyle = '#09090b';
            ctx.fillRect(710, 180, 490, 150);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 16px system-ui';
            ctx.fillText('ORDEN #104 · MESA 1', 730, 215);
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 15px monospace';
            ctx.fillText('⏱ 04:28 min (En Tiempo)', 1030, 215);

            ctx.fillStyle = '#fff';
            ctx.font = '14px system-ui';
            ctx.fillText('• 1x Combo Broaster Familiar', 730, 255);
            ctx.fillText('• 2x Pepsi 1.5L bien fría', 730, 285);

            ctx.fillStyle = '#10b981';
            ctx.fillRect(730, 350, 220, 40);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 13px system-ui';
            ctx.fillText('✓ MARCAR LISTO', 780, 375);

            ctx.fillStyle = '#3f3f46';
            ctx.fillRect(970, 350, 220, 40);
            ctx.fillStyle = '#fff';
            ctx.fillText('🖨 IMPRIMIR TICKET', 1020, 375);
          } else if (slide.visualType === 'inventario') {
            // Venta Directa Cost Structure
            ctx.fillStyle = '#09090b';
            ctx.fillRect(710, 180, 490, 360);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 16px system-ui';
            ctx.fillText('PEPSI 1.5L · VENTA DIRECTA', 730, 220);

            ctx.fillStyle = '#a1a1aa';
            ctx.font = '14px system-ui';
            ctx.fillText('Costo de Compra:', 730, 260);
            ctx.fillStyle = '#fff';
            ctx.fillText('$3.500 COP', 900, 260);

            ctx.fillStyle = '#a1a1aa';
            ctx.fillText('Precio de Venta:', 730, 300);
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 18px monospace';
            ctx.fillText('$7.000 COP', 900, 300);

            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 14px system-ui';
            ctx.fillText('Margen Bruto: $3.500 COP (50.0%)', 730, 350);
            ctx.fillText('Markup sobre Costo: 100%', 730, 380);

            // Suggested buttons
            ctx.fillStyle = '#27272a';
            ctx.fillRect(730, 420, 100, 40);
            ctx.fillStyle = '#fff';
            ctx.font = '12px system-ui';
            ctx.fillText('40% Margen', 745, 445);

            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(850, 420, 110, 40);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px system-ui';
            ctx.fillText('60% Margen TOP', 855, 445);

            ctx.fillStyle = '#27272a';
            ctx.fillRect(980, 420, 100, 40);
            ctx.fillStyle = '#fff';
            ctx.fillText('70% Margen', 995, 445);
          } else {
            // General mockup fallback
            ctx.fillStyle = '#09090b';
            ctx.fillRect(710, 180, 490, 360);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 18px system-ui';
            ctx.fillText(slide.title, 740, 240);
            ctx.fillStyle = '#a1a1aa';
            ctx.font = '14px system-ui';
            ctx.fillText(slide.subtitle, 740, 280);

            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 24px monospace';
            ctx.fillText(slide.keyStat.value, 740, 360);
            ctx.fillStyle = '#fff';
            ctx.font = '14px system-ui';
            ctx.fillText(slide.keyStat.label, 740, 395);
          }

          // 5. Bottom Subtitle & Speech Banner
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0, 630, 1280, 75);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 12px system-ui';
          ctx.fillText('LOCUCIÓN & EXPLICACIÓN:', 50, 655);

          ctx.fillStyle = '#e4e4e7';
          ctx.font = 'italic 15px system-ui';
          ctx.fillText(`"${slide.speechText}"`, 50, 680);

          // 6. Timeline Progress bar at the very bottom
          ctx.fillStyle = '#27272a';
          ctx.fillRect(0, 705, 1280, 15);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(0, 705, (1280 * (i + (f + 1) / framesPerSlide)) / totalSteps, 15);

          // Yield execution to browser for responsive recording
          await new Promise((res) => setTimeout(res, 25));
        }
      }

      setDownloadProgress({ pct: 95, msg: 'Finalizando empaquetado del archivo de video...' });
      recorder.stop();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: selectedMime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `TerrenoBroaster_Tutorial_Demostrativo_${new Date().toISOString().slice(0, 10)}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          resolve();
        };
      });

      setDownloadProgress({ pct: 100, msg: '¡Video descargado exitosamente en tu PC!' });
      setTimeout(() => {
        setIsDownloadingVideo(false);
      }, 2000);
    } catch (err: any) {
      console.error('Error generating video:', err);
      alert(
        `No se pudo descargar el video automáticamente: ${err?.message || 'Error del navegador'}.\nPuedes usar el botón de imprimir para descargar el manual en PDF.`
      );
      setIsDownloadingVideo(false);
    }
  };

  const handlePrintManual = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto ${
        isPresentationMode ? 'p-0' : ''
      }`}
    >
      {/* Hidden Canvas for Video Export */}
      <canvas ref={hiddenCanvasRef} width={1280} height={720} className="hidden" />

      {/* Video Generation Progress Modal */}
      {isDownloadingVideo && (
        <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/40 animate-pulse">
              <Film className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Grabando Video Demostrativo HD</h3>
              <p className="text-xs text-stone-300 mt-1">{downloadProgress.msg}</p>
            </div>
            <div className="w-full bg-stone-950 h-3 rounded-full overflow-hidden border border-stone-800 p-0.5">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.pct}%` }}
              />
            </div>
            <p className="text-[11px] text-stone-400 font-mono">
              Progreso: {downloadProgress.pct}% · Por favor no cierres esta ventana
            </p>
          </div>
        </div>
      )}

      {/* Main Theater / Video Player Box */}
      <div
        ref={containerRef}
        className={`w-full bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isPresentationMode
            ? 'h-full max-h-screen rounded-none border-none'
            : 'max-w-6xl max-h-[94vh] my-auto'
        }`}
      >
        {/* ========================================================= */}
        {/* TOP TOOLBAR: CONTROLES VISIBLES Y DESTACADOS DE PLAY/PAUSA */}
        {/* ========================================================= */}
        <div className="px-4 sm:px-6 py-3 bg-stone-950 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
          {/* Left: Brand & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>Video Tutorial & Demostración</span>
                  <span className="hidden md:inline text-xs font-normal text-stone-400">
                    · Terreno Broaster POS
                  </span>
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black uppercase tracking-wider">
                  {isPlaying ? 'Reproduciendo' : 'Pausado'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                Demostración animada con la interfaz y funcionamiento de cada módulo
              </p>
            </div>
          </div>

          {/* Center / Right: PROMINENT PLAY / PAUSE & CONTROLS */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* OMNIPRESENT VISIBLE PLAY / PAUSE BUTTON */}
            <button
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pausar video (Barra espaciadora)' : 'Reproducir video (Barra espaciadora)'}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all shadow-lg active:scale-95 cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20 animate-pulse'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-stone-950" />
                  <span>PAUSAR VIDEO</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-stone-950" />
                  <span>REPRODUCIR</span>
                </>
              )}
            </button>

            {/* Previous & Next Chapter */}
            <button
              onClick={handlePrev}
              title="Capítulo Anterior (Flecha Izquierda)"
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleNext}
              title="Siguiente Capítulo (Flecha Derecha)"
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* DOWNLOAD VIDEO BUTTON */}
            <button
              onClick={handleDownloadVideo}
              title="Descargar este video demostrativo a tu PC (.webm)"
              className="flex items-center space-x-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar Video</span>
            </button>

            {/* Audio Voice Toggle */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Activar voz de locución (M)' : 'Silenciar locución (M)'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-stone-800 text-stone-400 border-stone-700'
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Print Guide */}
            <button
              onClick={handlePrintManual}
              title="Imprimir Guía de Capacitación del Personal (PDF)"
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Fullscreen Mode */}
            <button
              onClick={() => setIsPresentationMode((prev) => !prev)}
              title={isPresentationMode ? 'Salir de Pantalla Completa' : 'Modo Pantalla Completa'}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer hidden md:flex"
            >
              {isPresentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-red-500 hover:text-white text-stone-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VIDEO DISPLAY STAGE (16:9 RATIO SCREEN WITH UI WALKTHROUGH) */}
        {/* ========================================================= */}
        <div
          onClick={handleTogglePlay}
          className="flex-1 bg-stone-950 overflow-y-auto relative flex flex-col justify-between p-4 sm:p-6 lg:p-8 min-h-[420px] cursor-pointer group"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* LARGE CENTRAL FLOATING PLAY BUTTON WHEN PAUSED */}
          {!isPlaying && (
            <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-2xl shadow-amber-500/50 transform scale-110 animate-pulse">
                <Play className="w-10 h-10 fill-stone-950 ml-1.5" />
              </div>
            </div>
          )}

          {/* Slide Top Meta: Chapter & Timer */}
          <div className="relative z-10 flex items-center justify-between pb-3 border-b border-stone-800/80 pointer-events-auto">
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${currentSlide.badgeColor}`}>
                {currentSlide.chapter}
              </span>
              <span className="text-xs text-stone-300 font-bold uppercase tracking-wider hidden sm:inline">
                {currentSlide.title}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-amber-400">
                {currentSlide.id} de {totalSlides}
              </span>
              <span className="text-xs text-stone-400 font-mono">
                {formatSeconds(elapsedSeconds)} / {formatSeconds(totalDurationSec)}
              </span>
            </div>
          </div>

          {/* Slide Content: 2-Column High-Definition Layout */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto py-3 items-center pointer-events-auto">
            {/* Left Column: Educational Step-by-Step Breakdown (5 cols) */}
            <div className="lg:col-span-5 space-y-3.5">
              <div>
                <h1 className="text-lg sm:text-2xl font-black text-white leading-tight">
                  {currentSlide.title}
                </h1>
                <p className="text-xs sm:text-sm text-stone-400 mt-1 font-medium">
                  {currentSlide.subtitle}
                </p>
              </div>

              {/* Step-by-step bullet points explaining what each button does */}
              <div className="space-y-2 pt-1">
                {currentSlide.bullets.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2.5 sm:p-3 rounded-2xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/40 transition-all shadow-sm"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow">
                      {b.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-100">{b.label}</h4>
                        {b.tag && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-800 text-amber-400 font-mono font-bold">
                            {b.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 leading-relaxed">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: DETAILED REALISTIC UI SIMULATION (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="rounded-3xl bg-stone-900/95 border border-stone-800 p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-3">
                {/* Visual Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <currentSlide.icon className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                      Pantalla del Sistema en Acción
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">
                      En Vivo
                    </span>
                  </div>
                </div>

                {/* ---------------------------------------------------- */}
                {/* 1. MOCKUP: INTRO / SQLITE */}
                {/* ---------------------------------------------------- */}
                {currentSlide.visualType === 'intro' && (
                  <div className="space-y-3 py-2 text-center">
                    <div className="flex items-center justify-center p-4 bg-stone-950 rounded-2xl border border-stone-800">
                      <BrandLogo className="w-16 h-16" />
                    </div>
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 font-mono text-xs text-emerald-400 font-bold flex items-center justify-center gap-2">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      <span>Base de Datos Local SQLite: TerrenoBroaster.db Activa</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-stone-950 rounded-xl border border-stone-800">
                        <span className="text-[10px] text-stone-500 block">Velocidad</span>
                        <span className="font-bold text-amber-400">0 ms latencia</span>
                      </div>
                      <div className="p-2 bg-stone-950 rounded-xl border border-stone-800">
                        <span className="text-[10px] text-stone-500 block">Internet</span>
                        <span className="font-bold text-emerald-400">No Obligatorio</span>
                      </div>
                      <div className="p-2 bg-stone-950 rounded-xl border border-stone-800">
                        <span className="text-[10px] text-stone-500 block">Privacidad</span>
                        <span className="font-bold text-blue-400">100% En tu PC</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* 2. MOCKUP: PUNTO DE VENTA (POS) - DETALLE COMPLETO */}
                {/* ---------------------------------------------------- */}
                {currentSlide.visualType === 'pos' && (
                  <div className="space-y-3 py-1">
                    {/* Zonas / Mesas Header */}
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block mb-1">
                        Paso 1: Selecciona la Mesa o Servicio
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 text-center text-xs font-bold">
                        <span className="p-1.5 bg-amber-500 text-stone-950 rounded-lg shadow ring-2 ring-amber-400/50">
                          Mesa 1
                        </span>
                        <span className="p-1.5 bg-stone-800 text-stone-300 rounded-lg">Mesa 2</span>
                        <span className="p-1.5 bg-stone-800 text-stone-300 rounded-lg">Mesa 3</span>
                        <span className="p-1.5 bg-stone-800 text-stone-300 rounded-lg">Barra</span>
                        <span className="p-1.5 bg-stone-800 text-stone-300 rounded-lg">Terraza</span>
                        <span className="p-1.5 bg-blue-950 text-blue-300 border border-blue-500/30 rounded-lg">
                          Delivery
                        </span>
                      </div>
                    </div>

                    {/* Dish & Cart 2-Column Split */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Left: Dish Card */}
                      <div className="sm:col-span-6 p-2.5 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                        <span className="text-[9px] text-stone-400 uppercase font-bold block">
                          Paso 2: Toca un Plato
                        </span>
                        <div className="h-16 bg-stone-900 rounded-lg flex items-center justify-center font-bold text-amber-400 text-xs border border-stone-800">
                          🍗 Combo Broaster Familiar
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-stone-300 font-bold">8 Piezas + Papas</span>
                          <span className="font-mono font-black text-amber-400">$45.000</span>
                        </div>
                        <div className="w-full py-1.5 bg-amber-500 text-stone-950 font-black text-[11px] rounded-lg text-center shadow">
                          + Agregar al Carrito
                        </div>
                      </div>

                      {/* Right: Cart Panel with Client Name & Action */}
                      <div className="sm:col-span-6 p-2.5 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                        <span className="text-[9px] text-stone-400 uppercase font-bold block">
                          Paso 3: Carrito & Cliente
                        </span>
                        <div className="p-1.5 bg-stone-900 rounded-lg border border-stone-800 text-[11px] flex justify-between">
                          <span className="text-stone-400">Cliente:</span>
                          <span className="font-bold text-white">Juan Pérez (Mesa 1)</span>
                        </div>
                        <div className="text-[11px] space-y-0.5 text-stone-300 border-b border-stone-800 pb-1">
                          <div className="flex justify-between">
                            <span>1x Combo Familiar</span>
                            <span className="font-mono">$45.000</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2x Pepsi 1.5L</span>
                            <span className="font-mono">$12.000</span>
                          </div>
                        </div>
                        <div className="flex justify-between font-bold text-xs text-amber-400">
                          <span>Total a Pagar:</span>
                          <span className="font-mono font-black">$57.000 COP</span>
                        </div>
                        <div className="w-full py-1.5 bg-emerald-600 text-white font-black text-[11px] rounded-lg text-center shadow animate-pulse">
                          ⚡ Enviar Comanda a Cocina
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* 3. MOCKUP: PEDIDOS ONLINE & WHATSAPP */}
                {/* ---------------------------------------------------- */}
                {currentSlide.visualType === 'whatsapp' && (
                  <div className="space-y-3 py-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 space-y-1 text-center">
                        <Smartphone className="w-6 h-6 text-emerald-400 mx-auto" />
                        <span className="text-xs font-bold text-white block">Celular del Cliente</span>
                        <p className="text-[10px] text-stone-400">
                          Escanea el código QR de la mesa y arma su carrito de autoservicio.
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-1 text-center">
                        <MessageSquare className="w-6 h-6 text-emerald-400 mx-auto animate-bounce" />
                        <span className="text-xs font-bold text-emerald-300 block">WhatsApp de Caja</span>
                        <p className="text-[10px] text-stone-300">
                          El pedido llega listo con nombres, raciones y dirección de entrega.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-stone-950 rounded-xl border border-emerald-500/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-emerald-400 block">
                          🔔 ¡Nuevo Pedido WhatsApp Recibido!
                        </span>
                        <span className="text-[11px] text-stone-300">
                          Carlos M. · Delivery Calle 14 · Total: $62.000 COP
                        </span>
                      </div>
                      <button className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                        Pasar a Cocina
                      </button>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* 4. MOCKUP: MONITOR DE COCINA KDS */}
                {/* ---------------------------------------------------- */}
                {currentSlide.visualType === 'kds' && (
                  <div className="space-y-3 py-1">
                    <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-xs">
                            MESA #4
                          </span>
                          <span className="text-xs text-stone-300 font-bold">Comanda #108</span>
                        </div>
                        <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>{formatSeconds(kdsSeconds)} min</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        </span>
                      </div>

                      <div className="p-2 bg-stone-900 rounded-xl text-xs space-y-1 text-stone-200">
                        <div className="font-bold">• 1x Pollo Broaster 8 Piezas + Papas</div>
                        <div className="font-bold">• 2x Ración de Arepitas con Queso</div>
                        <div className="text-[10px] text-amber-400 italic">
                          Nota del cliente: Pechuga bien dorada, salsa de ajo aparte
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <span className="p-2 bg-stone-800 rounded-xl text-stone-300 font-bold">
                          🖨 Imprimir Ticket
                        </span>
                        <span className="p-2 bg-emerald-600 text-white font-black rounded-xl shadow">
                          ✓ Marcar Entregado
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                      <span className="p-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Verde: &lt;10 min
                      </span>
                      <span className="p-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                        Amarillo: &lt;20 min
                      </span>
                      <span className="p-1 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                        Rojo: Urgente
                      </span>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* 5. MOCKUP: INVENTARIO & VENTA DIRECTA */}
                {/* ---------------------------------------------------- */}
                {currentSlide.visualType === 'inventario' && (
                  <div className="space-y-2.5 py-1">
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-stone-400">Producto de Venta Directa:</span>
                        <span className="font-bold text-white">Pepsi 1.5L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Costo de Compra Proveedor:</span>
                        <span className="font-mono text-stone-300 font-bold">$3.500 COP</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-400 font-bold">
                        <span>Precio de Venta al Público:</span>
                        <span className="font-mono text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          $7.000 COP
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                      <div className="p-2 bg-stone-950 border border-stone-800 rounded-xl">
                        <span className="text-stone-500 block text-[9px]">Margen Bruto $</span>
                        <span className="text-emerald-400">$3.500 COP</span>
                      </div>
                      <div className="p-2 bg-stone-950 border border-stone-800 rounded-xl">
                        <span className="text-stone-500 block text-[9px]">Margen Venta %</span>
                        <span className="text-amber-400">50.0% Rentable</span>
                      </div>
                      <div className="p-2 bg-stone-950 border border-stone-800 rounded-xl">
                        <span className="text-stone-500 block text-[9px]">Markup %</span>
                        <span className="text-blue-400">100% sobre costo</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block mb-1">
                        Fijación de Precio en 1 Clic:
                      </span>
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
                        <span className="p-1.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300">
                          40% Margen
                        </span>
                        <span className="p-1.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300">
                          50% Margen
                        </span>
                        <span className="p-1.5 bg-amber-500 text-stone-950 rounded-lg shadow font-black">
                          60% TOP
                        </span>
                        <span className="p-1.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300">
                          70% Margen
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* 6. MOCKUP: ESCANDALLOS */}
                {/* ---------------------------------------------------- */}
                {currentSlide.visualType === 'escandallos' && (
                  <div className="space-y-2.5 py-1">
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                      <div className="flex justify-between text-xs font-bold text-white">
                        <span>Receta: Combo Broaster 4 Piezas</span>
                        <span className="font-mono text-amber-400">$24.000 COP</span>
                      </div>

                      {/* Visual Cost Bar */}
                      <div className="w-full bg-stone-800 h-3 rounded-full overflow-hidden flex">
                        <div className="bg-rose-500 h-full w-[32%]" title="Food Cost (32%)" />
                        <div className="bg-emerald-500 h-full w-[68%]" title="Margen Bruto (68%)" />
                      </div>

                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-rose-400 font-bold">Food Cost: 32% ($7.680)</span>
                        <span className="text-emerald-400 font-bold">Ganancia: 68% ($16.320)</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs space-y-1 text-stone-300">
                      <div className="flex justify-between">
                        <span>• Pollo Fresco Despresado (500g):</span>
                        <span className="font-mono">$5.200</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Harina y Condimento Broaster (80g):</span>
                        <span className="font-mono">$1.100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Aceite de Freír por Inmersión:</span>
                        <span className="font-mono">$1.380</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* 7. MOCKUP: CIERRE DE CAJA & RESGUARDO PC */}
                {/* ---------------------------------------------------- */}
                {currentSlide.visualType === 'cierre' && (
                  <div className="space-y-2.5 py-1">
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center pb-1 border-b border-stone-800">
                        <span className="text-stone-400 font-bold">TOTAL VENDIDO EN EL DÍA:</span>
                        <span className="font-mono font-black text-emerald-400 text-base">
                          $1.250.000 COP
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                        <div className="p-1.5 bg-stone-900 rounded-lg">
                          <span className="text-stone-500 block text-[9px]">Efectivo</span>
                          <span className="font-bold text-white">$820.000</span>
                        </div>
                        <div className="p-1.5 bg-stone-900 rounded-lg">
                          <span className="text-stone-500 block text-[9px]">Punto de Venta</span>
                          <span className="font-bold text-white">$310.000</span>
                        </div>
                        <div className="p-1.5 bg-stone-900 rounded-lg">
                          <span className="text-stone-500 block text-[9px]">Transferencia</span>
                          <span className="font-bold text-white">$120.000</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-500/15 border-2 border-amber-500/60 text-center space-y-1.5">
                      <div className="flex items-center justify-center gap-2 text-xs font-black text-amber-400 uppercase">
                        <HardDrive className="w-4 h-4" />
                        <span>Resguardo Obligatorio de Base de Datos</span>
                      </div>
                      <button className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all active:scale-95">
                        💾 Guardar / Actualizar SQLite en PC
                      </button>
                      <p className="text-[10px] text-stone-300">
                        Descarga TerrenoBroaster.db en tu PC para cero pérdidas.
                      </p>
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* 8. MOCKUP: SEGURIDAD & TEMA CLARO/OSCURO */}
                {/* ---------------------------------------------------- */}
                {currentSlide.visualType === 'seguridad' && (
                  <div className="space-y-3 py-1">
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white">Rol: Administrador</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        Acceso Total (Costos, Cierre, POS)
                      </span>
                    </div>

                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-white">Rol: Cajero / Mesero</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        Solo Toma de Pedidos (Sin Costos)
                      </span>
                    </div>

                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
                      <span className="text-stone-300 font-bold">Apariencia Visual:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-amber-400 font-bold flex items-center gap-1">
                          <Moon className="w-3.5 h-3.5" />
                          <span>Modo Oscuro (Noche)</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-stone-200 text-stone-950 font-bold flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-amber-600" />
                          <span>Modo Claro (Día)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Stat Footnote */}
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">
                      {currentSlide.keyStat.label}
                    </span>
                    <span className="text-base font-black text-amber-400 font-mono">
                      {currentSlide.keyStat.value}
                    </span>
                  </div>
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Subtitles / Audio Closed Captions */}
          <div className="relative z-10 p-3 rounded-2xl bg-stone-900/90 border border-stone-800 backdrop-blur-xs flex items-center gap-3 pointer-events-auto">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                Locución Explicativa (Español):
              </span>
              <p className="text-xs text-stone-100 font-medium italic line-clamp-2">
                "{currentSlide.speechText}"
              </p>
            </div>
            <button
              onClick={handleToggleMute}
              className="text-xs px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold shrink-0 cursor-pointer transition-colors"
            >
              {isMuted ? 'Activar Voz' : 'Silenciar'}
            </button>
          </div>
        </div>

        {/* Timeline Bar (Interactive Video Scrubber) */}
        <div className="w-full bg-stone-950 px-4 sm:px-6 pt-3 pb-1 border-t border-stone-800/80">
          <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden relative cursor-pointer">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-100 ease-linear rounded-full shadow-md"
              style={{
                width: `${((currentSlideIndex + progress / 100) / totalSlides) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Bottom Playback & Chapter Navigation Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-stone-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: Quick Slide Numbers */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-full">
            <span className="text-[10px] text-stone-500 uppercase font-black mr-1 hidden sm:inline">
              Capítulos:
            </span>
            {SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => {
                  setProgress(0);
                  setCurrentSlideIndex(idx);
                }}
                title={`${slide.chapter}: ${slide.title}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono transition-all cursor-pointer shrink-0 ${
                  currentSlideIndex === idx
                    ? 'bg-amber-500 text-stone-950 shadow-md scale-105'
                    : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-white'
                }`}
              >
                {slide.id}
              </button>
            ))}
          </div>

          {/* Right: Direct Download and Close */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadVideo}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Video</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
