// --- Application State ---
let appData = {
  calendars: [],
  entries: [],
  activeCalId: null,
}

const COLORS = ['indigo', 'red', 'emerald', 'amber', 'purple', 'pink', 'slate']
const COLOR_NAMES = {
  indigo: 'Indigo',
  red: 'Red',
  emerald: 'Emerald',
  amber: 'Amber',
  purple: 'Purple',
  pink: 'Pink',
  slate: 'Gray',
}

let activeColorFilter = null

let currentDate = new Date()
let selectedDateForEntry = null

// --- Utility Functions ---
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const loadData = async () => {
  try {
    const response = await fetch('https://friends-of-mongo.vercel.app/calendar', {
      headers: { Authorization: localStorage.getItem('super_secret') },
    })
    if (response.ok) {
      const data = await response.json()
      if (data && data.appData) {
        appData = data.appData
        showToast('Loaded from cloud', 'success')
      }
    } else {
      showToast(`Cloud fetch failed: HTTP ${response.status}`, 'error')
    }
  } catch (error) {
    console.error('Failed to fetch calendar data', error)
    showToast(`Cloud unreachable: ${error.message}`, 'error')
  }

  // Auto-create default calendar if none exists
  if (appData.calendars.length === 0) {
    const defaultCalId = generateUUID()
    appData.calendars.push({ id: defaultCalId, name: 'My Calendar' })
    appData.activeCalId = defaultCalId
    saveData()
  } else if (!appData.activeCalId) {
    appData.activeCalId = appData.calendars[0].id
    saveData()
  }
}

const saveData = async () => {
  try {
    const response = await fetch('https://friends-of-mongo.vercel.app/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('super_secret') ?? '',
      },
      body: JSON.stringify({
        appData,
      }),
    })

    const data = await response.json().catch(() => null)

    if (data && data.message) {
      showToast(data.message, 'error')
    } else if (!response.ok) {
      showToast(`Server error: ${response.status}`, 'error')
    }
  } catch (error) {
    console.error('Failed to save calendar data to mongo', error)
    showToast('Network error while saving data', 'error')
  }
}

const formatDateStr = (year, month, day) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const parseDateStr = (dateStr) => {
  const [y, m, d] = dateStr.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
}

// --- Toast Notifications ---
const showToast = (message, type = 'error') => {
  const container = document.getElementById('toast-container')
  if (!container) return

  const toast = document.createElement('div')

  const baseClasses =
    'px-4 py-3 rounded-lg shadow-lg text-sm font-medium transform transition-all duration-300 translate-y-4 opacity-0 flex items-center gap-2 pointer-events-auto'

  let typeClasses = ''
  let icon = ''
  if (type === 'error') {
    typeClasses = 'bg-red-500 text-white dark:bg-red-600'
    icon = '<i class="ph ph-warning-circle text-lg"></i>'
  } else {
    typeClasses = 'bg-emerald-500 text-white dark:bg-emerald-600'
    icon = '<i class="ph ph-check-circle text-lg"></i>'
  }

  toast.className = `${baseClasses} ${typeClasses}`
  toast.innerHTML = `${icon} <span>${message}</span>`

  container.appendChild(toast)

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0')
    toast.classList.add('translate-y-0', 'opacity-100')
  })

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100')
    toast.classList.add('opacity-0', 'translate-y-[-1rem]')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// --- Render Calendar Selector Dropdown ---
const renderChips = () => {
  const select = document.getElementById('cal-select')
  if (select) select.innerHTML = ''

  appData.calendars.forEach((cal) => {
    const isActive = cal.id === appData.activeCalId

    if (select) {
      const option = document.createElement('option')
      option.value = cal.id
      option.textContent = cal.name
      option.selected = isActive
      select.appendChild(option)
    }
  })

  renderColorFilter()
}

// --- Color Filter Dropdown ---
const closeColorFilterDropdown = () => {
  const panel = document.getElementById('color-filter-panel')
  if (panel) panel.classList.add('hidden')
}

