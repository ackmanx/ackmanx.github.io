// --- Application State ---
let appData = {
  calendars: [],
  entries: [],
  activeCalId: null,
}

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
  const stored = localStorage.getItem('calendarAppData')
  if (stored) {
    appData = JSON.parse(stored)
  }

  try {
    const response = await fetch('https://friends-of-mongo.vercel.app/calendar')
    if (response.ok) {
      const data = await response.json()
      if (data && data.appData) {
        appData = data.appData
      }
    }
  } catch (error) {
    console.error('Failed to fetch calendar data', error)
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
  localStorage.setItem('calendarAppData', JSON.stringify(appData))

  try {
    const password = localStorage.getItem('super_secret')
    const response = await fetch('https://friends-of-mongo.vercel.app/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
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

// --- Render Header Chips ---
const renderChips = () => {
  const container = document.getElementById('calendar-chips')
  container.innerHTML = ''
  const mobileSelect = document.getElementById('mobile-cal-select')
  if (mobileSelect) mobileSelect.innerHTML = ''

  appData.calendars.forEach((cal) => {
    const isActive = cal.id === appData.activeCalId

    const chip = document.createElement('div')
    chip.className = `group flex items-center flex-none pl-4 pr-1 py-1 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer select-none ${
      isActive
        ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-md shadow-indigo-200 dark:shadow-none'
        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
    }`

    const nameSpan = document.createElement('span')
    nameSpan.className = 'pr-2'
    nameSpan.textContent = cal.name
    chip.appendChild(nameSpan)

    const editBtn = document.createElement('button')
    editBtn.innerHTML = '<i class="ph ph-pencil-simple"></i>'
    editBtn.className = `opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full flex items-center justify-center ${
      isActive
        ? 'hover:bg-indigo-700 dark:hover:bg-indigo-600 text-indigo-200 hover:text-white'
        : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400'
    }`
    editBtn.title = 'Edit Calendar'

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation() // Prevents the chip from becoming 'active' when trying to edit it
      openCalModal(cal.id, cal.name)
    })

    chip.appendChild(editBtn)

    chip.addEventListener('click', () => {
      appData.activeCalId = cal.id
      saveData()
      renderChips()
      renderCalendar()
    })

    container.appendChild(chip)

    // Populate mobile dropdown
    if (mobileSelect) {
      const option = document.createElement('option')
      option.value = cal.id
      option.textContent = cal.name
      option.selected = isActive
      mobileSelect.appendChild(option)
    }
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
  document.getElementById('current-month-display').textContent =
    `${monthNames[month]} ${year}`

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

  // Fetch entries for active calendar to optimize loop
  const activeEntries = appData.entries.filter(
    (e) => e.calendarId === appData.activeCalId
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
    cell.className = `border rounded-lg p-2 flex flex-col transition-all duration-300 cursor-pointer group ${
      isCurrentMonth
        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md'
        : 'bg-transparent border-transparent opacity-30 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
    } ${isToday ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 border-transparent' : ''}`

    // Add click listener for modal
    cell.addEventListener('click', () => openEntryModal(dateStr, cellDateObj))

    // Date Number Header
    const dateHeader = document.createElement('div')
    dateHeader.className = `text-right mb-1 ${
      isCurrentMonth
        ? 'text-slate-700 dark:text-slate-200'
        : 'text-slate-400 dark:text-slate-500'
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
    entriesContainer.className = 'flex-1 overflow-y-auto no-scrollbar space-y-1'

    // Find matching entries for this date
    const todaysEntries = activeEntries.filter((entry) =>
      isEntryOnDate(entry, cellDateObj)
    )

    todaysEntries.forEach((entry) => {
      const entryEl = document.createElement('div')
      const color = entry.color || 'indigo'
      entryEl.className = `bg-${color}-50 dark:bg-${color}-500/10 border border-${color}-100 dark:border-${color}-500/20 text-${color}-800 dark:text-${color}-300 text-xs px-2 py-1.5 rounded truncate font-medium flex items-center group/item hover:bg-${color}-100 dark:hover:bg-${color}-500/20 transition-colors`

      const titleSpan = document.createElement('span')
      titleSpan.textContent = entry.name
      titleSpan.className = 'truncate pointer-events-none'
      entryEl.appendChild(titleSpan)

      entryEl.addEventListener('click', (e) => {
        e.stopPropagation() // Don't trigger cell click
        openEntryModal(entry.date, parseDateStr(entry.date), entry)
      })

      entriesContainer.appendChild(entryEl)
    })

    cell.appendChild(entriesContainer)
    grid.appendChild(cell)
  }
}

// --- Month Navigation ---
document.getElementById('btn-prev-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1)
  renderCalendar()
})

document.getElementById('btn-next-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1)
  renderCalendar()
})

// --- Entry Modal Logic ---
let currentEditingEntryId = null

const entryModal = document.getElementById('entry-modal')
const entryNameInput = document.getElementById('entry-name')
const entryWebsiteInput = document.getElementById('entry-website')
const entryDescInput = document.getElementById('entry-desc')
const entryCadenceSelect = document.getElementById('entry-cadence')
const btnSaveEntry = document.getElementById('btn-save-entry')
const btnDeleteEntry = document.getElementById('btn-delete-entry')
const modalTitle = document.getElementById('modal-title')

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
  })
})

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

    btnDeleteEntry.classList.add('hidden')
  }

  entryModal.classList.remove('hidden')
  setTimeout(() => entryNameInput.focus(), 50)
}

const closeEntryModal = () => {
  entryModal.classList.add('hidden')
  selectedDateForEntry = null
  currentEditingEntryId = null
}

entryModal.addEventListener('click', (e) => {
  if (e.target === entryModal) closeEntryModal()
})

document.getElementById('btn-close-modal').addEventListener('click', closeEntryModal)
document.getElementById('btn-cancel-entry').addEventListener('click', closeEntryModal)

document.getElementById('btn-save-entry').addEventListener('click', () => {
  const name = entryNameInput.value.trim()
  if (!name) return

  if (currentEditingEntryId) {
    // Update existing
    const entry = appData.entries.find((e) => e.id === currentEditingEntryId)
    if (entry) {
      entry.name = name
      entry.website = entryWebsiteInput.value.trim()
      entry.description = entryDescInput.value.trim()
      entry.cadence = entryCadenceSelect.value
      entry.color = selectedEntryColor
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
    }
    appData.entries.push(newEntry)
  }

  saveData()
  renderCalendar()
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
  renderCalendar()
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

const openCalModal = (calId = null, calName = '') => {
  currentEditingCalId = calId
  calNameInput.value = calName

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

newCalModal.addEventListener('click', (e) => {
  if (e.target === newCalModal) closeCalModal()
})

document
  .getElementById('btn-new-calendar')
  .addEventListener('click', () => openCalModal())
document.getElementById('btn-cancel-cal').addEventListener('click', closeCalModal)

btnDeleteCalDirect.addEventListener('click', () => {
  if (currentEditingCalId) {
    const cal = appData.calendars.find((c) => c.id === currentEditingCalId)
    if (cal) {
      openDeleteCalModal(cal.id, cal.name)
    }
    closeCalModal()
  }
})

btnSaveCal.addEventListener('click', () => {
  const name = calNameInput.value.trim()
  if (!name) return

  if (currentEditingCalId) {
    const cal = appData.calendars.find((c) => c.id === currentEditingCalId)
    if (cal) cal.name = name
  } else {
    const newCalId = generateUUID()
    appData.calendars.push({ id: newCalId, name: name })
    appData.activeCalId = newCalId // Auto-switch to new cal
  }

  saveData()
  renderChips()
  renderCalendar()
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

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (!entryModal.classList.contains('hidden')) closeEntryModal()
  else if (!newCalModal.classList.contains('hidden')) closeCalModal()
  else if (!deleteCalModal.classList.contains('hidden')) closeDeleteCalModal()
})

document
  .getElementById('btn-cancel-delete-cal')
  .addEventListener('click', closeDeleteCalModal)

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

  saveData()
  renderChips()
  renderCalendar()
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

  const mobileSelect = document.getElementById('mobile-cal-select')
  if (mobileSelect) {
    mobileSelect.addEventListener('change', (e) => {
      appData.activeCalId = e.target.value
      saveData()
      renderChips()
      renderCalendar()
    })
  }

  const mobileEditBtn = document.getElementById('btn-edit-mobile-cal')
  if (mobileEditBtn) {
    mobileEditBtn.addEventListener('click', () => {
      const activeCal = appData.calendars.find((c) => c.id === appData.activeCalId)
      if (activeCal) {
        openCalModal(activeCal.id, activeCal.name)
      }
    })
  }

  await loadData()
  renderChips()
  renderCalendar()
})
