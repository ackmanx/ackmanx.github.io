// const data = await fetch('https://api.jsonbin.io/v3/qs/69569f86d0ea881f404deaf5')
// window.__viewed = (await data.json()).record

const main = document.querySelector('main')

if (!localStorage.getItem(main.dataset.artistName)) {
  localStorage.setItem(main.dataset.artistName, '[]')
}

const artist_viewed = JSON.parse(localStorage.getItem(main.dataset.artistName))

const viewed_buttons = document.querySelectorAll('section button')

viewed_buttons.forEach((button) => {
  button.addEventListener('click', toggle_viewed_status)

  if (artist_viewed.includes(button.dataset.albumName)) {
    button.classList.add('viewed')
  }
})

function toggle_viewed_status() {
  const button = event.target

  const artist_viewed = JSON.parse(localStorage.getItem(button.dataset.artistName))

  if (button.classList.contains('viewed')) {
    artist_viewed.toSpliced(artist_viewed.indexOf(button.dataset.albumName))
    button.classList.remove('viewed')
  } else {
    artist_viewed.push(button.dataset.albumName)
    artist_viewed.sort()
    button.classList.add('viewed')
  }

  localStorage.setItem(button.dataset.artistName, JSON.stringify(artist_viewed))
}
