const base_url = window.location.origin + window.location.pathname;

window.onload = () => {
    //By DeepLink
    const deepLinkBtnEl = document.querySelector('.btn-deeplink');
    deepLinkBtnEl.addEventListener('click', (e) => {
        makeDisabled(deepLinkBtnEl, false);
        fetch(base_url + 'api/sign-in')
            .then((r) =>
                Promise.all([Promise.resolve(r.headers.get('x-id')), r.json()])
            )
            .then(([id, data]) => {
                console.log('data', data);
                const deepLink = data.deepLink;
                window.open(deepLink, '_blank');
                makeDisabled(deepLinkBtnEl, true);
                return id;
            })
            .catch((err) => console.log(err));
    });
};

function makeQr(el, data) {
    return new QRCode(el, {
        text: JSON.stringify(data),
        width: 450,
        height: 450,
        colorDark: '#000',
        colorLight: '#e9e9e9',
        correctLevel: QRCode.CorrectLevel.L,
    });
}

function handleDisplay(el, needShow, display = 'block') {
    el.style.display = needShow ? display : 'none';
}

function makeDisabled(el, disabled, cls = 'disabled') {
    if (disabled) {
        el.disabled = true;
        el.classList.add(cls);
    } else {
        el.classList.remove(cls);
        el.disabled = false;
    }
}
