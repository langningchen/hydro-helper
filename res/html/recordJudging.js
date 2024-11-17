window.onload = () => {
    const detail = document.getElementById('detail');
    window.onmessage = event => {
        const message = event.data;
        detail.innerHTML = message.status_html;
    };
};
