import type { App } from 'vue'
import { store } from './modules/store'

export function setupStore(app: App) {
  app.use(store)
}

export * from './modules'