const renderColorFilter = () => {
  const dotEl = document.getElementById('color-filter-btn-dot')
  const labelEl = document.getElementById('color-filter-btn-label')
  const triggerBtn = document.getElementById('btn-color-filter')
  const activeCal = appData.calendars.find((c) => c.id === appData.activeCalId)
  const colorLabels = activeCal?.colorLabels || {}

  // Update trigger button to reflect the active filter
  if (activeColorFilter === null) {
    if (dotEl)
      dotEl.className =
        'w-2.5 h-2.5 rounded-full flex-none bg-slate-400 dark:bg-slate-500 transition-colors'
    if (labelEl) labelEl.textContent = 'All'
    if (triggerBtn)
      triggerBtn.className =
        'flex-none flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors'
  } else {
    const colorLabel = colorLabels[activeColorFilter] || COLOR_NAMES[activeColorFilter]
    if (dotEl)
      dotEl.className = `w-2.5 h-2.5 rounded-full flex-none bg-${activeColorFilter}-500 transition-colors`
    if (labelEl) labelEl.textContent = colorLabel
    if (triggerBtn)
      triggerBtn.className = `flex-none flex items-center gap-1.5 px-3 py-2 rounded-full bg-${activeColorFilter}-100 dark:bg-${activeColorFilter}-500/20 text-${activeColorFilter}-700 dark:text-${activeColorFilter}-300 hover:bg-${activeColorFilter}-200 dark:hover:bg-${activeColorFilter}-500/30 transition-colors`
  }

  // Populate the dropdown chips
  const chips = document.getElementById('color-filter-chips')
  if (!chips) return
  chips.innerHTML = ''

  // "All" chip
  const allBtn = document.createElement('button')
  allBtn.type = 'button'
  allBtn.className =
    activeColorFilter === null
      ? 'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 transition-colors'
      : 'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
  const allDot = document.createElement('span')
  allDot.className = `w-2.5 h-2.5 rounded-full flex-none ${activeColorFilter === null ? 'bg-white/70 dark:bg-slate-900/40' : 'bg-slate-400 dark:bg-slate-500'}`
  allBtn.appendChild(allDot)
  allBtn.appendChild(document.createTextNode('All'))
  allBtn.addEventListener('click', () => {
    activeColorFilter = null
    closeColorFilterDropdown()
    renderColorFilter()
    renderCurrentView()
  })
  chips.appendChild(allBtn)

  // Color chips
  COLORS.forEach((color) => {
    const colorLabel = colorLabels[color] || COLOR_NAMES[color]
    const isActive = activeColorFilter === color
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = isActive
      ? `w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-${color}-500 text-white transition-colors`
      : `w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-${color}-700 dark:text-${color}-300 hover:bg-${color}-50 dark:hover:bg-${color}-500/10 transition-colors`
    const colorDot = document.createElement('span')
    colorDot.className = `w-2.5 h-2.5 rounded-full flex-none ${isActive ? 'bg-white/70' : `bg-${color}-500`}`
    btn.appendChild(colorDot)
    btn.appendChild(document.createTextNode(colorLabel))
    btn.addEventListener('click', () => {
      activeColorFilter = color
      closeColorFilterDropdown()
      renderColorFilter()
      renderCurrentView()
    })
    chips.appendChild(btn)
  })
}

// --- Date Recurrence Logic ---
const isEntryOnDate = (entry, checkDateObj) => {
  if (entry.calendarId !== appData.activeCalId) return false

  const entryStartObj = parseDateStr(entry.date)

  // Ignore times, focus strictly on dates
  entryStartObj.setHours(0, 0, 0, 0)
  const checkTime = checkDateObj.getTime()
  const startTime = entryStartObj.getTime()

  // Event hasn't started yet
  if (checkTime < startTime) return false

  // Exact same day
  if (checkTime === startTime) return true

  // Handle cadences
  if (entry.cadence === 'Daily') return true

  if (entry.cadence === 'Weekly') {
    const diffTime = Math.abs(checkTime - startTime)
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    return diffDays % 7 === 0
  }

  if (entry.cadence === 'Biweekly') {
    const diffTime = Math.abs(checkTime - startTime)
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    return diffDays % 14 === 0
  }

  if (entry.cadence === 'Monthly') {
    // Occurs on the same day of the month
    return checkDateObj.getDate() === entryStartObj.getDate()
  }

  return false // 'Once' or unknown cadence
}

