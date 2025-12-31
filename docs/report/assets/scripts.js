function toggle_viewed_status() {
  const button = event.target

  if (button.classList.contains('viewed')) {
    localStorage.removeItem(button.dataset.localStorageKey)
  } else {
    localStorage.setItem(button.dataset.localStorageKey, true)
  }

  button.classList.toggle('viewed')
}

document.addEventListener('DOMContentLoaded', function () {
  const viewed_buttons = document.querySelectorAll('section button')

  viewed_buttons.forEach((button) => {
    if (localStorage.getItem(button.dataset.localStorageKey)) {
      button.classList.toggle('viewed')
    }
  })
})
