import { SAMPLE_FALLBACK_IMAGES } from '../data/defaultData';

class ImageService {
  private localImageMap: Map<string, string> = new Map();
  private serverImageSet: Set<string> = new Set();
  private listeners: Array<() => void> = [];
  private isSyncingToServer: boolean = false;

  constructor() {
    // 1. Restore cached thumbnails from localStorage if present
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('tb_pos_images');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.entries(parsed).forEach(([k, v]) => {
            this.localImageMap.set(k.toLowerCase(), v as string);
          });
        }
      }
    } catch (e) {
      console.warn('Could not load stored images:', e);
    }

    // 2. Fetch server image manifest on load
    this.refreshServerManifest();

    // 3. Auto-push any local stored images to server
    if (typeof window !== 'undefined') {
      setTimeout(() => this.syncStoredImagesToServer(), 1500);
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  /**
   * Directly sets server image manifest from /api/menu response
   */
  public setServerImages(images: string[]): void {
    if (!Array.isArray(images)) return;
    this.serverImageSet = new Set(images.map((f) => f.toLowerCase().trim()));
    this.notify();
  }

  /**
   * Refreshes the list of images available on the backend server
   */
  public async refreshServerManifest(): Promise<void> {
    try {
      const res = await fetch('/api/images-manifest');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.images)) {
          this.setServerImages(data.images);
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * Registers a single uploaded file, caches it, and uploads to server
   */
  public registerFile(file: File): string {
    const objectUrl = URL.createObjectURL(file);
    const filename = file.name.toLowerCase();
    this.localImageMap.set(filename, objectUrl);

    // Read base64 and upload to server
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = reader.result as string;
        // Save to localStorage for quick restarts
        if (file.size < 2 * 1024 * 1024) {
          const stored = localStorage.getItem('tb_pos_images');
          const data = stored ? JSON.parse(stored) : {};
          data[filename] = dataUrl;
          localStorage.setItem('tb_pos_images', JSON.stringify(data));
        }

        // Upload directly to server
        this.uploadImagesToServer({ [filename]: dataUrl });
      } catch {
        // ignore storage limit
      }
    };
    reader.readAsDataURL(file);

    this.notify();
    return objectUrl;
  }

  /**
   * Registers multiple files from an image folder
   */
  public registerMultipleFiles(files: FileList | File[]): number {
    let count = 0;
    const batchToUpload: Record<string, string> = {};

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        const filename = file.name.toLowerCase();
        this.localImageMap.set(filename, objectUrl);
        count++;

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          batchToUpload[filename] = dataUrl;

          // If last file processed, push batch
          if (Object.keys(batchToUpload).length >= Math.min(count, 5)) {
            this.uploadImagesToServer(batchToUpload);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    this.notify();
    return count;
  }

  /**
   * Pushes a batch of base64 images to the backend server so QR clients can access them
   */
  public async uploadImagesToServer(imagesMap: Record<string, string>): Promise<boolean> {
    if (!imagesMap || Object.keys(imagesMap).length === 0) return false;
    try {
      const res = await fetch('/api/upload-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagesMap }),
      });
      if (res.ok) {
        Object.keys(imagesMap).forEach((k) => this.serverImageSet.add(k.toLowerCase()));
        this.notify();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Could not upload images to server:', e);
      return false;
    }
  }

  /**
   * Syncs all images currently stored in localStorage to the backend server
   */
  public async syncStoredImagesToServer(): Promise<void> {
    if (this.isSyncingToServer || typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('tb_pos_images');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        this.isSyncingToServer = true;
        await this.uploadImagesToServer(parsed);
      }
    } catch {
      // ignore
    } finally {
      this.isSyncingToServer = false;
    }
  }

  /**
   * Cleans filename by stripping leading directory paths like 'img\', 'img/', 'C:\...'
   */
  public normalizeFilename(filename?: string): string {
    if (!filename) return '';
    return filename.trim().replace(/^.*[\\\/]/, '').toLowerCase();
  }

  /**
   * Main image URL resolver: checks URL, local cache, server API endpoint, ID match, dish name match, and smart food fallback
   */
  public getImageUrl(
    filename?: string,
    category?: string,
    dishNameOrId?: string | number,
    dishIdOrName?: string | number
  ): string {
    const clean = (filename || '').trim();

    let dishName: string | undefined;
    let dishId: number | undefined;

    if (typeof dishNameOrId === 'number') {
      dishId = dishNameOrId;
    } else if (typeof dishNameOrId === 'string' && !isNaN(Number(dishNameOrId)) && Number(dishNameOrId) > 0) {
      dishId = Number(dishNameOrId);
    } else if (typeof dishNameOrId === 'string') {
      dishName = dishNameOrId;
    }

    if (typeof dishIdOrName === 'number') {
      dishId = dishIdOrName;
    } else if (typeof dishIdOrName === 'string') {
      dishName = dishIdOrName;
    }

    // 1. Direct Web URLs (http/https/data)
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
      return clean;
    }

    const cleanName = clean.toLowerCase();
    const baseName = this.normalizeFilename(clean);

    // 2. In-memory local map (POS cashier uploaded in this session)
    if (cleanName && this.localImageMap.has(cleanName)) {
      return this.localImageMap.get(cleanName)!;
    }
    if (baseName && this.localImageMap.has(baseName)) {
      return this.localImageMap.get(baseName)!;
    }

    // 3. Predefined library matching by filename
    if (cleanName && SAMPLE_FALLBACK_IMAGES[cleanName]) {
      return SAMPLE_FALLBACK_IMAGES[cleanName];
    }
    if (baseName && SAMPLE_FALLBACK_IMAGES[baseName]) {
      return SAMPLE_FALLBACK_IMAGES[baseName];
    }

    // 4. Server API static image endpoint if filename is known or has extension
    if (baseName) {
      if (this.serverImageSet.has(baseName)) {
        return `/api/images/${encodeURIComponent(baseName)}`;
      }
      if (this.serverImageSet.has(baseName + '.jpg')) {
        return `/api/images/${encodeURIComponent(baseName + '.jpg')}`;
      }
      if (this.serverImageSet.has(baseName + '.png')) {
        return `/api/images/${encodeURIComponent(baseName + '.png')}`;
      }
      if (baseName.includes('.')) {
        return `/api/images/${encodeURIComponent(baseName)}`;
      }
    }

    // 5. Check if server has an image corresponding to dish ID (e.g. plato1.jpg, 1.jpg, 1-1.jpg)
    if (dishId) {
      const idCandidates = [`plato${dishId}.jpg`, `${dishId}.jpg`, `${dishId}-1.jpg`, `plato${dishId}.png`, `${dishId}.png`];
      for (const cand of idCandidates) {
        if (this.serverImageSet.has(cand)) {
          return `/api/images/${encodeURIComponent(cand)}`;
        }
      }
    }

    // 6. Check if dish name matches any server image (e.g. "Combo Clásico" -> "comboclasico.jpg", "Alitas" -> "alitas.jpg")
    if (dishName) {
      const normDish = dishName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normDish.length >= 3) {
        for (const sImg of this.serverImageSet) {
          const sImgClean = sImg.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/g, '');
          if (sImgClean === normDish || (normDish.length >= 5 && (sImgClean.includes(normDish) || normDish.includes(sImgClean)))) {
            return `/api/images/${encodeURIComponent(sImg)}`;
          }
        }
      }
    }

    // 7. Smart food image matching based on dish name and category
    return this.getSmartFoodImage(dishName || cleanName, category);
  }

  /**
   * Smart high-resolution gastronomy matching for Venezuelan & Broaster restaurant dishes
   */
  public getSmartFoodImage(dishName?: string, category?: string): string {
    const text = `${dishName || ''} ${category || ''}`.toLowerCase();

    // Chicken Wings / Alitas
    if (text.includes('alita') || text.includes('wing')) {
      return 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80';
    }

    // Chicken Tenders / Strips
    if (text.includes('tender') || text.includes('strip') || text.includes('dedito')) {
      return 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80';
    }

    // Pizzas
    if (text.includes('pizza') || text.includes('calzone')) {
      return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
    }

    // Empanadas
    if (text.includes('empanada') || text.includes('pastel')) {
      return 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=600&q=80';
    }

    // Hot Dog / Perro Caliente
    if (text.includes('hot dog') || text.includes('hotdog') || text.includes('perro caliente')) {
      return 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80';
    }

    // Double Burger
    if (text.includes('doble') && (text.includes('hamburguesa') || text.includes('burger'))) {
      return 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80';
    }

    // Burgers
    if (text.includes('hamburguesa') || text.includes('burger')) {
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80';
    }

    // French Fries / Papas Fritas
    if (text.includes('papa') || text.includes('frita') || text.includes('rustica')) {
      return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80';
    }

    // Tequeños de queso
    if (text.includes('teque') || text.includes('queso')) {
      return 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80';
    }

    // Arepitas fritas con nata
    if (text.includes('arepa') || text.includes('arepita') || text.includes('nata')) {
      return 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=600&q=80';
    }

    // Ensalada Cole Slaw
    if (text.includes('ensalada') || text.includes('slaw') || text.includes('repollo')) {
      return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
    }

    // Soda / Refrescos
    if (text.includes('refresco') || text.includes('coca') || text.includes('pepsi') || text.includes('lata') || text.includes('soda') || text.includes('malta')) {
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80';
    }

    // Jugo / Papelón con limón
    if (text.includes('papelon') || text.includes('jugo') || text.includes('limon') || text.includes('natural')) {
      return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80';
    }

    // Agua mineral
    if (text.includes('agua')) {
      return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80';
    }

    // Pollo Broaster / Combos / Piezas / General Chicken
    if (
      text.includes('pollo') ||
      text.includes('broaster') ||
      text.includes('combo') ||
      text.includes('balde') ||
      text.includes('pieza') ||
      text.includes('crispy') ||
      text.includes('pechuga') ||
      text.includes('muslo')
    ) {
      return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80';
    }

    // Category fallback
    return this.getFallbackForCategory(category);
  }

  public getFallbackForCategory(category?: string): string {
    const cat = (category || '').toLowerCase();
    if (cat.includes('hamburguesa')) {
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80';
    }
    if (cat.includes('racion') || cat.includes('entrada') || cat.includes('acompañ')) {
      return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80';
    }
    if (cat.includes('bebida') || cat.includes('refresco')) {
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80';
  }

  public getLoadedCount(): number {
    return this.localImageMap.size;
  }

  public getLoadedFilenames(): string[] {
    return Array.from(this.localImageMap.keys());
  }

  public clearLoaded() {
    this.localImageMap.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tb_pos_images');
    }
    this.notify();
  }
}

export const imageService = new ImageService();
