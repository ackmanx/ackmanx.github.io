async function fetch_artist_viewed(name) {
    const auth_code = localStorage.getItem('super_secret');
    if (!auth_code) {
        alert(`Uh oh, you seem to be missing the super_secret password`);
    }
    const response = await fetch(`https://friends-of-mongo.vercel.app/mhunter/artist?name=${encodeURIComponent(name)}`, {
        headers: {
            Authorization: auth_code ?? ''
        }
    });
    return response.json();
}
async function update_artist_viewed(name, viewed_array) {
    const auth_code = localStorage.getItem('super_secret');
    if (!auth_code) {
        alert(`Uh oh, you seem to be missing the super_secret password`);
    }
    const response = await fetch(`https://friends-of-mongo.vercel.app/mhunter/artist?name=${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: auth_code ?? ''
        },
        body: JSON.stringify({
            viewed_albums: viewed_array
        })
    });
    return response.json();
}
const $ = (selector)=>document.querySelector(selector);
const $$ = (selector)=>document.querySelectorAll(selector);
const $main = $('main');
if (!$main) {
    throw new Error('You did the impossible. The app itself did not even load');
}
if (!$main.dataset.artistName) {
    throw new Error('You did the impossible. Artist name is not found on the `main` element');
}
const artist = await fetch_artist_viewed($main.dataset.artistName);
window.mhunter = {
    artist: artist ?? {
        name: $main.dataset.artistName,
        viewed: []
    },
    filter: {
        release_year: 'all',
        viewed_status: 'new'
    }
};
const $mark_viewed_buttons = $$('.mark-as-viewed-button');
$mark_viewed_buttons.forEach(($button)=>{
    $button.addEventListener('click', mark_album_viewed_status);
    if (!$button.dataset.albumName) {
        throw new Error('You did the impossible. Album name is not found');
    }
    if (window.mhunter.artist.viewed.includes($button.dataset.albumName)) {
        $button.innerHTML = '✔ Viewed';
        $button.classList.add('is-viewed');
    } else {
        $button.innerHTML = '○ Mark viewed';
        $button.classList.remove('is-viewed');
    }
});
const $year_filters = $$('input[name="release-year"]');
$year_filters.forEach(($input)=>{
    $input.addEventListener('click', filter_by_year);
});
const $viewed_filters = $$('input[name="view-status-filter"]');
$viewed_filters.forEach(($input)=>{
    $input.addEventListener('click', filter_by_viewed_status);
});
const current_viewed_status_filter = $('input[name="view-status-filter"]:checked');
filter_by_viewed_status({
    currentTarget: current_viewed_status_filter
});
$('.loading-spinner-container')?.classList.add('hidden');
$('.albums-list')?.classList.remove('transparent');
function filter_by_year(event) {
    const $radio_input = event.currentTarget;
    window.mhunter.filter.release_year = $radio_input.value;
    filter_albums();
}
function filter_by_viewed_status(event) {
    const $radio_input = event.currentTarget;
    window.mhunter.filter.viewed_status = $radio_input.value;
    filter_albums();
}
async function mark_album_viewed_status(event) {
    const $button = event.currentTarget;
    const artist = window.mhunter.artist;
    if (!$button.dataset.albumName) {
        throw new Error('You did the impossible. Album name is not found one of the `button` elements');
    }
    if ($button.classList.contains('is-viewed')) {
        const album_index = artist.viewed.indexOf($button.dataset.albumName);
        artist.viewed.splice(album_index, 1);
        $button.innerHTML = '○ Mark viewed';
        $button.classList.remove('is-viewed');
    } else {
        artist.viewed.push($button.dataset.albumName);
        artist.viewed.sort();
        $button.innerHTML = '✔ Viewed';
        $button.classList.add('is-viewed');
    }
    const response_body = await update_artist_viewed(artist.name, artist.viewed);
    if (response_body.message) {
        console.error(response_body.message);
        return;
    }
    filter_albums();
}
function filter_albums() {
    const release_year = window.mhunter.filter.release_year;
    const viewed_status = window.mhunter.filter.viewed_status;
    if (release_year === 'all' && viewed_status === 'all') {
        for (const $album of $$('.album')){
            $album.classList.remove('hidden');
        }
        return;
    }
    for (const $album of $$('.album')){
        const is_viewed = Boolean($album.querySelector(':has(.is-viewed)'));
        const matches_year = $album.dataset.releaseYear === release_year;
        if (release_year === 'all') {
            if (viewed_status === 'new') {
                is_viewed ? $album.classList.add('hidden') : $album.classList.remove('hidden');
                continue;
            }
            if (viewed_status === 'viewed') {
                is_viewed ? $album.classList.remove('hidden') : $album.classList.add('hidden');
                continue;
            }
        }
        if (viewed_status === 'all') {
            if (matches_year) {
                $album.classList.remove('hidden');
                continue;
            } else {
                $album.classList.add('hidden');
                continue;
            }
        }
        if (viewed_status === 'new' && is_viewed) {
            $album.classList.add('hidden');
            continue;
        }
        if (viewed_status === 'viewed' && !is_viewed) {
            $album.classList.add('hidden');
            continue;
        }
        if (matches_year) {
            $album.classList.remove('hidden');
            continue;
        } else {
            $album.classList.add('hidden');
            continue;
        }
    }
    const all_albums_count = Number($main?.dataset.albumsCount);
    const all_hidden_albums = $$('.album.hidden');
    if (all_albums_count === all_hidden_albums.length) {
        $('#no-results-year-filter').innerHTML = window.mhunter.filter.release_year;
        $('#no-results-viewed-status-filter').innerHTML = window.mhunter.filter.viewed_status;
        $('.no-results-message')?.classList.remove('hidden');
    } else {
        $('.no-results-message')?.classList.add('hidden');
    }
}
