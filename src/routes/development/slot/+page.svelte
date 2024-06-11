<script lang="ts">
  import {
    type Content,
    type ContextMenuItem,
    createAjvValidator,
    createValueSelection,
    EditableValue,
    isJSONContent,
    isTextContent,
    javascriptQueryLanguage,
    jmespathQueryLanguage,
    JSONEditor,
    type JSONEditorSelection,
    type JSONParser,
    lodashQueryLanguage,
    type MenuItem,
    Mode,
    type OnChangeStatus,
    ReadonlyValue,
    type RenderMenuContext,
    renderValue,
    type RenderValueComponentDescription,
    type RenderValuePropsOptional,
    SelectionType,
    toJSONContent
  } from 'svelte-jsoneditor'
  import { useLocalStorage } from '$lib/utils/localStorageUtils.js'
  import { range } from 'lodash-es'
  import { tick } from 'svelte'
  import { parse, stringify } from 'lossless-json'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { parseJSONPath, stringifyJSONPath } from '$lib/utils/pathUtils.js'
  import { compileJSONPointer, isJSONObject, parseJSONPointer } from 'immutable-json-patch'

  const LosslessJSON = {
    parse,
    stringify
  }

  let content: Content = {
    text: `{
  "boolean": true,
  "color": "#82b92c",
  "html_code": "&quot;",
  "html_characters<a>": "<a>",
  "escaped_unicode": "\\u260e",
  "long": 9223372036854775807,
  "float": 4.0,
  "big": 1e500,
  "unicode": "😀,💩",
  "escaped double quote": "\\"abc\\"",
  "unicode double quote": "\\u0022abc\\u0022",
  "return": "\\n",
  "null": null,
  "number": 123,
  "object": {
    "a": "b",
    "c": "d"
  },
  "string": "Greeting!",
  "stringContainingNumber": "1234",
  "multi\\nline    text": "Hello\\nWorld    text",
  "tab": "Hello\\tTab",
  "backslash": "back\\\\slash",
  "forwardslash": "forward\\/slash",
  "quote": "quote\\"",
  "timestamp": 1534952749890,
  "url": "https://jsoneditoronline.org",
  "array": [
    1,
    2,
    [
      3,
      4,
      5
    ],
    4,
    5,
    6,
    7,
    8,
    9,
    10
  ],
  "xss?": "<button onclick=alert('oopsie!!!')>test xss</button>",
  "xss array": [
    {
      "<button onclick=alert('oopsie!!!')>test xss</button>": "xss?"
    }
  ],
  "long line": "longwordlongword longword2longword2longword2 longlinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelonglinelongline"
}`,
    json: undefined
  }

  let selectionTree: JSONEditorSelection | null = null
  let selectionText: JSONEditorSelection | null = null

  const schema = {
    title: 'Employee',
    description: 'Object containing employee details',
    type: 'object',
    properties: {
      boolean: {
        title: 'A boolean',
        type: 'boolean'
      },
      array: {
        type: 'array',
        items: {
          type: 'number',
          minimum: 10
        }
      }
    },
    required: ['foo']
  }

  const arraySchema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: {
          type: 'number'
        },
        random: {
          type: 'number',
          minimum: 0
        },
        array: {
          type: 'array',
          items: {
            type: 'number'
          }
        },
        name: {
          type: 'string'
        },
        long: {
          type: 'number'
        },
        'nested object': {
          type: 'object'
        }
      },
      required: ['id', 'name', 'random', 'array'],
      additionalProperties: false
    },
    minItems: 1001
  }

  const themes = [
    { value: 'jse-theme-default', label: 'default' },
    { value: 'jse-theme-dark', label: 'dark' },
    { value: 'jse-theme-big', label: 'big' },
    { value: 'jse-theme-custom-contents', label: 'custom-contents' }
  ]

  const indentations = [
    { value: 2, label: '2 spaces' },
    { value: 3, label: '3 spaces' },
    { value: '    ', label: '4 spaces' }, // equivalent to value: 4
    { value: 6, label: '6 spaces' },
    { value: 8, label: '8 spaces' },
    { value: '\t', label: '1 tab' }
  ]

  interface ParserOption {
    id: string
    value: JSONParser
    label: string
  }

  const parsers: ParserOption[] = [
    {
      id: 'JSON',
      value: JSON,
      label: 'JSON'
    },
    {
      id: 'LosslessJSON',
      value: LosslessJSON,
      label: 'LosslessJSON'
    }
  ]

  const pathParsers = [
    {
      id: 'JSONPath',
      value: {
        parse: parseJSONPath,
        stringify: stringifyJSONPath
      },
      label: 'JSONPath'
    },
    {
      id: 'JSONPointer',
      value: {
        parse: parseJSONPointer,
        stringify: compileJSONPointer
      },
      label: 'JSONPointer'
    },
    {
      id: 'JSON',
      value: JSON,
      label: 'JSON'
    }
  ]

  const validator = createAjvValidator({ schema })
  const arrayValidator = createAjvValidator({ schema: arraySchema })

  let refTreeEditor: JSONEditor | undefined
  let refTextEditor: JSONEditor | undefined

  // for debugging
  $: if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.refTreeEditor = refTreeEditor
  }
  $: if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.refTextEditor = refTextEditor
  }

  const showTreeEditor = useLocalStorage('svelte-jsoneditor-demo-showTreeEditor', true)
  const showTextEditor = useLocalStorage('svelte-jsoneditor-demo-showTextEditor', true)
  const showRawContents = useLocalStorage('svelte-jsoneditor-demo-showRawContents', false)
  const showSelection = useLocalStorage('svelte-jsoneditor-demo-showSelection', false)
  let height = '440px'
  const validate = useLocalStorage('svelte-jsoneditor-demo-validate', false)
  const validateArray = useLocalStorage('svelte-jsoneditor-demo-validate-array', false)
  const readOnly = useLocalStorage('svelte-jsoneditor-demo-readOnly', false)
  const mainMenuBar = useLocalStorage('svelte-jsoneditor-demo-mainMenuBar', true)
  const navigationBar = useLocalStorage('svelte-jsoneditor-demo-navigationBar', true)
  const statusBar = useLocalStorage('svelte-jsoneditor-demo-statusBar', true)
  const askToFormat = useLocalStorage('svelte-jsoneditor-demo-askToFormat', true)
  const escapeControlCharacters = useLocalStorage(
    'svelte-jsoneditor-demo-escapeControlCharacters',
    false
  )
  const escapeUnicodeCharacters = useLocalStorage(
    'svelte-jsoneditor-demo-escapeUnicodeCharacters',
    false
  )
  const flattenColumns = useLocalStorage('svelte-jsoneditor-demo-flattenColumns', false)
  const useCustomValueRenderer = useLocalStorage(
    'svelte-jsoneditor-demo-useCustomValueRenderer',
    false
  )
  const multipleQueryLanguages = useLocalStorage(
    'svelte-jsoneditor-demo-multipleQueryLanguages',
    true
  )
  const selectedTheme = useLocalStorage('svelte-jsoneditor-demo-theme', themes[0].value)
  const selectedIndentation = useLocalStorage(
    'svelte-jsoneditor-demo-indentation',
    indentations[0].value
  )
  const selectedParserId = useLocalStorage('svelte-jsoneditor-demo-parser', parsers[1].id)
  const selectedPathParserId = useLocalStorage(
    'svelte-jsoneditor-demo-path-parser',
    pathParsers[0].id
  )
  const tabSize = useLocalStorage('svelte-jsoneditor-demo-tabSize', indentations[0].value)
  let leftEditorMode: Mode = Mode.tree

  $: queryLanguages = $multipleQueryLanguages
    ? [javascriptQueryLanguage, lodashQueryLanguage, jmespathQueryLanguage]
    : [javascriptQueryLanguage]
  let queryLanguageId = javascriptQueryLanguage.id // TODO: store in local storage

  let selectedParser: JSONParser
  $: selectedParser =
    parsers.find((parser) => parser.id === $selectedParserId)?.value || parsers[0].value
  $: selectedPathParser =
    pathParsers.find((parser) => parser.id === $selectedPathParserId)?.value || pathParsers[0].value

  $: selectedValidator = $validate ? validator : $validateArray ? arrayValidator : undefined

  // only editable/readonly div, no color picker, boolean toggle, timestamp
  function customRenderValue({
    path,
    value,
    readOnly,
    enforceString,
    searchResultItems,
    isEditing,
    parser,
    normalization,
    onPatch,
    onPasteJson,
    onSelect,
    onFind,
    focus
  }: RenderValuePropsOptional): RenderValueComponentDescription[] {
    const renderers: RenderValueComponentDescription[] = []

    if (isEditing) {
      renderers.push({
        component: EditableValue,
        props: {
          path,
          value,
          enforceString,
          parser,
          normalization,
          onPatch,
          onPasteJson,
          onSelect,
          onFind,
          focus
        }
      })
    }

    if (!isEditing) {
      renderers.push({
        component: ReadonlyValue,
        props: { path, value, readOnly, parser, normalization, searchResultItems, onSelect }
      })
    }

    return renderers
  }

  function onRenderMenu(items: MenuItem[], { mode }: RenderMenuContext) {
    if (!import.meta.env.SSR) {
      console.log('onRenderMenu', mode, items)
    }

    return items
  }

  function onChangeTree(
    content: Content,
    previousContent: Content,
    { contentErrors, patchResult }: OnChangeStatus
  ) {
    console.log('onChangeTree', {
      content,
      previousContent,
      contentErrors,
      patchResult
    })
  }

  function onChangeText(
    content: Content,
    previousContent: Content,
    { contentErrors, patchResult }: OnChangeStatus
  ) {
    console.log('onChangeText', {
      content,
      previousContent,
      contentErrors,
      patchResult
    })
  }

  function onSelectTree(selection: JSONEditorSelection | null) {
    console.log('onSelectTree', selection)
  }

  function onSelectText(selection: JSONEditorSelection | null) {
    console.log('onSelectText', selection)
  }

  function onChangeMode(mode: Mode) {
    console.log('onChangeMode', mode)
  }

  function onChangeQueryLanguage(newQueryLanguageId: string) {
    console.log('onChangeQueryLanguage', newQueryLanguageId)
    queryLanguageId = newQueryLanguageId
  }

  function onRenderContextMenu(items: ContextMenuItem[], context: RenderMenuContext) {
    console.log('onRenderContextMenu', items, context)
    return items
  }

  function openInWindow() {
    const popupWindow = window.open(
      '',
      '_blank',
      `location=no,toolbar=no,menubar=no,status=no,directories=no,width=${500},height=${600},left=${0},top=${0},editorWind=yes`
    )
    if (!popupWindow) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.popupEditor = new JSONEditor({
      target: popupWindow.document.body,
      props: {}
    })
  }

  function refresh() {
    if (refTreeEditor) {
      refTreeEditor.refresh()
    }
    if (refTextEditor) {
      refTextEditor.refresh()
    }
  }

  function generateLongArray() {
    return [...new Array(1000)].map((value, index) => {
      const random = Math.round(Math.random() * 1000)
      const item: Record<string, unknown> = {
        id: index,
        name: 'Item ' + index,
        random,
        'nested object': {
          value: random
        },
        array: [index, 1, 7, 3],
        long:
          selectedParser.stringify === stringify
            ? 9223372000000000000n + BigInt(random)
            : Number(9223372000000000000n + BigInt(random))
      }

      // introduce some validation issues
      if (index === 3) {
        const array = item.array as Array<string | null>
        array[2] = 'oopsie'
        array[3] = null
        delete item['id']
      }
      if (index === 4) {
        item.random = -1
      }
      if (index === 7 || index === 802) {
        item.random = String(item.random)
        item.long = String(item.long)
      }
      if (index === 9) {
        item.unknownProp = 'other'
      }

      return item
    })
  }

  function handleOpenFile(event: Event) {
    const target = event.target as HTMLInputElement

    console.log('loadFile', target.files)
    console.time('load file')

    const reader = new window.FileReader()
    const file = target.files?.[0]
    if (!file) {
      return
    }

    reader.onload = function (event: ProgressEvent<FileReader>) {
      console.timeEnd('load file')

      if (!event.target) {
        return
      }

      console.time('parse and render')

      content = {
        text: String(event.target?.result),
        json: undefined
      }

      tick().then(() => console.timeEnd('parse and render'))
    }
    reader.readAsText(file)
  }