// --- Calendar Grid Rendering ---
const renderCalendar = () => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Update Header Display
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  document.getElementById('current-month-display').textContent = `${monthNames[month]} ${year}`

  const grid = document.getElementById('calendar-grid')
  grid.innerHTML = ''

  // Calculate grid dates
  const firstDayOfMonth = new Date(year, month, 1).getDay() // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Calculate how many rows we need (5 or 6 typically) to fit the days
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

  // Set dynamic grid rows
  grid.style.gridTemplateRows = `repeat(${totalCells / 7}, minmax(100px, 1fr))`

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Fetch entries for active calendar (and active color filter) to optimize loop
  const activeEntries = appData.entries.filter(
    (e) =>
      e.calendarId === appData.activeCalId &&
      (activeColorFilter === null || (e.color || 'indigo') === activeColorFilter)
  )

  for (let i = 0; i < totalCells; i++) {
    // Compute Date for cell (handles previous/next month overlap seamlessly)
    const cellDateObj = new Date(year, month, i - firstDayOfMonth + 1)
    cellDateObj.setHours(0, 0, 0, 0)

    const dateStr = formatDateStr(
      cellDateObj.getFullYear(),
      cellDateObj.getMonth(),
      cellDateObj.getDate()
    )
    const isCurrentMonth = cellDateObj.getMonth() === month
    const isToday = cellDateObj.getTime() === today.getTime()

    // Build Cell Container
    const cell = document.createElement('div')
    cell.className = `relative overflow-hidden border rounded-lg p-2 flex flex-col transition-all duration-300 group ${
      isCurrentMonth
        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md'
        : 'bg-transparent border-transparent opacity-30 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
    } ${isToday ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 border-transparent' : ''}`

    // Add split hitboxes for normal click and quick add
    const leftHitbox = document.createElement('div')
    leftHitbox.className = 'absolute left-0 top-0 w-1/2 h-full z-0 hover:bg-slate-100/50 dark:hover:bg-slate-700/20 rounded-l-lg transition-colors cursor-pointer'
    leftHitbox.title = 'Add Entry'
    leftHitbox.addEventListener('click', (event) => {
      event.stopPropagation()
      openEntryModal(dateStr, cellDateObj)
    })

    const rightHitbox = document.createElement('div')
    rightHitbox.className = 'absolute right-0 top-0 w-1/2 h-full z-0 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 rounded-r-lg transition-colors border-l border-dashed border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700/50 cursor-pointer'
    rightHitbox.title = 'Quick Add Entry'
    rightHitbox.addEventListener('click', (event) => {
      event.stopPropagation()
      openQuickAddModal(dateStr, cellDateObj)
    })

    cell.appendChild(leftHitbox)
    cell.appendChild(rightHitbox)

    // Date Number Header
    const dateHeader = document.createElement('div')
    dateHeader.className = `relative text-right mb-1 pointer-events-none z-10 ${
      isCurrentMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
    }`

    const dateSpan = document.createElement('span')
    dateSpan.className = `inline-flex items-center justify-center w-7 h-7 text-sm font-semibold rounded-full ${
      isToday
        ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
        : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-700'
    }`
    dateSpan.textContent = cellDateObj.getDate()

    dateHeader.appendChild(dateSpan)
    cell.appendChild(dateHeader)

    // Entries Container
    const entriesContainer = document.createElement('div')
    entriesContainer.className = 'relative flex-1 overflow-y-auto no-scrollbar space-y-1 z-10 pointer-events-none'

    // Find matching entries for this date
    const todaysEntries = activeEntries.filter((entry) => isEntryOnDate(entry, cellDateObj))

    todaysEntries.forEach((entry) => {
      const entryEl = document.createElement('div')
      const color = entry.color || 'indigo'
      entryEl.className = `bg-${color}-50 dark:bg-${color}-500/10 border border-${color}-100 dark:border-${color}-50/20 text-${color}-800 dark:text-${color}-300 text-xs px-2 py-1.5 rounded truncate font-medium flex items-center group/item hover:bg-${color}-100 dark:hover:bg-${color}-500/20 transition-colors pointer-events-auto cursor-pointer`

      const titleSpan = document.createElement('span')
      titleSpan.textContent = entry.name
      titleSpan.className = 'truncate pointer-events-none'
      entryEl.appendChild(titleSpan)

      const isDone = entry.doneDates && entry.doneDates.includes(dateStr)
      if (isDone) {
        entryEl.classList.add('opacity-50', 'line-through', 'decoration-2')
        const checkIcon = document.createElement('i')
        checkIcon.className = 'ph-fill ph-check-circle text-[10px] mr-1 flex-shrink-0'
        entryEl.insertBefore(checkIcon, titleSpan)
      }

      entryEl.addEventListener('click', (clickEvent) => {
        clickEvent.stopPropagation()
        openEntryModal(dateStr, cellDateObj, entry)
      })

      entriesContainer.appendChild(entryEl)
    })

    cell.appendChild(entriesContainer)
    grid.appendChild(cell)
  }
}

// --- Agenda List Rendering ---
const renderAgenda = () => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  document.getElementById('current-month-display').textContent = `${monthNames[month]} ${year}`

  const container = document.getElementById('agenda-view')
  container.innerHTML = ''

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const activeEntries = appData.entries.filter(
    (e) =>
      e.calendarId === appData.activeCalId &&
      (activeColorFilter === null || (e.color || 'indigo') === activeColorFilter)
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  let hasAnyEvents = false

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day)
    dateObj.setHours(0, 0, 0, 0)

    const dayEntries = activeEntries.filter((entry) => isEntryOnDate(entry, dateObj))
    if (dayEntries.length === 0) continue

    hasAnyEvents = true
    const isToday = dateObj.getTime() === today.getTime()

    // Day section wrapper
    const section = document.createElement('div')
    section.className = 'mb-6'

    // Day header row
    const dayRow = document.createElement('div')
    dayRow.className = 'flex items-center gap-3 mb-2.5'

    // Day number circle
    const dayCircle = document.createElement('div')
    dayCircle.className = `flex-none w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
      isToday
        ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
    }`
    dayCircle.textContent = day

    // Day name label
    const dayLabel = document.createElement('div')
    dayLabel.className = `text-sm font-semibold ${
      isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
    }`
    dayLabel.textContent = `${dayNames[dateObj.getDay()]}, ${monthNames[month]} ${day}`

    // Divider line
    const divider = document.createElement('div')
    divider.className = 'flex-1 h-px bg-slate-200 dark:bg-slate-700'

    dayRow.appendChild(dayCircle)
    dayRow.appendChild(dayLabel)
    dayRow.appendChild(divider)
    section.appendChild(dayRow)

    // Events list indented to align under the day label
    const eventsList = document.createElement('div')
    eventsList.className = 'pl-12 space-y-1.5'

    dayEntries.forEach((entry) => {
      const color = entry.color || 'indigo'
      const entryEl = document.createElement('div')
      entryEl.className = `bg-${color}-50 dark:bg-${color}-500/10 border border-${color}-100 dark:border-${color}-500/20 text-${color}-800 dark:text-${color}-300 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-${color}-100 dark:hover:bg-${color}-500/20 transition-colors flex items-center justify-between gap-3`

      const nameEl = document.createElement('span')
      nameEl.textContent = entry.name
      entryEl.appendChild(nameEl)

      const occurrenceDateStr = formatDateStr(year, month, day)
      const isDone = entry.doneDates && entry.doneDates.includes(occurrenceDateStr)
      if (isDone) {
        entryEl.classList.add('opacity-50')
        nameEl.classList.add('line-through', 'decoration-2')
        const checkIcon = document.createElement('i')
        checkIcon.className = 'ph-fill ph-check-circle text-xs flex-none'
        entryEl.insertBefore(checkIcon, nameEl)
      }

      if (entry.cadence && entry.cadence !== 'Once') {
        const cadenceEl = document.createElement('span')
        cadenceEl.className = 'text-xs opacity-50 flex-none'
        cadenceEl.textContent = entry.cadence
        entryEl.appendChild(cadenceEl)
      }

      entryEl.addEventListener('click', () => {
        openEntryModal(occurrenceDateStr, dateObj, entry)
      })

      eventsList.appendChild(entryEl)
    })

    section.appendChild(eventsList)
    container.appendChild(section)
  }

  if (!hasAnyEvents) {
    const empty = document.createElement('div')
    empty.className =
      'flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 select-none'
    empty.innerHTML = `
      <i class="ph ph-calendar-blank" style="font-size:3.5rem"></i>
      <p class="mt-4 text-base font-medium">No events this month</p>
      <p class="mt-1 text-sm opacity-70">Switch to calendar view to add events</p>
    `
    container.appendChild(empty)
  }
}

