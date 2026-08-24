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
const $albums = $$('.album');
$albums.forEach(($album)=>{
    if (!$album.dataset.albumName) {
        throw new Error('You did the impossible. Album name is not found');
    }
    const $button = $album.querySelector('.mark-as-viewed-button');
    const is_viewed = window.mhunter.artist.viewed.includes($album.dataset.albumName);
    set_album_viewed_state($album, $button, is_viewed);
    $button?.addEventListener('click', mark_album_viewed_status);
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
    const $album = $button.closest('.album');
    const album_name = $button.dataset.albumName;
    const artist = window.mhunter.artist;
    if (!album_name || !$album) {
        throw new Error('You did the impossible. Album information is missing from the viewed button');
    }
    const previous_viewed = [
        ...artist.viewed
    ];
    const is_viewed = artist.viewed.includes(album_name);
    artist.viewed = is_viewed ? artist.viewed.filter((viewed_album)=>viewed_album !== album_name) : [
        ...artist.viewed,
        album_name
    ].sort();
    set_album_viewed_state($album, $button, !is_viewed);
    $button.disabled = true;
    try {
        const response_body = await update_artist_viewed(artist.name, artist.viewed);
        if (response_body.message) {
            throw new Error(response_body.message);
        }
        filter_albums();
    } catch (error) {
        artist.viewed = previous_viewed;
        set_album_viewed_state($album, $button, is_viewed);
        console.error('Could not update album viewed status', error);
    } finally{
        $button.disabled = false;
    }
}
function set_album_viewed_state($album, $button, is_viewed) {
    $album.classList.toggle('is-viewed', is_viewed);
    if (!$button?.dataset.albumName) return;
    const action = is_viewed ? 'not viewed' : 'viewed';
    $button.title = `Mark as ${action}`;
}
function filter_albums() {
    const release_year = window.mhunter.filter.release_year;
    const viewed_status = window.mhunter.filter.viewed_status;
    if (release_year === 'all' && viewed_status === 'all') {
        for (const $album of $$('.album')){
            $album.classList.remove('hidden');
        }
        $('.no-results-message')?.classList.add('hidden');
        return;
    }
    for (const $album of $$('.album')){
        const album_name = $album.dataset.albumName;
        if (!album_name) {
            throw new Error('You did the impossible. Album name is not found on one of the `.album` elements');
        }
        const is_viewed = window.mhunter.artist.viewed.includes(album_name);
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
