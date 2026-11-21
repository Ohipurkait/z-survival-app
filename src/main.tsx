import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Service Worker for 100% offline Airplane Mode resilience
registerSW({
  immediate: true,
  onRegisterError(error) {
    console.warn('Service Worker registration deferred:', error);
  },
});

createRoot(document.getElementById('root')!).render(<App />);