</script>

<svelte:head>
  <title>development application | svelte-jsoneditor</title>
</svelte:head>

<JSONEditor
  bind:this={refTreeEditor}
  bind:content
  bind:selection={selectionTree}
  bind:mode={leftEditorMode}
  mainMenuBar={$mainMenuBar}
  navigationBar={$navigationBar}
  statusBar={$statusBar}
  askToFormat={$askToFormat}
  escapeControlCharacters={$escapeControlCharacters}
  escapeUnicodeCharacters={$escapeUnicodeCharacters}
  flattenColumns={$flattenColumns}
  readOnly={$readOnly}
  indentation={$selectedIndentation}
  tabSize={$tabSize}
  parser={selectedParser}
  pathParser={selectedPathParser}
  validator={selectedValidator}
  {queryLanguages}
  bind:queryLanguageId
  {onRenderMenu}
  onChange={onChangeTree}
  onSelect={onSelectTree}
  onRenderValue={$useCustomValueRenderer ? customRenderValue : renderValue}
  {onRenderContextMenu}
  {onChangeMode}
  onFocus={() => console.log('onFocus tree')}
  onBlur={() => console.log('onBlur tree', { content: refTreeEditor?.get() })}
>
  <svelte:fragment slot="tree-jse" let:at>{at}</svelte:fragment>
</JSONEditor>
