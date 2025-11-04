const pino = require('pino');
const { Sentry } = require('@sentry/node');
const Metrics = require('@opentelemetry/metrics');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

class Monitoring {
  constructor() {
    // Initialize Pino logger
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    });

    // Initialize Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 1.0,
      });
    }

    // Initialize Prometheus metrics
    this.setupMetrics();
  }

  setupMetrics() {
    const meter = new Metrics.MeterProvider({
      exporter: new PrometheusExporter(),
      interval: 1000,
    }).getMeter('yuga-metrics');

    // Define metrics
    this.metrics = {
      // API metrics
      apiRequests: meter.createCounter('api_requests_total', {
        description: 'Total number of API requests'
      }),
      
      apiLatency: meter.createHistogram('api_latency_seconds', {
        description: 'API request latency'
      }),

      // AI metrics
      modelInvocations: meter.createCounter('ai_model_invocations_total', {
        description: 'Total number of AI model invocations'
      }),

      modelLatency: meter.createHistogram('ai_model_latency_seconds', {
        description: 'AI model inference latency'
      }),

      modelTokens: meter.createCounter('ai_model_tokens_total', {
        description: 'Total number of tokens used'
      }),

      // Queue metrics
      queueJobs: meter.createGauge('queue_jobs', {
        description: 'Number of jobs in queue'
      }),

      queueLatency: meter.createHistogram('queue_job_latency_seconds', {
        description: 'Job processing latency'
      }),

      // Resource metrics
      memoryUsage: meter.createGauge('memory_usage_bytes', {
        description: 'Memory usage in bytes'
      }),

      cpuUsage: meter.createGauge('cpu_usage_percent', {
        description: 'CPU usage percentage'
      })
    };

    // Start resource monitoring
    this.startResourceMonitoring();
  }

  startResourceMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      this.metrics.memoryUsage.set(usage.heapUsed);

      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const cpuPercent = (endUsage.user + endUsage.system) / 1000000; // Convert to percentage
        this.metrics.cpuUsage.set(cpuPercent);
      }, 100);
    }, 1000);
  }

  // Logging methods
  info(msg, data = {}) {
    this.logger.info(data, msg);
  }

  error(msg, error, data = {}) {
    this.logger.error({ ...data, error }, msg);
    if (Sentry) {
      Sentry.captureException(error, {
        extra: data
      });
    }
  }

  warn(msg, data = {}) {
    this.logger.warn(data, msg);
  }

  debug(msg, data = {}) {
    this.logger.debug(data, msg);
  }

  // Metrics methods
  trackApiRequest(path, method, statusCode, duration) {
    this.metrics.apiRequests.add(1, { path, method, status: statusCode });
    this.metrics.apiLatency.record(duration, { path, method });
  }

  trackModelUsage(provider, model, tokens, duration) {
    this.metrics.modelInvocations.add(1, { provider, model });
    this.metrics.modelLatency.record(duration, { provider, model });
    this.metrics.modelTokens.add(tokens, { provider, model });
  }

  trackQueueJob(queue, jobType, status, duration) {
    this.metrics.queueJobs.set(1, { queue, jobType, status });
    this.metrics.queueLatency.record(duration, { queue, jobType });
  }

  // Cost tracking for AI usage
  async trackModelCost(provider, model, tokens, success = true) {
    try {
      // Cost per 1K tokens (example rates)
      const costRates = {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'claude-3': { input: 0.02, output: 0.04 }
      };

      if (costRates[model]) {
        const rate = costRates[model];
        const cost = (tokens.input * rate.input + tokens.output * rate.output) / 1000;

        await this.logger.info({
          type: 'model_cost',
          provider,
          model,
          tokens,
          cost,
          success,
          timestamp: new Date()
        });

        // You could also store this in your database for analysis
        if (this.db) {
          await this.db.collection('model_costs').insertOne({
            provider,
            model,
            tokens,
            cost,
            success,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      this.error('Failed to track model cost', error);
    }
  }
}

module.exports = new Monitoring();