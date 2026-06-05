import { peopleData } from './people.js'

let selectedPersonName = 'myself'
let currentPerson = peopleData.find((p) => p.name === selectedPersonName) || peopleData[0]

const nameEl = document.getElementById('person-name')
const yearsEl = document.getElementById('age-years')
const monthsEl = document.getElementById('age-months')
const birthdayEl = document.getElementById('birthday')
const countdownEl = document.getElementById('countdown')
const navList = document.getElementById('nav-list')

function updateCountdown() {
  if (!currentPerson) return

  const DateTime = luxon.DateTime
  const now = DateTime.now()
  const birthday = DateTime.fromISO(currentPerson.birthday)

  let nextBirthday = birthday.set({ year: now.year })

  if (nextBirthday < now) {
    nextBirthday = nextBirthday.plus({ years: 1 })
  }

  const diff = nextBirthday
    .diff(now, ['days', 'hours', 'minutes', 'seconds', 'milliseconds'])
    .toObject()

  const days = Math.floor(diff.days)

  countdownEl.textContent = `next birthday in ${days} days`
}

function renderPerson() {
  if (!currentPerson) return

  const DateTime = luxon.DateTime
  const birthday = DateTime.fromISO(currentPerson.birthday)
  const diff = DateTime.now().diff(birthday, ['years', 'months'])

  nameEl.textContent = currentPerson.name
  yearsEl.textContent = `${diff.values.years} years old`
  monthsEl.textContent = `(and ${Math.floor(diff.values.months)} months)`
  birthdayEl.textContent = birthday.toLocaleString(DateTime.DATE_FULL)

  updateCountdown()
}

function selectPerson(name) {
  selectedPersonName = name
  currentPerson = peopleData.find((p) => p.name === name)
  renderPerson()
}

function renderNav() {
  navList.innerHTML = ''
  peopleData.forEach((person) => {
    const li = document.createElement('li')
    const button = document.createElement('button')
    button.textContent = person.name
    button.addEventListener('click', () => selectPerson(person.name))
    li.appendChild(button)
    navList.appendChild(li)
  })
}

function init() {
  renderPerson()
  renderNav()
}

init()
