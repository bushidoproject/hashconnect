import { addImports, createResolver, defineNuxtModule } from 'nuxt/kit'

const module = defineNuxtModule({
  meta: {
    name: "@nuxt/hashconnect",
    configKey: "hashconnect",
    compatibility: {
      nuxt: "^3.0.0"
    }
  },
  defaults: {},
  setup() {
    const { resolve } = createResolver(import.meta.url)

    addImports({
      name: "HashConnect",
      from: resolve("runtime/hashconnect")
    })
  }
})

export { module as default }
