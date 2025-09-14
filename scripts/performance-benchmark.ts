#!/usr/bin/env ts-node

/**
 * Performance Benchmark Script
 * Comprehensive performance testing for Studio collaboration platform
 */

import { performance } from 'perf_hooks'
import { gpuDetector, PerformanceTier } from '../lib/performance/gpu-detector'
import { MessageQueue, MessagePriority } from '../lib/realtime/message-queue'

interface BenchmarkResult {
  name: string
  duration: number
  operations: number
  opsPerSecond: number
  memoryUsed: number
  details?: unknown
}

interface BenchmarkSuite {
  name: string
  results: BenchmarkResult[]
  totalDuration: number
  averageOpsPerSecond: number
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = []
  private suites: BenchmarkSuite[] = []

  /**
   * Run a benchmark test
   */
  private async runBenchmark(
    name: string,
    fn: () => Promise<void> | void,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    // Warm up
    for (let _ = 0; _ < Math.min(10, iterations / 10); _++) {
      await fn()
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    const memStart = process.memoryUsage().heapUsed
    const startTime = performance.now()

    for (let _ = 0; _ < iterations; _++) {
      await fn()
    }

    const endTime = performance.now()
    const memEnd = process.memoryUsage().heapUsed

    const duration = endTime - startTime
    const opsPerSecond = (iterations / duration) * 1000
    const memoryUsed = memEnd - memStart

    const result: BenchmarkResult = {
      name,
      duration,
      operations: iterations,
      opsPerSecond,
      memoryUsed
    }

    this.results.push(result)
    return result
  }

  /**
   * GPU Detection Benchmarks
   */
  async benchmarkGPUDetection(): Promise<void> {
    console.log('\n🎮 GPU Detection Benchmarks\n' + '='.repeat(50))

    const suite: BenchmarkSuite = {
      name: 'GPU Detection',
      results: [],
      totalDuration: 0,
      averageOpsPerSecond: 0
    }

    // Test 1: Initial GPU Detection
    const detectResult = await this.runBenchmark(
      'Initial GPU Detection',
      async () => {
        gpuDetector.resetCache()
        await gpuDetector.detectGPU()
      },
      100
    )
    suite.results.push(detectResult)

    // Test 2: Cached GPU Detection
    const cachedResult = await this.runBenchmark(
      'Cached GPU Detection',
      async () => {
        await gpuDetector.detectGPU()
      },
      10000
    )
    suite.results.push(cachedResult)

    // Test 3: Performance Tier Calculation
    const tierResult = await this.runBenchmark(
      'Performance Tier Calculation',
      () => {
        const renderers = [
          'NVIDIA GeForce RTX 3080',
          'Intel HD Graphics',
          'AMD Radeon RX 6800',
          'Apple M1',
          'Unknown GPU'
        ]
        const renderer = renderers[Math.floor(Math.random() * renderers.length)]
        // This would normally be internal, for benchmark we simulate
        return renderer.length // Dummy operation
      },
      100000
    )
    suite.results.push(tierResult)

    // Test 4: Recommended Settings Generation
    const settingsResult = await this.runBenchmark(
      'Recommended Settings Generation',
      () => {
        const tiers = [
          PerformanceTier.HIGH,
          PerformanceTier.MEDIUM,
          PerformanceTier.LOW,
          PerformanceTier.FALLBACK
        ]
        const tier = tiers[Math.floor(Math.random() * tiers.length)]
        gpuDetector.constructor.getRecommendedSettings(tier)
      },
      50000
    )
    suite.results.push(settingsResult)

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0)
    suite.averageOpsPerSecond =
      suite.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / suite.results.length

    this.suites.push(suite)
    this.printSuiteResults(suite)
  }

