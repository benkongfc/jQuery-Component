//must change jqc_ver && this at the same time, page will load new code
const PRECACHE = 'precache_v2018082812';

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
  './', // Alias for index.html
  'jqc.js',
  'jqc_utils.js',
  'components/appCmd.html',
  'components/appCmd.js',
  'components/cmd_aboutus.html',
  'components/cmd_aboutus.js',
  'components/cmd_book.html',
  'components/cmd_book.js',
  'components/cmd_cabins_select.html',
  'components/cmd_cabins_select.js',
  'components/cmd_contactus.html',
  'components/cmd_contactus.js',
  'components/cmd_dealslide.html',
  'components/cmd_dealslide.js',
  'components/cmd_details.html',
  'components/cmd_details.js',
  'components/cmd_enquiry.html',
  'components/cmd_enquiry.js',
  'components/cmd_multicabins.html',
  'components/cmd_multicabins.js',
  'components/cmd_navbar.html',
  'components/cmd_navbar.js',
  'components/cmd_onecabin.html',
  'components/cmd_onecabin.js',
  'components/cmd_ratestable.html',
  'components/cmd_ratestable.js',
];

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// The fetch handler serves responses for same-origin resources from a cache.
self.addEventListener('fetch', event => {
  // Skip cross-origin requests, like those for Google Analytics.
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return caches.open(PRECACHE).then(cache => {
          return fetch(event.request).then(response => {
            // Put a copy of the response in the runtime cache.
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  }
});