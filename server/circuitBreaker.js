/**
 * Production Circuit Breaker & Resiliency Manager
 * Implements Google Cloud's 10 Startup Engineering Principles (Questions 4, 7 & 10)
 * 
 * - Failure threshold detection & circuit tripping (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
 * - Fast-fail to prevent thread starvation and connection pool exhaustion
 * - Exponential backoff with Full Jitter to eliminate thundering herd on upstream 429/5xx
 * - Metrics telemetry for production observability
 */

export class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'UpstreamAPI';
    this.failureThreshold = options.failureThreshold || 5; // trip after 5 consecutive failures
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;  // 30 seconds cooldown before half-open probe
    
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.totalTripped = 0;
  }

  isOpen() {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.lastFailureTime || 0);
      if (elapsed > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.warn(`[Circuit Breaker: ${this.name}] Cooldown elapsed (${elapsed}ms). Transitioning to HALF_OPEN probe.`);
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.successCount++;
    this.lastSuccessTime = Date.now();
    if (this.state === 'HALF_OPEN') {
      console.log(`[Circuit Breaker: ${this.name}] Probe succeeded! Circuit recovered to CLOSED.`);
      this.state = 'CLOSED';
    }
  }

  recordFailure(err) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      console.warn(`[Circuit Breaker: ${this.name}] Half-open probe failed: ${err?.message || err}. Re-tripping to OPEN.`);
      this.state = 'OPEN';
      this.totalTripped++;
    } else if (this.failureCount >= this.failureThreshold && this.state === 'CLOSED') {
      console.error(`[Circuit Breaker: ${this.name}] Tripped! Reached ${this.failureCount} consecutive failures. Transitioning to OPEN.`);
      this.state = 'OPEN';
      this.totalTripped++;
    }
  }

  getMetrics() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalTripped: this.totalTripped,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      lastSuccessTime: this.lastSuccessTime ? new Date(this.lastSuccessTime).toISOString() : null,
    };
  }
}

/**
 * Executes a network call with Exponential Backoff + Full Jitter (Google Cloud Best Practice)
 * Formula: delay = random(0, min(maxBackoffMs, baseMs * 2^(attempt - 1)))
 */
export async function fetchWithFullJitterRetry(url, options = {}, retries = 3, baseBackoffMs = 500, maxBackoffMs = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      // Handle rate limits (429) or upstream outages (500+)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const maxWait = Math.min(maxBackoffMs, baseBackoffMs * Math.pow(2, attempt - 1));
          // Full Jitter: evenly distributed between 0 and maxWait
          const jitteredDelay = Math.floor(Math.random() * maxWait);
          console.warn(`[Backoff Retry] Upstream HTTP ${response.status} on ${url}. Attempt ${attempt}/${retries}. Retrying in ${jitteredDelay}ms...`);
          await new Promise(r => setTimeout(r, jitteredDelay));
          continue;
        }
      }
      return response;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt < retries) {
        const maxWait = Math.min(maxBackoffMs, baseBackoffMs * Math.pow(2, attempt - 1));
        const jitteredDelay = Math.floor(Math.random() * maxWait);
        console.warn(`[Backoff Retry] Network error on ${url}: ${err.message}. Attempt ${attempt}/${retries}. Retrying in ${jitteredDelay}ms...`);
        await new Promise(r => setTimeout(r, jitteredDelay));
        continue;
      }
      throw err;
    }
  }
}