// --- View State ---
let currentView = 'calendar' // 'calendar' | 'agenda'

const renderCurrentView = () => {
  if (currentView === 'calendar') {
    renderCalendar()
  } else {
    renderAgenda()
  }
}

const setView = (view) => {
  currentView = view
  const calendarViewEl = document.getElementById('calendar-view')
  const agendaViewEl = document.getElementById('agenda-view')
  const toggleBtn = document.getElementById('btn-toggle-view')
  const toggleIcon = document.getElementById('view-toggle-icon')

  if (view === 'calendar') {
    calendarViewEl.classList.remove('hidden')
    agendaViewEl.classList.add('hidden')
    toggleIcon.className = 'ph ph-list-bullets text-xl group-hover:scale-110 transition-transform'
    toggleBtn.title = 'Switch to agenda view'
    renderCalendar()
  } else {
    calendarViewEl.classList.add('hidden')
    agendaViewEl.classList.remove('hidden')
    toggleIcon.className = 'ph ph-calendar-blank text-xl group-hover:scale-110 transition-transform'
    toggleBtn.title = 'Switch to calendar view'
    renderAgenda()
  }
}

// --- Month Navigation ---
document.getElementById('btn-prev-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1)
  renderCurrentView()
})

document.getElementById('btn-next-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1)
  renderCurrentView()
})

// --- Entry Modal Logic ---
let currentEditingEntryId = null
let currentEditingEntryIsDone = false

const entryModal = document.getElementById('entry-modal')
const entryNameInput = document.getElementById('entry-name')
const entryWebsiteInput = document.getElementById('entry-website')
const entryDescInput = document.getElementById('entry-desc')
const entryCadenceSelect = document.getElementById('entry-cadence')
const btnSaveEntry = document.getElementById('btn-save-entry')
const btnDeleteEntry = document.getElementById('btn-delete-entry')
const modalTitle = document.getElementById('modal-title')
const btnToggleDone = document.getElementById('btn-toggle-done')
const doneIcon = document.getElementById('done-icon')

let selectedEntryColor = 'indigo'
const colorButtons = document.querySelectorAll('#entry-color-picker button')

colorButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    colorButtons.forEach((b) => {
      b.classList.remove(`ring-${b.dataset.color}-500`)
      b.classList.add('ring-transparent')
    })

    const clickedBtn = e.currentTarget
    const color = clickedBtn.dataset.color
    clickedBtn.classList.remove('ring-transparent')
    clickedBtn.classList.add(`ring-${color}-500`)

    selectedEntryColor = color
    updateColorLabelHint(color)
  })
})

const updateColorLabelHint = (color) => {
  const hint = document.getElementById('color-label-hint')
  if (!hint) return
  const activeCal = appData.calendars.find((c) => c.id === appData.activeCalId)
  const label = activeCal?.colorLabels?.[color]
  if (label) {
    hint.innerHTML = `<span class="text-xs font-medium text-${color}-600 dark:text-${color}-400">${label}</span>`
  } else {
    hint.innerHTML = ''
  }
}

const updateColorPickerUI = (color) => {
  selectedEntryColor = color || 'indigo'
  colorButtons.forEach((b) => {
    if (b.dataset.color === selectedEntryColor) {
      b.classList.remove('ring-transparent')
      b.classList.add(`ring-${b.dataset.color}-500`)
    } else {
      b.classList.remove(`ring-${b.dataset.color}-500`)
      b.classList.add('ring-transparent')
    }
  })
  updateColorLabelHint(selectedEntryColor)
}

