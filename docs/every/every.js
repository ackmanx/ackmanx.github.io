const listContainer = document.getElementById('activity-list')
const inputField = document.getElementById('activity-input')

// Load initial data (now objects to track completion)
let activities = JSON.parse(localStorage.getItem('fridayItems')) || [
  { text: 'shave', completed: false },
]

function saveData() {
  localStorage.setItem('fridayItems', JSON.stringify(activities))
  render()
}

function render() {
  listContainer.innerHTML = ''
  activities.forEach((item, index) => {
    const wrapper = document.createElement('div')
    wrapper.className = 'activity-item'

    // Text portion
    const textSpan = document.createElement('span')
    textSpan.className = `activity-text ${item.completed ? 'completed' : ''}`
    textSpan.textContent = item.text
    textSpan.onclick = () => {
      activities[index].completed = !activities[index].completed
      saveData()
    }

    // Delete portion
    const delBtn = document.createElement('span')
    delBtn.className = 'delete-btn'
    delBtn.innerHTML = '&times;'
    delBtn.onclick = (e) => {
      e.stopPropagation() // Prevents triggering the "cross off" click
      activities.splice(index, 1)
      saveData()
    }

    wrapper.appendChild(textSpan)
    wrapper.appendChild(delBtn)
    listContainer.appendChild(wrapper)
  })
}

inputField.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && inputField.value.trim() !== '') {
    activities.push({ text: inputField.value.trim(), completed: false })
    inputField.value = ''
    saveData()
  }
})

render()
