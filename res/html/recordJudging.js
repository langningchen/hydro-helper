window.addEventListener('DOMContentLoaded', () => {
    const detail = document.getElementById('detail');
    window.addEventListener('message', event => {
        const message = event.data;
        detail.innerHTML = message.status_html;
    });
});