const handleEntryEnter = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    document.getElementById('btn-save-entry').click()
  }
}
entryNameInput.addEventListener('keydown', handleEntryEnter)
entryWebsiteInput.addEventListener('keydown', handleEntryEnter)
entryCadenceSelect.addEventListener('keydown', handleEntryEnter)

document.getElementById('btn-open-website').addEventListener('click', () => {
  const url = entryWebsiteInput.value.trim()
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
})

const updateDoneIconUI = (isDone) => {
  if (isDone) {
    doneIcon.className = 'ph-fill ph-check-circle text-2xl text-emerald-500 dark:text-emerald-400'
    btnToggleDone.title = 'Mark as incomplete'
  } else {
    doneIcon.className = 'ph ph-check-circle text-2xl'
    btnToggleDone.title = 'Mark as complete'
  }
}

btnToggleDone.addEventListener('click', () => {
  currentEditingEntryIsDone = !currentEditingEntryIsDone
  updateDoneIconUI(currentEditingEntryIsDone)
})

const openEntryModal = (dateStr, dateObj, entry = null) => {
  selectedDateForEntry = dateStr
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  document.getElementById('modal-date-display').textContent = dateObj.toLocaleDateString(
    undefined,
    options
  )

  if (entry) {
    // Edit existing entry
    currentEditingEntryId = entry.id
    modalTitle.textContent = 'Edit Entry'

    entryNameInput.value = entry.name
    entryWebsiteInput.value = entry.website || ''
    entryDescInput.value = entry.description || ''
    entryCadenceSelect.value = entry.cadence || 'Once'
    updateColorPickerUI(entry.color)

    currentEditingEntryIsDone = entry.doneDates && entry.doneDates.includes(selectedDateForEntry)
    updateDoneIconUI(currentEditingEntryIsDone)
    btnToggleDone.classList.remove('hidden')

    btnDeleteEntry.classList.remove('hidden')
  } else {
    // Add new entry
    currentEditingEntryId = null
    modalTitle.textContent = 'Add Entry'

    entryNameInput.value = ''
    entryWebsiteInput.value = ''
    entryDescInput.value = ''
    entryCadenceSelect.value = 'Monthly'
    updateColorPickerUI('indigo')

    currentEditingEntryIsDone = false
    btnToggleDone.classList.add('hidden')

    btnDeleteEntry.classList.add('hidden')
  }

  entryModal.classList.remove('hidden')
}

const closeEntryModal = () => {
  entryModal.classList.add('hidden')
  selectedDateForEntry = null
  currentEditingEntryId = null
  currentEditingEntryIsDone = false
}

entryModal.addEventListener('click', (e) => {
  if (e.target === entryModal) closeEntryModal()
})

document.getElementById('btn-cancel-entry').addEventListener('click', closeEntryModal)

document.getElementById('btn-save-entry').addEventListener('click', () => {
  const name = entryNameInput.value.trim()
  if (!name) return

  if (currentEditingEntryId) {
    // Update existing
    const existingEntry = appData.entries.find(
      (iteratedEntry) => iteratedEntry.id === currentEditingEntryId
    )
    if (existingEntry) {
      existingEntry.name = name
      existingEntry.website = entryWebsiteInput.value.trim()
      existingEntry.description = entryDescInput.value.trim()
      existingEntry.cadence = entryCadenceSelect.value
      existingEntry.color = selectedEntryColor

      if (!existingEntry.doneDates) {
        existingEntry.doneDates = []
      }

      if (currentEditingEntryIsDone) {
        if (!existingEntry.doneDates.includes(selectedDateForEntry)) {
          existingEntry.doneDates.push(selectedDateForEntry)
        }
      } else {
        existingEntry.doneDates = existingEntry.doneDates.filter(
          (dateStr) => dateStr !== selectedDateForEntry
        )
      }
    }
  } else {
    // Create new
    const newEntry = {
      id: generateUUID(),
      calendarId: appData.activeCalId,
      date: selectedDateForEntry,
      name: name,
      website: entryWebsiteInput.value.trim(),
      description: entryDescInput.value.trim(),
      cadence: entryCadenceSelect.value,
      color: selectedEntryColor,
      doneDates: [],
    }
    appData.entries.push(newEntry)
  }

  saveData()
  renderCurrentView()
  closeEntryModal()
})

document.getElementById('btn-delete-entry').addEventListener('click', () => {
  if (currentEditingEntryId) {
    deleteEntry(currentEditingEntryId)
    closeEntryModal()
  }
})

const deleteEntry = (id) => {
  appData.entries = appData.entries.filter((e) => e.id !== id)
  saveData()
  renderCurrentView()
}

// --- Quick Add Modal Logic ---
const quickAddModal = document.getElementById('quick-add-modal')
const quickAddDateDisplay = document.getElementById('quick-add-date-display')
const quickAddTemplatesContainer = document.getElementById('quick-add-templates-container')

