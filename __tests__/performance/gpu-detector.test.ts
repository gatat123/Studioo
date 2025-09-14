/**
 * GPU Detector Test Suite
 * Tests GPU detection, performance tier assignment, and recommended settings
 */

import {
  gpuDetector,
  detectGPU,
  getRecommendedSettings,
  PerformanceTier
} from '@/lib/performance/gpu-detector'

describe('GPU Detector', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext
  let mockCanvas: HTMLCanvasElement
  let mockGl: WebGL2RenderingContext & { getParameter: jest.Mock; getExtension: jest.Mock }

  beforeEach(() => {
    // Reset cache before each test
    gpuDetector.resetCache()

    // Store original getContext
    originalGetContext = HTMLCanvasElement.prototype.getContext

    // Create mock WebGL context
    mockGl = {
      VENDOR: 7936,
      RENDERER: 7937,
      MAX_TEXTURE_SIZE: 3379,
      getParameter: jest.fn(),
      getExtension: jest.fn()
    }

    // Mock canvas element
    mockCanvas = document.createElement('canvas')
    jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
  })

  afterEach(() => {
    // Restore original getContext
    HTMLCanvasElement.prototype.getContext = originalGetContext
    jest.restoreAllMocks()
  })

  describe('GPU Detection', () => {
    it('should detect GPU information successfully', async () => {
      // Setup WebGL2 context mock
      mockGl.getParameter.mockImplementation((param: number) => {
        switch (param) {
          case 7936: return 'NVIDIA Corporation'
          case 7937: return 'ANGLE (NVIDIA GeForce RTX 3080)'
          case 3379: return 16384
          default: return null
        }
      })

      mockGl.getExtension.mockImplementation((name: string) => {
        if (name === 'WEBGL_debug_renderer_info') {
          return {
            UNMASKED_VENDOR_WEBGL: 37445,
            UNMASKED_RENDERER_WEBGL: 37446
          }
        }
        return null
      })

      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl)

      const gpuInfo = await detectGPU()

      expect(gpuInfo).toBeDefined()
      expect(gpuInfo.vendor).toBe('NVIDIA Corporation')
      expect(gpuInfo.renderer).toBe('ANGLE (NVIDIA GeForce RTX 3080)')
      expect(gpuInfo.maxTextureSize).toBe(16384)
      expect(gpuInfo.tier).toBe(PerformanceTier.HIGH)
      expect(gpuInfo.score).toBeGreaterThanOrEqual(90)
    })

    it('should cache GPU information after first detection', async () => {
      mockGl.getParameter.mockReturnValue('Test GPU')
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl)

      const firstCall = await detectGPU()
      const secondCall = await detectGPU()

      expect(firstCall).toBe(secondCall)
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledTimes(1)
    })

    it('should handle WebGL not supported scenario', async () => {
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(null)

      const gpuInfo = await detectGPU()

      expect(gpuInfo.tier).toBe(PerformanceTier.FALLBACK)
      expect(gpuInfo.vendor).toBe('Unknown')
      expect(gpuInfo.renderer).toBe('Unknown')
      expect(gpuInfo.webglVersion).toBe(0)
      expect(gpuInfo.supportsWebGL2).toBe(false)
    })

    it('should detect WebGL2 support correctly', async () => {
      const webgl2Context = {
        ...mockGl,
        constructor: { name: 'WebGL2RenderingContext' }
      }
      Object.setPrototypeOf(webgl2Context, WebGL2RenderingContext.prototype)

      HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
        if (type === 'webgl2') return webgl2Context
        return null
      })

      mockGl.getParameter.mockReturnValue('Test GPU')

      const gpuInfo = await detectGPU()

      expect(gpuInfo.webglVersion).toBe(2)
      expect(gpuInfo.supportsWebGL2).toBe(true)
    })

    it('should fall back to WebGL1 when WebGL2 is not available', async () => {
      HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
        if (type === 'webgl') return mockGl
        return null
      })

      mockGl.getParameter.mockReturnValue('Test GPU')

      const gpuInfo = await detectGPU()

      expect(gpuInfo.webglVersion).toBe(1)
      expect(gpuInfo.supportsWebGL2).toBe(false)
    })

    it('should use unmasked renderer when debug extension is available', async () => {
      mockGl.getParameter.mockImplementation((param: number) => {
        switch (param) {
          case 7936: return 'Generic Vendor'
          case 7937: return 'Generic Renderer'
          case 37445: return 'NVIDIA Corporation'
          case 37446: return 'NVIDIA GeForce RTX 4090'
          case 3379: return 16384
          default: return null
        }
      })

      mockGl.getExtension.mockImplementation((name: string) => {
        if (name === 'WEBGL_debug_renderer_info') {
          return {
            UNMASKED_VENDOR_WEBGL: 37445,
            UNMASKED_RENDERER_WEBGL: 37446
          }
        }
        return null
      })

      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl)

      const gpuInfo = await detectGPU()

      expect(gpuInfo.unmaskedVendor).toBe('NVIDIA Corporation')
      expect(gpuInfo.unmaskedRenderer).toBe('NVIDIA GeForce RTX 4090')
      expect(gpuInfo.tier).toBe(PerformanceTier.HIGH)
      expect(gpuInfo.score).toBe(100)
    })
  })

  describe('Performance Tier Detection', () => {
    const testCases = [
      // NVIDIA High-end
      { renderer: 'NVIDIA GeForce RTX 4090', expectedTier: PerformanceTier.HIGH, minScore: 100 },
      { renderer: 'NVIDIA GeForce RTX 3080 Ti', expectedTier: PerformanceTier.HIGH, minScore: 90 },
      { renderer: 'NVIDIA GeForce GTX 1080', expectedTier: PerformanceTier.HIGH, minScore: 75 },

      // NVIDIA Mid-range
      { renderer: 'NVIDIA GeForce RTX 3060', expectedTier: PerformanceTier.MEDIUM, minScore: 70 },
      { renderer: 'NVIDIA GeForce GTX 1650', expectedTier: PerformanceTier.MEDIUM, minScore: 55 },

      // NVIDIA Low-end
      { renderer: 'NVIDIA GeForce GTX 1050', expectedTier: PerformanceTier.LOW, minScore: 40 },
      { renderer: 'NVIDIA GeForce GT 730', expectedTier: PerformanceTier.LOW, minScore: 30 },

      // AMD GPUs
      { renderer: 'AMD Radeon RX 7900 XTX', expectedTier: PerformanceTier.HIGH, minScore: 95 },
      { renderer: 'AMD Radeon RX 6600', expectedTier: PerformanceTier.MEDIUM, minScore: 65 },

      // Intel GPUs
      { renderer: 'Intel Arc A770', expectedTier: PerformanceTier.HIGH, minScore: 70 },
      { renderer: 'Intel Iris Xe Graphics', expectedTier: PerformanceTier.LOW, minScore: 35 },
      { renderer: 'Intel UHD Graphics 630', expectedTier: PerformanceTier.LOW, minScore: 25 },

      // Apple Silicon
      { renderer: 'Apple M2 Max', expectedTier: PerformanceTier.HIGH, minScore: 95 },
      { renderer: 'Apple M1', expectedTier: PerformanceTier.MEDIUM, minScore: 70 },

      // Mobile GPUs
      { renderer: 'Adreno 740', expectedTier: PerformanceTier.MEDIUM, minScore: 60 },
      { renderer: 'Mali-G78 MP14', expectedTier: PerformanceTier.MEDIUM, minScore: 50 },

      // Unknown GPU
      { renderer: 'Unknown Graphics Adapter', expectedTier: PerformanceTier.FALLBACK, minScore: 25 }
    ]

    testCases.forEach(({ renderer, expectedTier, minScore }) => {
      it(`should classify "${renderer}" as ${expectedTier} tier`, async () => {
        mockGl.getParameter.mockImplementation((param: number) => {
          switch (param) {
            case 7937: return renderer
            case 7936: return 'Test Vendor'
            case 3379: return 8192
            default: return null
          }
        })

        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl)

        const gpuInfo = await detectGPU()

        expect(gpuInfo.tier).toBe(expectedTier)
        expect(gpuInfo.score).toBeGreaterThanOrEqual(minScore)
      })
    })

    it('should handle GPU strings with extra spaces and casing variations', async () => {
      const variations = [
        'NVIDIA  GeForce  RTX  3080', // Extra spaces
        'nvidia geforce rtx 3080',     // Lowercase
        'NVIDIA GEFORCE RTX 3080',     // Uppercase
        'nVidia GeForce rtx 3080'      // Mixed case
      ]

      for (const renderer of variations) {
        gpuDetector.resetCache()

        mockGl.getParameter.mockImplementation((param: number) => {
          if (param === 7937) return renderer
          return 'Test'
        })

        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl)

        const gpuInfo = await detectGPU()
        expect(gpuInfo.tier).toBe(PerformanceTier.HIGH)
        expect(gpuInfo.score).toBeGreaterThanOrEqual(90)
      }
    })
  })

  describe('Recommended Settings', () => {
    it('should return high quality settings for HIGH tier', () => {
      const settings = getRecommendedSettings(PerformanceTier.HIGH)

      expect(settings).toEqual({
        shadows: true,
        antialiasing: true,
        postProcessing: true,
        particleCount: 1000,
        textureQuality: 'high',
        renderScale: 1.0
      })
    })

    it('should return medium quality settings for MEDIUM tier', () => {
      const settings = getRecommendedSettings(PerformanceTier.MEDIUM)

      expect(settings).toEqual({
        shadows: true,
        antialiasing: true,
        postProcessing: false,
        particleCount: 500,
        textureQuality: 'medium',
        renderScale: 0.9
      })
    })

    it('should return low quality settings for LOW tier', () => {
      const settings = getRecommendedSettings(PerformanceTier.LOW)

      expect(settings).toEqual({
        shadows: false,
        antialiasing: false,
        postProcessing: false,
        particleCount: 200,
        textureQuality: 'low',
        renderScale: 0.75
      })
    })

    it('should return minimal settings for FALLBACK tier', () => {
      const settings = getRecommendedSettings(PerformanceTier.FALLBACK)

      expect(settings).toEqual({
        shadows: false,
        antialiasing: false,
        postProcessing: false,
        particleCount: 100,
        textureQuality: 'low',
        renderScale: 0.5
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle canvas creation errors gracefully', async () => {
      jest.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('Canvas creation failed')
      })

      const gpuInfo = await detectGPU()

      expect(gpuInfo.tier).toBe(PerformanceTier.FALLBACK)
      expect(gpuInfo.vendor).toBe('Unknown')
    })

    it('should handle WebGL context errors gracefully', async () => {
      HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation(() => {
        throw new Error('WebGL context creation failed')
      })

      const gpuInfo = await detectGPU()

      expect(gpuInfo.tier).toBe(PerformanceTier.FALLBACK)
      expect(gpuInfo.vendor).toBe('Unknown')
    })

    it('should handle getParameter errors gracefully', async () => {
      mockGl.getParameter.mockImplementation(() => {
        throw new Error('getParameter failed')
      })

      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl)

      const gpuInfo = await detectGPU()

      expect(gpuInfo).toBeDefined()
      expect(gpuInfo.tier).toBe(PerformanceTier.FALLBACK)
    })
  })

  describe('Cache Management', () => {
    it('should reset cache when resetCache is called', async () => {
      mockGl.getParameter.mockReturnValue('Test GPU')
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl)

      await detectGPU()
      gpuDetector.resetCache()
      await detectGPU()

      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledTimes(2)
    })

    it('should not create multiple canvases for cached results', async () => {
      mockGl.getParameter.mockReturnValue('Test GPU')
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl)

      await detectGPU()
      await detectGPU()
      await detectGPU()

      expect(document.createElement).toHaveBeenCalledTimes(1)
    })
  })

  describe('GPU Score Calculation', () => {
    it('should assign correct scores to different GPU tiers', async () => {
      const testGPUs = [
        { name: 'RTX 4090', minScore: 100 },
        { name: 'RTX 3070', minScore: 90 },
        { name: 'GTX 1660', minScore: 55 },
        { name: 'Intel HD Graphics', minScore: 20 }
      ]

      for (const gpu of testGPUs) {
        gpuDetector.resetCache()

        mockGl.getParameter.mockImplementation((param: number) => {
          if (param === 7937) return gpu.name
          return 'Test'
        })

        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockGl)

        const gpuInfo = await detectGPU()
        expect(gpuInfo.score).toBeGreaterThanOrEqual(gpu.minScore)
      }
    })
  })
})