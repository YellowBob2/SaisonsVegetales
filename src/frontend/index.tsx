import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';

declare global {
  interface Window {
    __CLERK_PUBLISHABLE_KEY__?: string;
  }
}

createRoot(document.getElementById('root')!).render(
    <ClerkProvider publishableKey={window.__CLERK_PUBLISHABLE_KEY__ ?? ''}>
        <App />
    </ClerkProvider>
);