const openQuickAddModal = (dateStr, dateObj) => {
  selectedDateForEntry = dateStr
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  quickAddDateDisplay.textContent = dateObj.toLocaleDateString(undefined, options)

  renderQuickAddTemplates(dateStr, dateObj)

  quickAddModal.classList.remove('hidden')
}

const closeQuickAddModal = () => {
  quickAddModal.classList.add('hidden')
  selectedDateForEntry = null
}

const renderQuickAddTemplates = (dateStr, dateObj) => {
  quickAddTemplatesContainer.innerHTML = ''

  const activeCal = appData.calendars.find((calendar) => calendar.id === appData.activeCalId)
  const templates = activeCal?.quickAddTemplates || []

  if (templates.length === 0) {
    const noTemplatesEl = document.createElement('div')
    noTemplatesEl.className = 'text-center py-6 text-slate-500 dark:text-slate-400'
    noTemplatesEl.innerHTML = `
      <i class="ph ph-sparkle text-3xl opacity-50 mb-2"></i>
      <p class="text-sm font-medium">No templates created yet</p>
      <p class="text-xs opacity-70 mt-1 max-w-[280px] mx-auto">
        Create templates under Calendar Settings to quick-add events in one click.
      </p>
      <button
        id="btn-quick-add-to-settings"
        type="button"
        class="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors focus:outline-none"
      >
        Open Settings
      </button>
    `
    quickAddTemplatesContainer.appendChild(noTemplatesEl)

    document.getElementById('btn-quick-add-to-settings').addEventListener('click', () => {
      closeQuickAddModal()
      if (activeCal) {
        openCalModal(activeCal.id, activeCal.name)
      }
    })
    return
  }

  templates.forEach((template) => {
    const button = document.createElement('button')
    button.type = 'button'
    const color = template.color || 'indigo'
    button.className = `w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-${color}-50 hover:border-${color}-300 dark:hover:bg-${color}-500/10 dark:hover:border-${color}-500/30 transition-all text-left shadow-sm group focus:outline-none`

    button.innerHTML = `
      <span class="w-4 h-4 rounded-full bg-${color}-500 flex-shrink-0 group-hover:scale-110 transition-transform"></span>
      <span class="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-${color}-900 dark:group-hover:text-${color}-200 transition-colors flex-1 truncate">
        ${template.name}
      </span>
      <i class="ph ph-plus text-slate-400 group-hover:text-${color}-600 dark:group-hover:text-${color}-400 text-lg transition-colors"></i>
    `

    button.addEventListener('click', () => {
      addQuickEntry(template, dateStr)
      closeQuickAddModal()
      showToast('Event quick-added!', 'success')
    })

    quickAddTemplatesContainer.appendChild(button)
  })
}

const addQuickEntry = (template, dateStr) => {
  const newEntry = {
    id: generateUUID(),
    calendarId: appData.activeCalId,
    date: dateStr,
    name: template.name,
    website: '',
    description: '',
    cadence: 'Once',
    color: template.color,
    doneDates: [dateStr]
  }
  appData.entries.push(newEntry)
  saveData()
  renderCurrentView()
}

// --- Calendar Modal Logic ---
const newCalModal = document.getElementById('new-cal-modal')
const calNameInput = document.getElementById('cal-name')
const calModalTitle = document.getElementById('cal-modal-title')
const btnSaveCal = document.getElementById('btn-save-cal')
const btnDeleteCalDirect = document.getElementById('btn-delete-cal-direct')

let currentEditingCalId = null

calNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    document.getElementById('btn-save-cal').click()
  }
})

let tempTemplates = []
let currentEditingTemplateId = null

const renderCalModalTemplates = () => {
  const container = document.getElementById('quick-templates-list')
  if (!container) return

  container.innerHTML = ''

  if (tempTemplates.length === 0 && currentEditingTemplateId !== 'new') {
    const emptyMsg = document.createElement('div')
    emptyMsg.className = 'text-xs text-slate-500 dark:text-slate-400 italic py-2 text-center'
    emptyMsg.textContent = 'No templates created yet.'
    container.appendChild(emptyMsg)
    return
  }

  tempTemplates.forEach((template) => {
    if (currentEditingTemplateId === template.id) {
      const editorEl = createTemplateEditor(template)
      container.appendChild(editorEl)
    } else {
      const row = document.createElement('div')
      row.className = 'flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-100 dark:hover:bg-slate-800'

      const activeCal = appData.calendars.find((calendar) => calendar.id === currentEditingCalId)
      const colorLabel = activeCal?.colorLabels?.[template.color] || COLOR_NAMES[template.color]

      row.innerHTML = `
        <span class="w-3 h-3 rounded-full bg-${template.color}-500 flex-shrink-0"></span>
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 w-14 flex-shrink-0 truncate" title="${colorLabel}">${colorLabel}</span>
        <span class="text-sm font-semibold text-slate-800 dark:text-slate-200 flex-1 truncate">${template.name}</span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn-edit-template p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="Edit template">
            <i class="ph ph-pencil-simple text-base"></i>
          </button>
          <button type="button" class="btn-delete-template p-1 text-slate-400 hover:text-red-600 transition-colors" title="Delete template">
            <i class="ph ph-trash text-base"></i>
          </button>
        </div>
      `

      row.querySelector('.btn-edit-template').addEventListener('click', () => {
        currentEditingTemplateId = template.id
        renderCalModalTemplates()
      })

      row.querySelector('.btn-delete-template').addEventListener('click', () => {
        tempTemplates = tempTemplates.filter((tempTemplate) => tempTemplate.id !== template.id)
        renderCalModalTemplates()
      })

      container.appendChild(row)
    }
  })

  if (currentEditingTemplateId === 'new') {
    const editorEl = createTemplateEditor({ id: 'new', name: '', color: 'indigo' })
    container.appendChild(editorEl)
  }
}

