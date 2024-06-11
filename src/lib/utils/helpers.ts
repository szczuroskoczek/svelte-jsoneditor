import { setContext } from 'svelte'
import type { RenderCallbackAction } from 'svelte-jsoneditor/types'

export function setRenderCallback(actionCallback: RenderCallbackAction) {
  setContext('renderCallback', actionCallback)
}
