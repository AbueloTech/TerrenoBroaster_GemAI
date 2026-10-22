import { SAMPLE_FALLBACK_IMAGES } from '../data/defaultData';

class ImageService {
  private localImageMap: Map<string, string> = new Map();
  private listeners: Array<() => void> = [];

  constructor() {
    // Check if we have stored base64 or paths in localStorage
    try {
      const stored = localStorage.getItem('tb_pos_images');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([k, v]) => {
          this.localImageMap.set(k.toLowerCase(), v as string);
        });
      }
    } catch (e) {
      console.warn('Could not load stored images:', e);
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

  public registerFile(file: File): string {
    const objectUrl = URL.createObjectURL(file);
    const filename = file.name.toLowerCase();
    this.localImageMap.set(filename, objectUrl);
    
    // Also save small thumbnails if < 1.5MB for quick persistence
    if (file.size < 1.5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const stored = localStorage.getItem('tb_pos_images');
          const data = stored ? JSON.parse(stored) : {};
          data[filename] = reader.result;
          localStorage.setItem('tb_pos_images', JSON.stringify(data));
        } catch {
          // ignore localStorage quota
        }
      };
      reader.readAsDataURL(file);
    }

    this.notify();
    return objectUrl;
  }

  public registerMultipleFiles(files: FileList | File[]) {
    let count = 0;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        this.registerFile(file);
        count++;
      }
    });
    return count;
  }

  public getImageUrl(filename: string, category?: string): string {
    if (!filename) {
      return this.getFallbackForCategory(category);
    }

    const cleanName = filename.trim().toLowerCase();

    // 1. Check user uploaded / local folder image
    if (this.localImageMap.has(cleanName)) {
      return this.localImageMap.get(cleanName)!;
    }

    // 2. Check predefined sample images
    if (SAMPLE_FALLBACK_IMAGES[cleanName]) {
      return SAMPLE_FALLBACK_IMAGES[cleanName];
    }

    // 3. Fallback to category photo
    return this.getFallbackForCategory(category);
  }

  public getFallbackForCategory(category?: string): string {
    switch (category) {
      case 'Pollo Broaster':
        return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80';
      case 'Hamburguesas':
        return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80';
      case 'Raciones':
        return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80';
      case 'Bebidas':
        return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80';
      default:
        return 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80';
    }
  }

  public getLoadedCount(): number {
    return this.localImageMap.size;
  }

  public getLoadedFilenames(): string[] {
    return Array.from(this.localImageMap.keys());
  }

  public clearLoaded() {
    this.localImageMap.clear();
    localStorage.removeItem('tb_pos_images');
    this.notify();
  }
}

export const imageService = new ImageService();
