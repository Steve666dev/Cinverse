/**
 * Cloudflare Security & Safeguard Suite for Cineverse
 * 
 * Provides:
 * 1. Cloudflare Real IP resolution (CF-Connecting-IP, CF-Ray, CF-IPCountry)
 * 2. Sliding-window IP Rate Limiting (Anti-DDoS & Scrape Protection)
 * 3. OWASP & Cloudflare Edge HTTP Security Headers (CSP, HSTS, X-Content-Type-Options, etc.)
 * 4. Malicious Scanner & Bad Bot Blocker
 * 5. Strict Parameter Sanitization & Path Traversal Prevention
 */

// In-memory rate limiting map: ip -> { count, windowStart }
const rateLimitMap = new Map();
const CLEANUP_INTERVAL = 60 * 1000; // clean expired IPs every 60s

// Periodic garbage collection for rate limit cache
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now - data.windowStart > 120 * 1000) {
      rateLimitMap.delete(ip);
    }
  }
}, CLEANUP_INTERVAL).unref();

/**
 * Resolves real client IP using Cloudflare headers when available
 */
export function getClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') return cfIp.trim();

  const trueClientIp = req.headers['true-client-ip'];
  if (trueClientIp && typeof trueClientIp === 'string') return trueClientIp.trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Cloudflare Edge Security Headers Middleware
 */
export function cloudflareHeadersMiddleware(req, res, next) {
  // Strip Express fingerprinting
  res.removeHeader('X-Powered-By');

  // Cloudflare Ray ID provenance header (if present)
  const cfRay = req.headers['cf-ray'];
  if (cfRay) {
    res.setHeader('CF-Ray', cfRay);
  }

  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Content Security Policy (allows self, TMDB CDN, Amazon/IMDb images, YouTube embeds, and Fontshare/Google fonts)
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
      "font-src 'self' https://fonts.gstatic.com https://cdn.fontshare.com",
      "img-src 'self' data: blob: https: https://wsrv.nl https://images.weserv.nl https://image.tmdb.org https://m.media-amazon.com https://ia.media-imdb.com https://i.ytimg.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "connect-src 'self' https://api.themoviedb.org https://www.omdbapi.com http://localhost:* ws://localhost:*",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );

  next();
}

/**
 * Cloudflare Bot & Vulnerability Scanner Blocker
 */
export function botSafeguardMiddleware(req, res, next) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  
  // Signature list of automated attack tools and vulnerability scanners
  const badBots = [
    'sqlmap', 'nikto', 'acunetix', 'masscan', 'nmap', 'zgrab',
    'wprecon', 'dirbuster', 'gobuster', 'fuzz', 'qualys', 'nessus'
  ];

  for (const bot of badBots) {
    if (ua.includes(bot)) {
      console.warn(`[Cloudflare Safeguard] Blocked malicious scanner: UA="${ua}" from IP=${getClientIp(req)}`);
      return res.status(403).json({
        ok: false,
        error: 'Access denied: Automated vulnerability scanner blocked by Cloudflare Safeguard.'
      });
    }
  }

  next();
}

/**
 * Factory for IP-based Rate Limiting (DDoS & Brute-Force Safeguard)
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // default 1 minute
  const max = options.max || 120; // default 120 reqs/min
  const message = options.message || 'Too many requests, please try again shortly.';

  return (req, res, next) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const key = `${ip}:${options.name || 'general'}`;

    let entry = rateLimitMap.get(key);
    if (!entry || now - entry.windowStart > windowMs) {
      entry = { count: 1, windowStart: now };
      rateLimitMap.set(key, entry);
    } else {
      entry.count++;
    }

    const remaining = Math.max(0, max - entry.count);
    const resetTime = Math.ceil((entry.windowStart + windowMs - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (entry.count > max) {
      res.setHeader('Retry-After', resetTime);
      console.warn(`[Cloudflare Safeguard] Rate limit exceeded by IP=${ip} for ${options.name || 'general'}`);
      return res.status(429).json({
        ok: false,
        error: message,
        retryAfterSeconds: resetTime
      });
    }

    next();
  };
}

/**
 * Input sanitization helper to neutralize path traversals, null bytes, and script injection
 */
export function sanitizeInput(val, maxLength = 100) {
  if (typeof val !== 'string') return '';
  return val
    .replace(/\0/g, '')               // strip null bytes
    .replace(/\.\./g, '')              // neutralize path traversal attempts
    .replace(/[\r\n\x00-\x1f]/g, '')   // strip control characters
    .trim()
    .slice(0, maxLength);
}

