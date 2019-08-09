// ==UserScript==
// @name            Pawoo Twitter Preview
// @namespace       https://onee3.org
// @version         0.1.0
// @description     Preview Twitter images in Pawoo
// @copyright       2019, Frederick888 (https://openuserjs.org/users/Frederick888)
// @author          Frederick888
// @license         GPL-3.0-or-later
// @homepageURL     https://github.com/Frederick888/pawoo-twitter-preview
// @supportURL      https://github.com/Frederick888/pawoo-twitter-preview/issues
// @contributionURL https://github.com/Frederick888/pawoo-twitter-preview/pull
// @updateURL       https://openuserjs.org/meta/Frederick888/Pawoo_Twitter_Preview.meta.js
// @match           https://pawoo.net/*
// @grant           GM.xmlHttpRequest
// ==/UserScript==

function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function fetchTwitterPreviewImage(twitterLink) {
    let twitterUrl = twitterLink.getAttribute('href');
    GM.xmlHttpRequest({
        method: 'GET',
        url: twitterUrl,
        headers: {
            'User-Agent': 'curl/7.65.3',
            'Accept': '*/*',
        },
        onload: function (response) {
            var responseXML = new DOMParser().parseFromString(response.responseText, "text/html");

            let mediaGallery = htmlToElement(`
<div class="media-gallery">
    <div class="media-gallery__item" style="inset: auto; width: 100%; height: 100%;">
        <a class="media-gallery__item-thumbnail" href="" target="_blank">
            <img src="">
        </a>
    </div>
</div>
            `);

            let openGraphImage = responseXML.querySelector('meta[property="og:image"]');
            if (openGraphImage) {
                console.log(twitterLink);
                console.log(openGraphImage.getAttribute('content'));
                mediaGallery.querySelector('a.media-gallery__item-thumbnail').setAttribute('href', twitterUrl);
                let container = twitterLink.closest('.status__content');
                GM.xmlHttpRequest({
                    method: 'GET',
                    url: openGraphImage.getAttribute('content'),
                    headers: {
                        'User-Agent': 'curl/7.65.3',
                        'Accept': '*/*',
                    },
                    responseType: 'arraybuffer',
                    onload: function (responseImage) {
                        let contentTypeRegExp = new RegExp('^content-type:\s*(.+?)$', 'mi');
                        let contentType = contentTypeRegExp.exec(responseImage.responseHeaders);
                        if (contentType.length) {
                            contentType = contentType[1].trim();
                            let base64 = btoa(
                                new Uint8Array(responseImage.response)
                                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
                            );
                            mediaGallery.querySelector('img').setAttribute('src', 'data:' + contentType + ';base64,' + base64);
                            container.after(mediaGallery);
                        }
                    },
                });
            }
        },
    });
}

function mainLoop() {
    document.querySelectorAll('a.status-link[href*="twitter.com"]')
        .forEach((twitterLink) => {
            if (twitterLink.getAttribute('twitter-processed') === '1') {
                return;
            }
            twitterLink.setAttribute('twitter-processed', '1');
            fetchTwitterPreviewImage(twitterLink);
        });
}

(function () {
    'use strict';
    if (typeof MutationObserver === 'function') {
        let observerConfig = {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true,
        };
        let body = document.getElementsByTagName('body')[0];
        let observer = new MutationObserver(mainLoop);
        observer.observe(body, observerConfig);
    } else {
        mainLoop();
        setInterval(mainLoop, 200);
    }
})();
