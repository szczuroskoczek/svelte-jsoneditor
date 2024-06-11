<script lang="ts">
  import type { RenderCallbackAction } from 'svelte-jsoneditor/types'

  export let renderCallback: RenderCallbackAction | undefined = undefined
  export let at: 'after' | 'inside'
  export let path: (string | number)[]
  export let expanded: boolean = false
</script>

{#if typeof renderCallback === 'function'}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="jse-render-callback-container"
    use:renderCallback={{
      at,
      path,
      expanded
    }}
  />
{/if}
