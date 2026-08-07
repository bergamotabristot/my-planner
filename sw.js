const CACHE_NAME = "my-day-v1";

const FILES = [
    "./",
    "./index.html",
    "./css/main.css",
    "./js/app.js",
    "./manifest.json"
];


self.addEventListener("fetch", event => {
    event.respondWith(fetch(event.request));
});


self.addEventListener("fetch", event => {

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );

});