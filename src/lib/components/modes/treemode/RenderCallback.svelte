<script lang="ts">
  import type { RenderCallbackAction } from 'svelte-jsoneditor/types'

  export let renderCallback: RenderCallbackAction | undefined = undefined
  export let at: 'after' | 'inside'
  export let path: (string | number)[]
  export let expanded: boolean = false
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if typeof renderCallback === 'function'}
  {#key path.join('.')}
    <div
      class="jse-render-callback-container"
      use:renderCallback={{
        at,
        path,
        expanded
      }}
    />
  {/key}
{/if}