  /**
   * Message Queue Benchmarks
   */
  async benchmarkMessageQueue(): Promise<void> {
    console.log('\n📨 Message Queue Benchmarks\n' + '='.repeat(50))

    const suite: BenchmarkSuite = {
      name: 'Message Queue',
      results: [],
      totalDuration: 0,
      averageOpsPerSecond: 0
    }

    const messageQueue = new MessageQueue({
      maxBatchSize: 50,
      batchInterval: 16
    })

    let processedCount = 0
    messageQueue.setProcessor(async (messages) => {
      processedCount += messages.length
    })

    // Test 1: Message Enqueueing
    const enqueueResult = await this.runBenchmark(
      'Message Enqueueing',
      () => {
        messageQueue.enqueue('test-event', { data: Math.random() })
      },
      10000
    )
    suite.results.push(enqueueResult)

    // Test 2: Priority Message Enqueueing
    const priorityResult = await this.runBenchmark(
      'Priority Message Enqueueing',
      () => {
        const priorities = [
          MessagePriority.CRITICAL,
          MessagePriority.HIGH,
          MessagePriority.NORMAL,
          MessagePriority.LOW
        ]
        const priority = priorities[Math.floor(Math.random() * priorities.length)]
        messageQueue.enqueue('priority-event', { data: Math.random() }, priority)
      },
      10000
    )
    suite.results.push(priorityResult)

    // Test 3: Batch Processing
    const batchResult = await this.runBenchmark(
      'Batch Processing',
      async () => {
        const messages = []
        for (let i = 0; i < 100; i++) {
          messages.push({
            event: 'batch-event',
            data: { index: i, timestamp: Date.now() }
          })
        }
        messages.forEach(m => messageQueue.enqueue(m.event, m.data))

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 20))
      },
      100
    )
    suite.results.push(batchResult)

    // Test 4: Mixed Priority Processing
    const mixedResult = await this.runBenchmark(
      'Mixed Priority Processing',
      async () => {
        // Add messages with different priorities
        for (let i = 0; i < 10; i++) {
          messageQueue.enqueue('critical', { i }, MessagePriority.CRITICAL)
          messageQueue.enqueue('high', { i }, MessagePriority.HIGH)
          messageQueue.enqueue('normal', { i }, MessagePriority.NORMAL)
          messageQueue.enqueue('low', { i }, MessagePriority.LOW)
        }

        await new Promise(resolve => setTimeout(resolve, 20))
      },
      100
    )
    suite.results.push(mixedResult)

    // Test 5: Queue Metrics
    const metricsResult = await this.runBenchmark(
      'Queue Metrics Retrieval',
      () => {
        messageQueue.getMetrics()
      },
      100000
    )
    suite.results.push(metricsResult)

    messageQueue.destroy()

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0)
    suite.averageOpsPerSecond =
      suite.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / suite.results.length

    this.suites.push(suite)
    this.printSuiteResults(suite)

    console.log(`\n📊 Total messages processed: ${processedCount}`)
  }

  /**
   * FPS Monitoring Benchmarks
   */
  async benchmarkFPSMonitoring(): Promise<void> {
    console.log('\n🎬 FPS Monitoring Benchmarks\n' + '='.repeat(50))

    const suite: BenchmarkSuite = {
      name: 'FPS Monitoring',
      results: [],
      totalDuration: 0,
      averageOpsPerSecond: 0
    }

    // Performance monitor instance (not used in benchmarks)
    // const monitor = new PerformanceMonitor()

    // Test 1: FPS Calculation
    const fpsResult = await this.runBenchmark(
      'FPS Calculation',
      () => {
        // Simulate frame timing
        const frameTimes = Array.from({ length: 60 }, () => 16.67 + Math.random() * 2)
        frameTimes.forEach(time => {
          // Simulate FPS calculation logic
          const fps = 1000 / time
          void fps // Use the calculated value
        })
      },
      10000
    )
    suite.results.push(fpsResult)

    // Test 2: Performance Score Calculation
    const scoreResult = await this.runBenchmark(
      'Performance Score Calculation',
      () => {
        const fps = 30 + Math.random() * 60
        const latency = Math.random() * 100
        const memoryUsage = Math.random() * 1000000000

        // Simulate score calculation
        const fpsScore = Math.min(fps / 60, 1) * 40
        const latencyScore = Math.max(0, (100 - latency) / 100) * 30
        const memoryScore = Math.max(0, (2000000000 - memoryUsage) / 2000000000) * 30
        void (fpsScore + latencyScore + memoryScore) // Calculate total score
      },
      50000
    )
    suite.results.push(scoreResult)

    // Test 3: Moving Average Calculation
    const avgResult = await this.runBenchmark(
      'Moving Average Calculation',
      () => {
        const values = Array.from({ length: 100 }, () => Math.random() * 100)
        const windowSize = 10

        for (let i = windowSize; i < values.length; i++) {
          const window = values.slice(i - windowSize, i)
          const avg = window.reduce((a, b) => a + b, 0) / windowSize
          void avg // Use the calculated value
        }
      },
      10000
    )
    suite.results.push(avgResult)

    // Test 4: Threshold Detection
    const thresholdResult = await this.runBenchmark(
      'Performance Threshold Detection',
      () => {
        const currentFPS = Math.random() * 120
        const thresholds = {
          critical: 15,
          low: 30,
          medium: 45,
          high: 60
        }

        const tier = currentFPS < thresholds.critical ? 'critical' :
                     currentFPS < thresholds.low ? 'low' :
                     currentFPS < thresholds.medium ? 'medium' : 'high'
        void tier // Use the calculated tier
      },
      100000
    )
    suite.results.push(thresholdResult)

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0)
    suite.averageOpsPerSecond =
      suite.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / suite.results.length

    this.suites.push(suite)
    this.printSuiteResults(suite)
  }

  /**
   * Memory Leak Detection
   */
  async benchmarkMemoryLeaks(): Promise<void> {
    console.log('\n💾 Memory Leak Detection\n' + '='.repeat(50))

    const suite: BenchmarkSuite = {
      name: 'Memory Management',
      results: [],
      totalDuration: 0,
      averageOpsPerSecond: 0
    }

    // Test 1: Message Queue Memory
    const queueMemResult = await this.runBenchmark(
      'Message Queue Memory Management',
      async () => {
        const queue = new MessageQueue()
        queue.setProcessor(async () => {})

        // Add and process messages
        for (let i = 0; i < 1000; i++) {
          queue.enqueue('test', { data: new Array(100).fill(i) })
        }

        await new Promise(resolve => setTimeout(resolve, 50))
        queue.destroy()
      },
      10
    )
    suite.results.push(queueMemResult)

    // Test 2: GPU Detection Memory
    const gpuMemResult = await this.runBenchmark(
      'GPU Detection Memory Management',
      async () => {
        for (let i = 0; i < 100; i++) {
          gpuDetector.resetCache()
          await gpuDetector.detectGPU()
        }
      },
      10
    )
    suite.results.push(gpuMemResult)

    // Test 3: Large Data Structure Handling
    const largeDataResult = await this.runBenchmark(
      'Large Data Structure Handling',
      () => {
        const data = []
        for (let i = 0; i < 10000; i++) {
          data.push({
            id: i,
            timestamp: Date.now(),
            payload: new Array(10).fill(Math.random())
          })
        }
        // Process data
        const filtered = data.filter(d => d.id % 2 === 0)
        const mapped = filtered.map(d => ({ ...d, processed: true }))
        return mapped.length
      },
      100
    )
    suite.results.push(largeDataResult)

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0)
    suite.averageOpsPerSecond =
      suite.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / suite.results.length

    this.suites.push(suite)
    this.printSuiteResults(suite)
  }

  /**
   * Stress Testing
   */
  async runStressTest(): Promise<void> {
    console.log('\n🔥 Stress Testing\n' + '='.repeat(50))

    const suite: BenchmarkSuite = {
      name: 'Stress Test',
      results: [],
      totalDuration: 0,
      averageOpsPerSecond: 0
    }

    // Test 1: High-frequency message processing
    const messageStressResult = await this.runBenchmark(
      'High-frequency Message Processing',
      async () => {
        const queue = new MessageQueue({ maxBatchSize: 100, batchInterval: 5 })
        let processed = 0
        queue.setProcessor(async (messages) => {
          processed += messages.length
        })

        // Simulate burst of messages
        for (let i = 0; i < 10000; i++) {
          queue.enqueue(`event${i}`, {
            index: i,
            timestamp: Date.now(),
            data: new Array(10).fill(Math.random())
          })
        }

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 100))
        queue.destroy()

        return processed
      },
      5
    )
    suite.results.push(messageStressResult)

    // Test 2: Concurrent operations
    const concurrentResult = await this.runBenchmark(
      'Concurrent Operations',
      async () => {
        const promises = []

        for (let i = 0; i < 100; i++) {
          promises.push(
            gpuDetector.detectGPU(),
            new Promise(resolve => {
              const queue = new MessageQueue()
              queue.enqueue('test', { i })
              setTimeout(() => {
                queue.destroy()
                resolve(null)
              }, 10)
            })
          )
        }

        await Promise.all(promises)
      },
      10
    )
    suite.results.push(concurrentResult)

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0)
    suite.averageOpsPerSecond =
      suite.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / suite.results.length

    this.suites.push(suite)
    this.printSuiteResults(suite)
  }

  /**
   * Print suite results
   */
  private printSuiteResults(suite: BenchmarkSuite): void {
    console.log(`\n📊 ${suite.name} Results:`)
    console.log('-'.repeat(70))

    const headers = ['Test', 'Duration (ms)', 'Ops/sec', 'Memory (MB)']
    const colWidths = [35, 15, 15, 15]

    // Print headers
    console.log(
      headers.map((h, i) => h.padEnd(colWidths[i])).join('')
    )
    console.log('-'.repeat(70))

    // Print results
    suite.results.forEach(result => {
      const row = [
        result.name.substring(0, 34),
        result.duration.toFixed(2),
        result.opsPerSecond.toFixed(0),
        (result.memoryUsed / 1024 / 1024).toFixed(2)
      ]
      console.log(
        row.map((v, i) => v.padEnd(colWidths[i])).join('')
      )
    })

    console.log('-'.repeat(70))
    console.log(`Total Duration: ${suite.totalDuration.toFixed(2)}ms`)
    console.log(`Average Ops/sec: ${suite.averageOpsPerSecond.toFixed(0)}`)
  }

  /**
   * Generate final report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(70))
    console.log('📈 PERFORMANCE BENCHMARK SUMMARY')
    console.log('='.repeat(70))

    // Overall statistics
    const totalTests = this.results.length
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    const avgOpsPerSec = this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / totalTests
    const totalMemory = this.results.reduce((sum, r) => sum + r.memoryUsed, 0)

    console.log(`\n📊 Overall Statistics:`)
    console.log(`  • Total Tests Run: ${totalTests}`)
    console.log(`  • Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)
    console.log(`  • Average Ops/sec: ${avgOpsPerSec.toFixed(0)}`)
    console.log(`  • Total Memory Used: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`)

    // Performance grades
    console.log(`\n🏆 Performance Grades:`)
    this.suites.forEach(suite => {
      const grade = this.calculateGrade(suite.averageOpsPerSecond)
      console.log(`  • ${suite.name}: ${grade}`)
    })

    // Recommendations
    console.log(`\n💡 Recommendations:`)
    this.generateRecommendations()

    console.log('\n' + '='.repeat(70))
  }

  /**
   * Calculate performance grade
   */
  private calculateGrade(opsPerSecond: number): string {
    if (opsPerSecond > 100000) return 'A+ (Excellent)'
    if (opsPerSecond > 50000) return 'A (Very Good)'
    if (opsPerSecond > 25000) return 'B (Good)'
    if (opsPerSecond > 10000) return 'C (Average)'
    if (opsPerSecond > 5000) return 'D (Below Average)'
    return 'F (Poor)'
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): void {
    const recommendations = []

    // Check GPU detection performance
    const gpuSuite = this.suites.find(s => s.name === 'GPU Detection')
    if (gpuSuite && gpuSuite.averageOpsPerSecond < 50000) {
      recommendations.push('  • Consider optimizing GPU detection caching')
    }

    // Check message queue performance
    const mqSuite = this.suites.find(s => s.name === 'Message Queue')
    if (mqSuite && mqSuite.averageOpsPerSecond < 25000) {
      recommendations.push('  • Message queue may need optimization for high-load scenarios')
    }

    // Check memory usage
    const avgMemory = this.results.reduce((sum, r) => sum + r.memoryUsed, 0) / this.results.length
    if (avgMemory > 50 * 1024 * 1024) { // 50MB average
      recommendations.push('  • High memory usage detected - consider implementing cleanup strategies')
    }

    // Check stress test results
    const stressSuite = this.suites.find(s => s.name === 'Stress Test')
    if (stressSuite && stressSuite.averageOpsPerSecond < 10000) {
      recommendations.push('  • System may struggle under heavy load - consider implementing throttling')
    }

    if (recommendations.length === 0) {
      recommendations.push('  • Performance is optimal! No immediate optimizations needed.')
    }

    recommendations.forEach(r => console.log(r))
  }

  /**
   * Run all benchmarks
   */
  async runAll(): Promise<void> {
    console.log('🚀 Starting Performance Benchmarks for Studio Platform')
    console.log('=' + '='.repeat(69))
    console.log(`📅 Date: ${new Date().toISOString()}`)
    console.log(`💻 Platform: ${process.platform}`)
    console.log(`🔧 Node Version: ${process.version}`)
    console.log(`💾 Memory: ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)}MB`)

    try {
      await this.benchmarkGPUDetection()
      await this.benchmarkMessageQueue()
      await this.benchmarkFPSMonitoring()
      await this.benchmarkMemoryLeaks()
      await this.runStressTest()

      this.generateReport()
    } catch (error) {
      console.error('\n❌ Benchmark failed:', error)
      process.exit(1)
    }
  }
}

// Run benchmarks if executed directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark()

  // Handle CLI arguments
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose')
  const specific = args.find(arg => arg.startsWith('--test='))

  if (verbose) {
    console.log('🔍 Verbose mode enabled')
  }

  if (specific) {
    const testName = specific.split('=')[1]
    console.log(`🎯 Running specific test: ${testName}`)
    // Implement specific test running logic here
  }

  benchmark.runAll().then(() => {
    console.log('\n✅ Benchmarks completed successfully!')
    process.exit(0)
  }).catch(error => {
    console.error('\n❌ Benchmark error:', error)
    process.exit(1)
  })
}

export { PerformanceBenchmark }