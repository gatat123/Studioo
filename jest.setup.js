// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3001'

// Mock WebGL2RenderingContext
global.WebGL2RenderingContext = class WebGL2RenderingContext {
  constructor() {}
}

// Mock WebGLRenderingContext
global.WebGLRenderingContext = class WebGLRenderingContext {
  constructor() {}
}

// Mock WebGL context for GPU detection tests
HTMLCanvasElement.prototype.getContext = jest.fn(function(contextType) {
  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
    const gl = {
      VENDOR: 7936,
      RENDERER: 7937,
      MAX_TEXTURE_SIZE: 3379,
      getParameter: jest.fn((param) => {
        const params = {
          7936: 'Mock Vendor', // VENDOR
          7937: 'Mock Renderer', // RENDERER
          3379: 4096, // MAX_TEXTURE_SIZE
        }
        return params[param] || null
      }),
      getExtension: jest.fn((name) => {
        if (name === 'WEBGL_debug_renderer_info') {
          return {
            UNMASKED_VENDOR_WEBGL: 37445,
            UNMASKED_RENDERER_WEBGL: 37446,
          }
        }
        return null
      }),
    }

    // Set the correct prototype based on context type
    if (contextType === 'webgl2') {
      Object.setPrototypeOf(gl, global.WebGL2RenderingContext.prototype)
    } else {
      Object.setPrototypeOf(gl, global.WebGLRenderingContext.prototype)
    }

    return gl
  }
  return null
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 0)
  return 1
})

global.cancelAnimationFrame = jest.fn()

// Mock performance.now()
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}