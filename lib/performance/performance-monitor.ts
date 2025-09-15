/**
 * Performance Monitoring System
 * Real-time FPS monitoring and performance metrics collection
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory?: {
    used: number;
    limit: number;
    percentage: number;
  };
  timestamp: number;
}

export interface PerformanceThresholds {
  targetFPS: number;
  minFPS: number;
  criticalFPS: number;
  memoryWarningThreshold: number; // percentage
}

export type PerformanceCallback = (metrics: PerformanceMetrics) => void;

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  targetFPS: 60,
  minFPS: 30,
  criticalFPS: 20,
  memoryWarningThreshold: 80
};

class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;
  private frameTime: number = 0;
  private frameHistory: number[] = [];
  private readonly historySize: number = 60;

  private isMonitoring: boolean = false;
  private animationFrameId: number | null = null;
  private callbacks: Set<PerformanceCallback> = new Set();
  private thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS;

  // Performance metrics smoothing
  private smoothingFactor: number = 0.9;
  private smoothedFPS: number = 60;

  // Metrics collection interval
  private metricsInterval: number | null = null;
  private readonly metricsIntervalMs: number = 100;

  /**
   * Start monitoring performance
   */
  public start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frameHistory = [];

    // Start frame monitoring
    this.monitorFrame();

    // Start metrics collection interval
    this.startMetricsCollection();
  }

  /**
   * Stop monitoring performance
   */
  public stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.metricsInterval !== null) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Monitor single frame
   */
  private monitorFrame = (): void => {
    if (!this.isMonitoring) {
      return;
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    // Calculate instantaneous FPS
    if (deltaTime > 0) {
      const instantFPS = 1000 / deltaTime;

      // Apply exponential smoothing
      this.smoothedFPS = this.smoothedFPS * this.smoothingFactor +
                         instantFPS * (1 - this.smoothingFactor);

      this.fps = Math.round(this.smoothedFPS);
      this.frameTime = deltaTime;

      // Add to history
      this.frameHistory.push(instantFPS);
      if (this.frameHistory.length > this.historySize) {
        this.frameHistory.shift();
      }
    }

    this.lastTime = currentTime;
    this.frameCount++;

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.monitorFrame);
  };

  /**
   * Start metrics collection interval
   */
  private startMetricsCollection(): void {
    this.metricsInterval = window.setInterval(() => {
      const metrics = this.getMetrics();
      this.notifyCallbacks(metrics);
    }, this.metricsIntervalMs);
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      fps: this.fps,
      frameTime: this.frameTime,
      timestamp: Date.now()
    };

    // Add memory metrics if available
    interface PerformanceMemory {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
      totalJSHeapSize?: number;
    }

    if ('memory' in performance && (performance as { memory?: PerformanceMemory }).memory) {
      const memoryInfo = (performance as { memory: PerformanceMemory }).memory;
      metrics.memory = {
        used: memoryInfo.usedJSHeapSize,
        limit: memoryInfo.jsHeapSizeLimit,
        percentage: (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100
      };
    }

    return metrics;
  }

  /**
   * Get average FPS from history
   */
  public getAverageFPS(): number {
    if (this.frameHistory.length === 0) {
      return this.fps;
    }

    const sum = this.frameHistory.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / this.frameHistory.length);
  }

  /**
   * Get FPS statistics
   */
  public getStatistics(): {
    current: number;
    average: number;
    min: number;
    max: number;
    percentile95: number;
  } {
    const sortedHistory = [...this.frameHistory].sort((a, b) => a - b);
    const percentile95Index = Math.floor(sortedHistory.length * 0.95);

    return {
      current: this.fps,
      average: this.getAverageFPS(),
      min: sortedHistory[0] || 0,
      max: sortedHistory[sortedHistory.length - 1] || 0,
      percentile95: sortedHistory[percentile95Index] || 0
    };
  }

  /**
   * Check if performance is below threshold
   */
  public isPerformanceDegraded(): boolean {
    return this.fps < this.thresholds.minFPS;
  }

  /**
   * Check if performance is critical
   */
  public isPerformanceCritical(): boolean {
    return this.fps < this.thresholds.criticalFPS;
  }

  /**
   * Check if memory usage is high
   */
  public isMemoryWarning(): boolean {
    const metrics = this.getMetrics();
    if (!metrics.memory) {
      return false;
    }
    return metrics.memory.percentage > this.thresholds.memoryWarningThreshold;
  }

  /**
   * Add callback for performance updates
   */
  public addCallback(callback: PerformanceCallback): void {
    this.callbacks.add(callback);
  }

  /**
   * Remove callback
   */
  public removeCallback(callback: PerformanceCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(metrics: PerformanceMetrics): void {
    this.callbacks.forEach(callback => {
      try {
        callback(metrics);
      } catch {
        
      }
    });
  }

  /**
   * Set performance thresholds
   */
  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  /**
   * Reset monitor
   */
  public reset(): void {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.frameTime = 0;
    this.frameHistory = [];
    this.smoothedFPS = 60;
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    const targetFPS = this.thresholds.targetFPS;
    const currentFPS = this.getAverageFPS();

    if (currentFPS >= targetFPS) {
      return 100;
    }

    if (currentFPS <= this.thresholds.criticalFPS) {
      return 0;
    }

    // Linear interpolation between critical and target
    const range = targetFPS - this.thresholds.criticalFPS;
    const offset = currentFPS - this.thresholds.criticalFPS;
    return Math.round((offset / range) * 100);
  }

  /**
   * Get recommended quality level based on performance
   */
  public getRecommendedQuality(): 'increase' | 'maintain' | 'decrease' {
    const score = this.getPerformanceScore();
    const avgFPS = this.getAverageFPS();

    // Can increase quality if consistently above target
    if (score >= 95 && avgFPS > this.thresholds.targetFPS * 1.2) {
      return 'increase';
    }

    // Should decrease quality if below minimum
    if (score < 50 || avgFPS < this.thresholds.minFPS) {
      return 'decrease';
    }

    // Maintain current quality
    return 'maintain';
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const startMonitoring = () => performanceMonitor.start();
export const stopMonitoring = () => performanceMonitor.stop();
export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const getPerformanceScore = () => performanceMonitor.getPerformanceScore();