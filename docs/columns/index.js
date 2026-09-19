const STORAGE_KEY = 'personal-columns-v1'
const COLUMNS_API_URL = 'https://friends-of-mongo.vercel.app/columns'
const SAVE_DELAY_MS = 250
const PARAGRAPH_BREAK_RE = /\n{3,}/g
const columnsElement = document.querySelector('#columns')
const addColumnButton = document.querySelector('#add-column')

let columns = loadColumns()
let saveTimer = null
let saveInFlight = false
let savePending = false
let remotePersistenceEnabled = false

function loadColumns() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return ['']

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || parsed.length === 0) return ['']
    return parsed.map((value) => (typeof value === 'string' ? value : ''))
  } catch {
    return ['']
  }
}

function saveColumnsLocally() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(columns))
}

function isColumnsData(data) {
  return (
    Array.isArray(data?.columns) &&
    data.columns.length > 0 &&
    data.columns.every((column) => typeof column === 'string')
  )
}

async function loadColumnsFromApi() {
  try {
    const response = await fetch(COLUMNS_API_URL, {
      headers: { Authorization: localStorage.getItem('super_secret') ?? '' },
    })

    if (response.status === 404) {
      remotePersistenceEnabled = true
      scheduleSave()
      return
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (!isColumnsData(data)) {
      throw new Error('Invalid columns data')
    }

    columns = data.columns
    saveColumnsLocally()
    remotePersistenceEnabled = true
  } catch (error) {
    console.error('Failed to load columns data from MongoDB; using local data', error)
  }
}

async function saveColumnsToApi({ keepalive = false } = {}) {
  if (!remotePersistenceEnabled) return

  if (saveInFlight && !keepalive) {
    savePending = true
    return
  }

  const snapshot = [...columns]
  if (!keepalive) saveInFlight = true

  try {
    const response = await fetch(COLUMNS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('super_secret') ?? '',
      },
      body: JSON.stringify({ columns: snapshot }),
      keepalive,
    })

    if (response.status === 401 || response.status === 403) {
      remotePersistenceEnabled = false
      return
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error('Failed to save columns data to MongoDB', error)
  } finally {
    if (!keepalive) {
      saveInFlight = false

      if (savePending) {
        savePending = false
        void saveColumnsToApi()
      }
    }
  }
}

function queueRemoteSave() {
  saveTimer = null
  void saveColumnsToApi()
}

function scheduleSave() {
  saveColumnsLocally()

  if (!remotePersistenceEnabled) return

  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(queueRemoteSave, SAVE_DELAY_MS)
}

// Keep every column as one string. These blocks are only a visual/editing view.
// The separator is preserved exactly, so existing blank-line spacing is not normalized.
function parseBlocks(value) {
  const blocks = []
  const matcher = new RegExp(PARAGRAPH_BREAK_RE.source, 'g')
  let start = 0
  let match

  while ((match = matcher.exec(value))) {
    blocks.push({
      text: value.slice(start, match.index),
      separator: match[0],
      start,
    })
    start = match.index + match[0].length
  }

  blocks.push({
    text: value.slice(start),
    separator: '',
    start,
  })

  return blocks
}

function serializeBlocks(blocks) {
  return blocks.map((block) => block.text + block.separator).join('')
}

function autoResize(textarea) {
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

function getCards(columnIndex) {
  return Array.from(
    columnsElement.querySelectorAll(`.column[data-column-index="${columnIndex}"] .paragraph-card`)
  ).filter((card) => card instanceof HTMLTextAreaElement)
}

function setCaret(textarea, position) {
  textarea.focus()
  textarea.setSelectionRange(position, position)
  textarea.scrollIntoView({ block: 'nearest' })
}

function focusAtOffset(columnIndex, absoluteOffset) {
  const value = columns[columnIndex]
  const blocks = parseBlocks(value)
  const cards = getCards(columnIndex)
  const clamped = Math.max(0, Math.min(absoluteOffset, value.length))

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    const textEnd = block.start + block.text.length
    const blockEnd = textEnd + block.separator.length

    if (clamped <= textEnd) {
      setCaret(cards[i], clamped - block.start)
      return
    }

    // A caret cannot live inside the hidden blank-line separator, so land at
    // the start of the next visible card instead.
    if (clamped <= blockEnd && cards[i + 1]) {
      setCaret(cards[i + 1], 0)
      return
    }
  }

  const lastCard = cards[cards.length - 1]
  if (lastCard) setCaret(lastCard, lastCard.value.length)
}

function lineColumn(value, position) {
  const previousNewline = value.lastIndexOf('\n', Math.max(0, position - 1))
  return position - previousNewline - 1
}

function firstLineTarget(value, desiredColumn) {
  const lineEnd = value.indexOf('\n')
  const firstLineLength = lineEnd === -1 ? value.length : lineEnd
  return Math.min(desiredColumn, firstLineLength)
}

function lastLineTarget(value, desiredColumn) {
  const lineStart = value.lastIndexOf('\n') + 1
  return Math.min(lineStart + desiredColumn, value.length)
}

