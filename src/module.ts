import { defineNuxtModule, createResolver, addImports } from '@nuxt/kit'

// Module options TypeScript interface definition
export interface ModuleOptions { }

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@bushidoproject/hashconnect',
    configKey: 'hashconnect',
    compatibility: {
      nuxt: "^3.0.0"
    }
  },
  defaults: {},
  setup() {
    const resolver = createResolver(import.meta.url)

    addImports({
      name: "HashConnect",
      from: resolver.resolve("./runtime/hashconnect")
    })
  }
})
