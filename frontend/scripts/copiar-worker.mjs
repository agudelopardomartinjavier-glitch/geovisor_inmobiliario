// Copia el worker de MapLibre a public/ para servirlo sin transformar (en dev Vite le inyecta imports de /@vite/client y falla).
import { copyFileSync, mkdirSync } from 'node:fs'
const dist = 'node_modules/maplibre-gl/dist'
mkdirSync('public/maplibre', { recursive: true })
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(`${dist}/${f}`, `public/maplibre/${f}`)
