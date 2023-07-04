
import { ModuleOptions } from './module'

declare module '@nuxt/schema' {
  interface NuxtConfig { ['hashconnect']?: Partial<ModuleOptions> }
  interface NuxtOptions { ['hashconnect']?: ModuleOptions }
}

declare module 'nuxt/schema' {
  interface NuxtConfig { ['hashconnect']?: Partial<ModuleOptions> }
  interface NuxtOptions { ['hashconnect']?: ModuleOptions }
}


export { ModuleOptions, default } from './module'