function handleCardKeydown(event, columnIndex, blockIndex) {
  if (event.altKey || event.metaKey || event.ctrlKey) return

  const textarea = event.currentTarget
  const cards = getCards(columnIndex)
  const previous = cards[blockIndex - 1]
  const next = cards[blockIndex + 1]
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const collapsed = start === end

  if (event.key === 'ArrowLeft' && collapsed && start === 0 && previous) {
    event.preventDefault()
    setCaret(previous, previous.value.length)
    return
  }

  if (event.key === 'ArrowRight' && collapsed && end === textarea.value.length && next) {
    event.preventDefault()
    setCaret(next, 0)
    return
  }

  if (
    event.key === 'ArrowUp' &&
    collapsed &&
    previous &&
    !textarea.value.slice(0, start).includes('\n')
  ) {
    event.preventDefault()
    setCaret(previous, lastLineTarget(previous.value, lineColumn(textarea.value, start)))
    return
  }

  if (event.key === 'ArrowDown' && collapsed && next && !textarea.value.slice(end).includes('\n')) {
    event.preventDefault()
    setCaret(next, firstLineTarget(next.value, lineColumn(textarea.value, start)))
    return
  }

  const blocks = parseBlocks(columns[columnIndex])
  const block = blocks[blockIndex]
  if (!block) return

  if (event.key === 'Backspace' && collapsed && start === 0 && blockIndex > 0) {
    event.preventDefault()
    const offset = block.start
    columns[columnIndex] =
      columns[columnIndex].slice(0, offset - 1) + columns[columnIndex].slice(offset)
    scheduleSave()
    renderColumn(columnIndex, { focusOffset: offset - 1 })
    return
  }

  if (
    event.key === 'Delete' &&
    collapsed &&
    end === textarea.value.length &&
    blockIndex < blocks.length - 1
  ) {
    event.preventDefault()
    const offset = block.start + block.text.length
    columns[columnIndex] =
      columns[columnIndex].slice(0, offset) + columns[columnIndex].slice(offset + 1)
    scheduleSave()
    renderColumn(columnIndex, { focusOffset: offset })
  }
}

function createCard(block, columnIndex, blockIndex, blocks) {
  const textarea = document.createElement('textarea')
  textarea.className = 'paragraph-card'
  textarea.rows = 1
  textarea.value = block.text
  textarea.placeholder = blocks.length === 1 && block.text === '' ? 'Type here…' : ''
  textarea.setAttribute('aria-label', `Column ${columnIndex + 1}, paragraph ${blockIndex + 1}`)
  textarea.spellcheck = true

  textarea.addEventListener('keydown', (event) => {
    handleCardKeydown(event, columnIndex, blockIndex)
  })

  textarea.addEventListener('input', () => {
    const currentBlocks = parseBlocks(columns[columnIndex])
    const currentBlock = currentBlocks[blockIndex]
    if (!currentBlock) return

    currentBlock.text = textarea.value
    const absoluteCaret = currentBlock.start + textarea.selectionStart
    columns[columnIndex] = serializeBlocks(currentBlocks)
    scheduleSave()

    // Keep one blank line within a card; a third newline creates the next card.
    if (/\n{3,}/.test(textarea.value)) {
      renderColumn(columnIndex, { focusOffset: absoluteCaret })
    } else {
      autoResize(textarea)
    }
  })

  requestAnimationFrame(() => autoResize(textarea))
  return textarea
}

function deleteColumn(index) {
  if (columns.length === 1) return
  if (!window.confirm(`Delete column ${index + 1}?`)) return

  columns.splice(index, 1)
  scheduleSave()
  render()
}

function createColumn(value, index) {
  const wrapper = document.createElement('div')
  wrapper.className = 'column'
  wrapper.dataset.columnIndex = index

  const deleteButton = document.createElement('button')
  deleteButton.className = 'column-delete'
  deleteButton.type = 'button'
  deleteButton.textContent = '×'
  deleteButton.setAttribute('aria-label', `Delete column ${index + 1}`)
  deleteButton.title = 'Delete column'
  deleteButton.disabled = columns.length === 1
  deleteButton.addEventListener('click', () => deleteColumn(index))
  wrapper.append(deleteButton)

  const editor = document.createElement('div')
  editor.className = 'column-editor'

  const blocks = parseBlocks(value)
  blocks.forEach((block, blockIndex) => {
    editor.append(createCard(block, index, blockIndex, blocks))
  })

  wrapper.append(editor)
  return wrapper
}

function renderColumn(columnIndex, { focusOffset = null } = {}) {
  const oldColumn = columnsElement.querySelector(`.column[data-column-index="${columnIndex}"]`)
  if (!oldColumn) return

  const replacement = createColumn(columns[columnIndex], columnIndex)
  oldColumn.replaceWith(replacement)

  if (focusOffset !== null) {
    focusAtOffset(columnIndex, focusOffset)
  }
}

function render({ focusLast = false } = {}) {
  const fragment = document.createDocumentFragment()

  columns.forEach((value, index) => {
    fragment.append(createColumn(value, index))
  })

  columnsElement.replaceChildren(fragment)

  if (focusLast) {
    const textareas = columnsElement.querySelectorAll('textarea')
    textareas[textareas.length - 1]?.focus()
  }
}

function addColumn() {
  columns.push('')
  scheduleSave()
  render({ focusLast: true })
}

addColumnButton.addEventListener('click', addColumn)

window.addEventListener('pagehide', () => {
  const hasPendingSave = saveTimer !== null
  window.clearTimeout(saveTimer)
  saveTimer = null
  saveColumnsLocally()

  if (hasPendingSave) {
    void saveColumnsToApi({ keepalive: true })
  }
})

async function initialize() {
  await loadColumnsFromApi()
  render()
}

void initialize()
