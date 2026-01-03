/**
 * Suppress known third-party library warnings that we can't fix directly
 * These warnings are from the 100ms SDK and other dependencies
 */

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  const originalWarn = console.warn;
  const originalError = console.error;

  // Patterns to suppress
  const suppressPatterns = [
    /Form submission canceled because the form is not connected/,
    /Multiple versions of @tldraw\/state detected/,
    /\[DEPRECATED\] Default export is.*deprecated/,
    /zustand.*deprecated/,
    /CPUPressureMonitor.*Failed to initialize/,
    /Permissions policy violation: compute-pressure/,
  ];

  console.warn = function (...args) {
    const message = args.join(' ');
    const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };

  console.error = function (...args) {
    const message = args.join(' ');
    const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
    if (!shouldSuppress) {
      originalError.apply(console, args);
    }
  };
}

