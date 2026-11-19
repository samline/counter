import type { CounterOptions } from '../core/counter.js'
import type { PartFactory } from './controller.js'

const readAnnounce = (element: HTMLElement, options: CounterOptions): string | false => {
  const attribute = element.getAttribute('data-counter-announce')
  const value = attribute === null ? (options.announce ?? false) : attribute.trim() || true
  return value === true || value === 'true' ? '{value}' : value === 'false' ? false : value
}

/* Announcements: one polite live region per document, while a controller uses it. */
let region: HTMLElement | null = null
let speakers = 0
let pending: ReturnType<typeof setTimeout> | undefined

const listen = () => {
  speakers++
  if (region) return
  region = document.createElement('div')
  region.setAttribute('aria-live', 'polite')
  region.setAttribute('aria-atomic', 'true')
  region.setAttribute('data-counter-announcer', '')
  region.style.cssText =
    'position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap'
  document.body.append(region)
}

const unlisten = () => {
  if (--speakers > 0) return
  clearTimeout(pending)
  region?.remove()
  region = null
}

const say = (text: string) => {
  if (!region) return
  // The page may have replaced the body since.
  if (!region.isConnected) document.body.append(region)
  // Empty first, so the same text twice is announced twice.
  region.textContent = ''
  clearTimeout(pending)
  pending = setTimeout(() => region && (region.textContent = text), 100)
}

/** `announce`: read new values in a shared polite live region. */
export const announce: PartFactory = () => {
  const templates = new Map<HTMLElement, string | false>()
  // Hold the shared live region while any number of this controller may announce.
  let speaking = false
  return {
    read: (element, options) => {
      const template = readAnnounce(element, options)
      templates.set(element, template)
      if (template && !speaking) {
        speaking = true
        listen()
      }
    },
    changed: (element, text) => {
      const template = templates.get(element)
      if (template) say(template.split('{value}').join(text))
    },
    destroy: () => {
      if (speaking) unlisten()
    },
  }
}