const createTemplateEditor = (template) => {
  const isNew = template.id === 'new'
  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-indigo-200 dark:border-indigo-500/30 shadow-inner'

  let selectedColor = template.color

  const activeCal = appData.calendars.find((calendar) => calendar.id === currentEditingCalId)
  const colorLabels = activeCal?.colorLabels || {}

  let colorButtonsHtml = ''
  COLORS.forEach((color) => {
    const label = colorLabels[color] || COLOR_NAMES[color]
    const isSelected = color === selectedColor
    colorButtonsHtml += `
      <button
        type="button"
        data-color="${color}"
        class="w-5 h-5 rounded-full bg-${color}-500 ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-800 ${isSelected ? `ring-${color}-500` : 'ring-transparent'} transition-all focus:outline-none"
        title="${label}"
      ></button>
    `
  })

  wrapper.innerHTML = `
    <div>
      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Template Name</label>
      <input
        type="text"
        id="template-edit-name"
        class="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        placeholder="E.g., Replace Furnace Filter"
        value="${template.name}"
        autocomplete="off"
      />
    </div>
    <div>
      <label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Color Tag</label>
      <div class="flex flex-wrap gap-2" id="template-edit-colors">
        ${colorButtonsHtml}
      </div>
    </div>
    <div class="flex justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
      <button
        type="button"
        id="btn-template-edit-cancel"
        class="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        id="btn-template-edit-save"
        class="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm transition-colors"
      >
        Save
      </button>
    </div>
  `

  const buttons = wrapper.querySelectorAll('#template-edit-colors button')
  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      buttons.forEach((btn) => {
        btn.classList.remove(`ring-${btn.dataset.color}-500`)
        btn.classList.add('ring-transparent')
      })
      const clicked = event.currentTarget
      selectedColor = clicked.dataset.color
      clicked.classList.remove('ring-transparent')
      clicked.classList.add(`ring-${selectedColor}-500`)
    })
  })

  wrapper.querySelector('#btn-template-edit-cancel').addEventListener('click', () => {
    currentEditingTemplateId = null
    renderCalModalTemplates()
  })

  const saveBtn = wrapper.querySelector('#btn-template-edit-save')
  const nameInput = wrapper.querySelector('#template-edit-name')

  const handleSave = () => {
    const val = nameInput.value.trim()
    if (!val) return

    if (isNew) {
      tempTemplates.push({
        id: generateUUID(),
        name: val,
        color: selectedColor
      })
    } else {
      const existing = tempTemplates.find((tempTemplate) => tempTemplate.id === template.id)
      if (existing) {
        existing.name = val
        existing.color = selectedColor
      }
    }

    currentEditingTemplateId = null
    renderCalModalTemplates()
  }

  saveBtn.addEventListener('click', handleSave)

  nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSave()
    }
  })

  setTimeout(() => nameInput.focus(), 50)

  return wrapper
}

const openCalModal = (calId = null, calName = '') => {
  currentEditingCalId = calId
  calNameInput.value = calName

  // Populate color label inputs
  const cal = calId ? appData.calendars.find((calendar) => calendar.id === calId) : null
  const colorLabels = cal?.colorLabels || {}
  COLORS.forEach((color) => {
    const input = document.getElementById(`cal-color-label-${color}`)
    if (input) input.value = colorLabels[color] || ''
  })

  // Initialize templates state
  tempTemplates = cal?.quickAddTemplates ? cal.quickAddTemplates.map((template) => ({ ...template })) : []
  currentEditingTemplateId = null
  renderCalModalTemplates()

  if (calId) {
    calModalTitle.textContent = 'Edit Calendar'
    btnSaveCal.textContent = 'Save'
    btnDeleteCalDirect.classList.remove('hidden')
  } else {
    calModalTitle.textContent = 'Create New Calendar'
    btnSaveCal.textContent = 'Create'
    btnDeleteCalDirect.classList.add('hidden')
  }

  newCalModal.classList.remove('hidden')
  setTimeout(() => calNameInput.focus(), 50)
}

const closeCalModal = () => {
  newCalModal.classList.add('hidden')
  currentEditingCalId = null
}

newCalModal.addEventListener('click', (event) => {
  if (event.target === newCalModal) closeCalModal()
})

document.getElementById('btn-new-calendar').addEventListener('click', () => openCalModal())
document.getElementById('btn-cancel-cal').addEventListener('click', closeCalModal)

