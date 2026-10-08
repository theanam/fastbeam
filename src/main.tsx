import '@fontsource/bricolage-grotesque/700.css'
import '@fontsource/bricolage-grotesque/800.css'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import '@fontsource/figtree/700.css'
import '@fontsource/jetbrains-mono/700.css'
import './ui/index.css'

import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import { boot } from './boot'
import { logger } from './state/log'
import { initRouter } from './state/router'
import { initTheme } from './state/settings'

initTheme()
initRouter()

const root = document.getElementById('app')
if (!root) throw new Error('fastbeam: #app missing')
render(<App />, root)

if (import.meta.env.PROD) {
  const L = logger('sw')
  registerSW({
    immediate: true,
    onRegisteredSW(url, reg) {
      L.info('service worker registered', { url, controlling: !!navigator.serviceWorker.controller, active: !!reg?.active })
    },
    onRegisterError(err) {
      L.error('service worker registration failed', err)
    },
    onOfflineReady() {
      L.info('app shell cached: works offline now')
    },
    onNeedRefresh() {
      L.info('a new version is ready; it activates on the next load')
    },
  })
} else {
  logger('sw').debug('dev server: service worker disabled (streamed downloads fall back to Blob)')
}

boot()
