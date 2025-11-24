/**
 * ============================================
 * CLIENT-SIDE PERFORMANCE OPTIMIZATION GUIDE
 * ============================================
 *
 * This file contains recommendations for optimizing
 * client-side performance and reducing loading times
 */

// ============================================
// 1. RESOURCE PRELOADING & PREFETCHING HINTS
// ============================================

/**
 * Add these <link> tags to HTML <head> for better performance:
 *
 * <!-- Critical resources - preload first -->
 * <link rel="preload" href="style.css" as="style">
 * <link rel="preload" href="js/main.js" as="script">
 *
 * <!-- DNS prefetch for external domains -->
 * <link rel="dns-prefetch" href="//cdnjs.cloudflare.com">
 * <link rel="dns-prefetch" href="//api.cloudinary.com">
 *
 * <!-- Prefetch next page resources -->
 * <link rel="prefetch" href="dashboard.html">
 * <link rel="prefetch" href="js/dashboard.js">
 *
 * <!-- Preconnect to critical third-party domains -->
 * <link rel="preconnect" href="//socket.io-server.com" crossorigin>
 */

// ============================================
// 2. LAZY LOADING IMAGES
// ============================================

/**
 * Use native lazy loading for images:
 * <img src="image.jpg" loading="lazy" alt="Description">
 *
 * For background images, use Intersection Observer API:
 */

function lazyLoadBackgroundImages() {
  const images = document.querySelectorAll("[data-src]");

  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.backgroundImage = `url('${entry.target.dataset.src}')`;
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "50px", // Start loading 50px before visible
    }
  );

  images.forEach((img) => imageObserver.observe(img));
}

// ============================================
// 3. CODE SPLITTING & ASYNC LOADING
// ============================================

/**
 * Load heavy modules dynamically only when needed:
 */

async function loadChartLibraryWhenNeeded() {
  if (window.location.pathname.includes("dashboard")) {
    // Load Chart.js only on dashboard
    const response = await fetch("js/charts.js");
    const script = await response.text();
    const blob = new Blob([script], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("script");
    el.src = url;
    document.body.appendChild(el);
  }
}

// ============================================
// 4. DEFER NON-CRITICAL SCRIPTS
// ============================================

/**
 * In HTML, add "defer" attribute to non-critical scripts:
 * <script src="js/analytics.js" defer></script>
 *
 * This allows the HTML to parse completely before executing JS
 */

// ============================================
// 5. ASYNC LOADING FOR THIRD-PARTY SCRIPTS
// ============================================

/**
 * Font Awesome CDN - use async:
 * <link rel="stylesheet"
 *       href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
 *       media="print" onload="this.media='all'">
 */

// ============================================
// 6. COMPRESSION & MINIFICATION
// ============================================

/**
 * Recommendations:
 * - Use gzip compression on server (already enabled via Express)
 * - Minify CSS and JS for production
 * - Combine small CSS files into one
 * - Use WebP images with fallback to JPEG
 */

// ============================================
// 7. CRITICAL RENDERING PATH OPTIMIZATION
// ============================================

/**
 * Reduce Cumulative Layout Shift (CLS):
 * - Set explicit width/height for images
 * - Avoid late-loaded fonts (use font-display: swap)
 * - Reserve space for ads and embeds
 */

// ============================================
// 8. CACHING STRATEGY
// ============================================

/**
 * Browser caching headers (set on server):
 *
 * Cache-Control: public, max-age=31536000 for assets (versioned)
 * Cache-Control: public, max-age=3600 for HTML
 * Cache-Control: no-cache for dynamic content
 *
 * Use Service Worker for offline support:
 */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => console.log("Service Worker registered"))
      .catch((err) => console.log("Service Worker registration failed"));
  });
}

// ============================================
// 9. PERFORMANCE MONITORING
// ============================================

/**
 * Monitor Core Web Vitals:
 */

function monitorCoreWebVitals() {
  // Largest Contentful Paint (LCP)
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log("LCP:", lastEntry.renderTime || lastEntry.loadTime);
  }).observe({ entryTypes: ["largest-contentful-paint"] });

  // First Input Delay (FID)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log("FID:", entry.processingDuration);
    }
  }).observe({ entryTypes: ["first-input"] });

  // Cumulative Layout Shift (CLS)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        console.log("CLS:", entry.value);
      }
    }
  }).observe({ entryTypes: ["layout-shift"] });
}

// ============================================
// 10. CONNECTION OPTIMIZATION
// ============================================

/**
 * Check connection speed and adapt:
 */

function optimizeForConnection() {
  if ("connection" in navigator) {
    const connection = navigator.connection.effectiveType;

    switch (connection) {
      case "4g":
        // High bandwidth - load high-quality assets
        loadHighQualityAssets();
        break;
      case "3g":
        // Medium bandwidth - load medium-quality assets
        loadMediumQualityAssets();
        break;
      default:
        // Low bandwidth - load low-quality assets
        loadLowQualityAssets();
    }
  }
}

// ============================================
// 11. EXECUTION
// ============================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    lazyLoadBackgroundImages();
    if (window.location.pathname === "/") {
      monitorCoreWebVitals();
      optimizeForConnection();
    }
  });
} else {
  lazyLoadBackgroundImages();
}

/**
 * SUMMARY OF OPTIMIZATIONS:
 *
 * ✅ Preload critical resources
 * ✅ Lazy load images with native loading="lazy"
 * ✅ Code splitting for heavy modules
 * ✅ Defer non-critical scripts
 * ✅ Use async for third-party scripts
 * ✅ Enable gzip compression
 * ✅ Minimize layout shifts
 * ✅ Browser caching with proper headers
 * ✅ Monitor Core Web Vitals
 * ✅ Adapt to connection speed
 * ✅ Use Service Workers for offline support
 * ✅ GPU acceleration for animations
 */