btnDeleteCalDirect.addEventListener('click', () => {
  if (currentEditingCalId) {
    const cal = appData.calendars.find((calendar) => calendar.id === currentEditingCalId)
    if (cal) {
      openDeleteCalModal(cal.id, cal.name)
    }
    closeCalModal()
  }
})

btnSaveCal.addEventListener('click', () => {
  const name = calNameInput.value.trim()
  if (!name) return

  // Collect color labels (only save non-empty ones)
  const colorLabels = {}
  COLORS.forEach((color) => {
    const input = document.getElementById(`cal-color-label-${color}`)
    const val = input?.value.trim()
    if (val) colorLabels[color] = val
  })

  if (currentEditingCalId) {
    const cal = appData.calendars.find((calendar) => calendar.id === currentEditingCalId)
    if (cal) {
      cal.name = name
      cal.colorLabels = colorLabels
      cal.quickAddTemplates = tempTemplates
    }
  } else {
    const newCalId = generateUUID()
    appData.calendars.push({ id: newCalId, name, colorLabels, quickAddTemplates: tempTemplates })
    appData.activeCalId = newCalId // Auto-switch to new cal
  }

  saveData()
  renderChips()
  renderCurrentView()
  closeCalModal()
})

// --- Delete Calendar Confirmation Modal ---
let calendarToDelete = null

const openDeleteCalModal = (calId, calName) => {
  calendarToDelete = calId
  document.getElementById('delete-cal-name').textContent = `"${calName}"`
  document.getElementById('delete-cal-modal').classList.remove('hidden')
}

const closeDeleteCalModal = () => {
  calendarToDelete = null
  document.getElementById('delete-cal-modal').classList.add('hidden')
}

const deleteCalModal = document.getElementById('delete-cal-modal')
deleteCalModal.addEventListener('click', (e) => {
  if (e.target === deleteCalModal) closeDeleteCalModal()
})

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  const colorFilterPanel = document.getElementById('color-filter-panel')
  if (colorFilterPanel && !colorFilterPanel.classList.contains('hidden')) closeColorFilterDropdown()
  else if (!entryModal.classList.contains('hidden')) closeEntryModal()
  else if (!quickAddModal.classList.contains('hidden')) closeQuickAddModal()
  else if (!newCalModal.classList.contains('hidden')) closeCalModal()
  else if (!deleteCalModal.classList.contains('hidden')) closeDeleteCalModal()
})

document.getElementById('btn-cancel-delete-cal').addEventListener('click', closeDeleteCalModal)

document.getElementById('btn-add-quick-template').addEventListener('click', () => {
  currentEditingTemplateId = 'new'
  renderCalModalTemplates()
})

document.getElementById('btn-close-quick-add').addEventListener('click', closeQuickAddModal)
document.getElementById('btn-cancel-quick-add').addEventListener('click', closeQuickAddModal)
quickAddModal.addEventListener('click', (event) => {
  if (event.target === quickAddModal) closeQuickAddModal()
})

document.getElementById('btn-confirm-delete-cal').addEventListener('click', () => {
  if (!calendarToDelete) return

  // Delete the calendar and all its entries from state
  appData.calendars = appData.calendars.filter((c) => c.id !== calendarToDelete)
  appData.entries = appData.entries.filter((e) => e.calendarId !== calendarToDelete)

  // Re-assign active calendar if the active one was deleted
  if (appData.activeCalId === calendarToDelete) {
    if (appData.calendars.length > 0) {
      appData.activeCalId = appData.calendars[0].id
    } else {
      // Always guarantee at least one default calendar exists
      const defaultCalId = generateUUID()
      appData.calendars.push({ id: defaultCalId, name: 'My Calendar' })
      appData.activeCalId = defaultCalId
    }
  }

  activeColorFilter = null
  saveData()
  renderChips()
  renderCurrentView()
  closeDeleteCalModal()
})

// --- Initialize App ---
window.addEventListener('DOMContentLoaded', async () => {
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!('theme' in localStorage)) {
      if (e.matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  })

  const calSelect = document.getElementById('cal-select')
  if (calSelect) {
    calSelect.addEventListener('change', (e) => {
      appData.activeCalId = e.target.value
      activeColorFilter = null
      saveData()
      renderChips()
      renderCurrentView()
    })
  }

  const editCalBtn = document.getElementById('btn-edit-cal')
  if (editCalBtn) {
    editCalBtn.addEventListener('click', () => {
      const activeCal = appData.calendars.find((c) => c.id === appData.activeCalId)
      if (activeCal) {
        openCalModal(activeCal.id, activeCal.name)
      }
    })
  }

  // Color filter dropdown toggle
  document.getElementById('btn-color-filter').addEventListener('click', (e) => {
    e.stopPropagation()
    document.getElementById('color-filter-panel').classList.toggle('hidden')
  })

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('color-filter-dropdown-wrapper')
    if (wrapper && !wrapper.contains(e.target)) closeColorFilterDropdown()
  })

  document.getElementById('btn-toggle-view').addEventListener('click', () => {
    setView(currentView === 'calendar' ? 'agenda' : 'calendar')
  })

  await loadData()
  renderChips()
  renderCurrentView()
})
