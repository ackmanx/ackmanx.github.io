if (!localStorage.getItem('super_secret')) {
    window.location.href = 'fake_security.html';
}
fetch('https://friends-of-mongo.vercel.app/mhunter/artist', {
    headers: {
        Authorization: localStorage.getItem('super_secret') ?? ''
    }
});
