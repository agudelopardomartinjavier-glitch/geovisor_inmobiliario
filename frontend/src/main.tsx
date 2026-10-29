import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './index.css'
import App from './App.tsx'
import { lazy, Suspense } from 'react'

// /admin carga un bundle aparte: el visor público no incluye el código del panel
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'))
const esAdmin = window.location.pathname.replace(/\/$/, '') === '/admin'

// Worker servido desde public/ (ver scripts/copiar-worker.mjs)
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`)

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {esAdmin ? <Suspense fallback={null}><AdminApp /></Suspense> : <App />}
    </QueryClientProvider>
  </StrictMode>,
)
