/**
 * GPU Detection and Performance Tier System
 * Detects GPU capabilities and assigns performance tiers for adaptive rendering
 */

export enum PerformanceTier {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  FALLBACK = 'FALLBACK'
}

export interface GPUInfo {
  vendor: string;
  renderer: string;
  tier: PerformanceTier;
  score: number;
  webglVersion: number;
  maxTextureSize: number;
  supportsWebGL2: boolean;
  unmaskedVendor?: string;
  unmaskedRenderer?: string;
}

export interface GPUBenchmark {
  pattern: RegExp;
  score: number;
  tier: PerformanceTier;
}

// GPU benchmark scores based on common GPUs
const GPU_BENCHMARKS: GPUBenchmark[] = [
  // NVIDIA High-end
  { pattern: /RTX\s*40[789]\d/i, score: 100, tier: PerformanceTier.HIGH },
  { pattern: /RTX\s*30[789]\d/i, score: 90, tier: PerformanceTier.HIGH },
  { pattern: /RTX\s*20[789]\d/i, score: 80, tier: PerformanceTier.HIGH },
  { pattern: /GTX\s*1[67][789]\d/i, score: 75, tier: PerformanceTier.HIGH },

  // NVIDIA Mid-range
  { pattern: /RTX\s*30[56]\d/i, score: 70, tier: PerformanceTier.MEDIUM },
  { pattern: /RTX\s*20[56]\d/i, score: 65, tier: PerformanceTier.MEDIUM },
  { pattern: /GTX\s*1[67][56]\d/i, score: 60, tier: PerformanceTier.MEDIUM },
  { pattern: /GTX\s*16[56]\d/i, score: 55, tier: PerformanceTier.MEDIUM },

  // NVIDIA Low-end
  { pattern: /GTX\s*10[56]\d/i, score: 40, tier: PerformanceTier.LOW },
  { pattern: /GT\s*\d{3}/i, score: 30, tier: PerformanceTier.LOW },

  // AMD High-end
  { pattern: /RX\s*7[89]\d{2}/i, score: 95, tier: PerformanceTier.HIGH },
  { pattern: /RX\s*6[89]\d{2}/i, score: 85, tier: PerformanceTier.HIGH },
  { pattern: /RX\s*5[789]\d{2}/i, score: 75, tier: PerformanceTier.HIGH },

  // AMD Mid-range
  { pattern: /RX\s*6[567]\d{2}/i, score: 65, tier: PerformanceTier.MEDIUM },
  { pattern: /RX\s*5[56]\d{2}/i, score: 55, tier: PerformanceTier.MEDIUM },
  { pattern: /RX\s*\d{3}/i, score: 45, tier: PerformanceTier.MEDIUM },

  // Intel Arc
  { pattern: /Arc\s*A7[789]\d/i, score: 70, tier: PerformanceTier.HIGH },
  { pattern: /Arc\s*A[56]\d{2}/i, score: 55, tier: PerformanceTier.MEDIUM },
  { pattern: /Arc\s*A3\d{2}/i, score: 40, tier: PerformanceTier.LOW },

  // Intel Integrated
  { pattern: /Intel.*Iris\s*Xe/i, score: 35, tier: PerformanceTier.LOW },
  { pattern: /Intel.*UHD/i, score: 25, tier: PerformanceTier.LOW },
  { pattern: /Intel.*HD/i, score: 20, tier: PerformanceTier.LOW },

  // Apple Silicon
  { pattern: /Apple\s*M[234]/i, score: 95, tier: PerformanceTier.HIGH },
  { pattern: /Apple\s*M1\s*Pro/i, score: 85, tier: PerformanceTier.HIGH },
  { pattern: /Apple\s*M1\s*Max/i, score: 90, tier: PerformanceTier.HIGH },
  { pattern: /Apple\s*M1\s*Ultra/i, score: 100, tier: PerformanceTier.HIGH },
  { pattern: /Apple\s*M1(?!\s*(Pro|Max|Ultra))/i, score: 70, tier: PerformanceTier.MEDIUM },

  // Mobile GPUs
  { pattern: /Adreno\s*7\d{2}/i, score: 60, tier: PerformanceTier.MEDIUM },
  { pattern: /Adreno\s*6\d{2}/i, score: 45, tier: PerformanceTier.LOW },
  { pattern: /Mali-G7[789]/i, score: 50, tier: PerformanceTier.MEDIUM },
  { pattern: /Mali/i, score: 30, tier: PerformanceTier.LOW },

  // Default/Unknown
  { pattern: /.*/, score: 25, tier: PerformanceTier.FALLBACK }
];

