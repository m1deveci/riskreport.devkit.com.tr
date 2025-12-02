import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress known non-critical console errors in production
const originalError = console.error;
const suppressedPatterns = [
  /profile\/picture/,  // Profile picture 404 errors
  /batch-read.*403/,   // Batch read 403 errors
];

console.error = function(...args: any[]) {
  const message = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');

  // Check if error matches suppressed patterns
  const shouldSuppress = suppressedPatterns.some(pattern => pattern.test(message));

  if (!shouldSuppress) {
    originalError.apply(console, args);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
