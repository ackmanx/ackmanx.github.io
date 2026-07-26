document.querySelector('button')?.addEventListener('click', ()=>{
    const password = document.querySelector('input')?.value;
    if (!password) {
        throw new Error('The impossible happened. Password input not found');
    }
    localStorage.setItem('super_secret', password);
    window.location.href = 'index.html';
});