class GPUDetector {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private cachedInfo: GPUInfo | null = null;

  /**
   * Detect GPU information and capabilities
   */
  public async detectGPU(): Promise<GPUInfo> {
    // Return cached info if available
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    try {
      this.createCanvas();
      const gpuInfo = this.getGPUInfo();
      this.cachedInfo = gpuInfo;
      this.cleanup();
      return gpuInfo;
    } catch {
      
      return this.getFallbackGPUInfo();
    }
  }

  /**
   * Create a canvas for WebGL context
   */
  private createCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1;
    this.canvas.height = 1;

    // Try WebGL2 first, then fall back to WebGL1
    this.gl = this.canvas.getContext('webgl2') ||
               this.canvas.getContext('webgl') ||
               this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }
  }

  /**
   * Get GPU information from WebGL context
   */
  private getGPUInfo(): GPUInfo {
    if (!this.gl) {
      return this.getFallbackGPUInfo();
    }

    const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
    const isWebGL2 = this.gl instanceof WebGL2RenderingContext;

    const vendor = this.gl.getParameter(this.gl.VENDOR) || 'Unknown';
    const renderer = this.gl.getParameter(this.gl.RENDERER) || 'Unknown';
    let unmaskedVendor: string | undefined;
    let unmaskedRenderer: string | undefined;

    if (debugInfo) {
      unmaskedVendor = this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || undefined;
      unmaskedRenderer = this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || undefined;
    }

    const maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) || 2048;

    // Determine performance tier based on renderer string
    const rendererString = unmaskedRenderer || renderer;
    const { tier, score } = this.calculatePerformanceTier(rendererString);

    return {
      vendor,
      renderer,
      tier,
      score,
      webglVersion: isWebGL2 ? 2 : 1,
      maxTextureSize,
      supportsWebGL2: isWebGL2,
      unmaskedVendor,
      unmaskedRenderer
    };
  }

  /**
   * Calculate performance tier based on GPU renderer string
   */
  private calculatePerformanceTier(renderer: string): { tier: PerformanceTier; score: number } {
    // Check against known GPU benchmarks
    for (const benchmark of GPU_BENCHMARKS) {
      if (benchmark.pattern.test(renderer)) {
        return { tier: benchmark.tier, score: benchmark.score };
      }
    }

    // Default fallback
    return { tier: PerformanceTier.FALLBACK, score: 25 };
  }

  /**
   * Get fallback GPU info when detection fails
   */
  private getFallbackGPUInfo(): GPUInfo {
    return {
      vendor: 'Unknown',
      renderer: 'Unknown',
      tier: PerformanceTier.FALLBACK,
      score: 20,
      webglVersion: 0,
      maxTextureSize: 2048,
      supportsWebGL2: false
    };
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.gl = null;
    this.canvas = null;
  }

  /**
   * Reset cached information
   */
  public resetCache(): void {
    this.cachedInfo = null;
  }

  /**
   * Get performance tier recommendations based on GPU score
   */
  public static getRecommendedSettings(tier: PerformanceTier): {
    shadows: boolean;
    antialiasing: boolean;
    postProcessing: boolean;
    particleCount: number;
    textureQuality: 'high' | 'medium' | 'low';
    renderScale: number;
  } {
    switch (tier) {
      case PerformanceTier.HIGH:
        return {
          shadows: true,
          antialiasing: true,
          postProcessing: true,
          particleCount: 1000,
          textureQuality: 'high',
          renderScale: 1.0
        };

      case PerformanceTier.MEDIUM:
        return {
          shadows: true,
          antialiasing: true,
          postProcessing: false,
          particleCount: 500,
          textureQuality: 'medium',
          renderScale: 0.9
        };

      case PerformanceTier.LOW:
        return {
          shadows: false,
          antialiasing: false,
          postProcessing: false,
          particleCount: 200,
          textureQuality: 'low',
          renderScale: 0.75
        };

      case PerformanceTier.FALLBACK:
      default:
        return {
          shadows: false,
          antialiasing: false,
          postProcessing: false,
          particleCount: 100,
          textureQuality: 'low',
          renderScale: 0.5
        };
    }
  }
}

// Export singleton instance
export const gpuDetector = new GPUDetector();

// Export convenience function
export const detectGPU = () => gpuDetector.detectGPU();
export const getRecommendedSettings = GPUDetector.getRecommendedSettings;