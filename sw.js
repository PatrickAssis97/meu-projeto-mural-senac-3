const CACHE_NAME = 'senac-mural-cache-v14';
const urlsToCache = [
  '/',
  '/index.html',
  '/metadata.json',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/constants.ts',
  '/services/geminiService.ts',
  '/hooks/useClock.ts',
  '/components/Mural.tsx',
  '/components/Footer.tsx',
  '/components/OpenEnrollments.tsx',
  '/components/OngoingCourses.tsx',
  '/components/NewsCarousel.tsx',
  '/components/InstitutionalVideo.tsx',
  '/components/AdminLogin.tsx',
  '/services/dataService.ts',
  '/components/AdminPanel.tsx',
  '/components/Modal.tsx',
  '/components/Toast.tsx',
  '/context/ToastContext.tsx',
  '/components/WysiwygEditor.tsx',
  '/services/csvParser.ts',
  '/services/scheduleService.ts',
  '/services/securityService.ts',
];

// Instala o service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto e pré-cache dos arquivos da aplicação.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Atualiza o service worker e limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(() => self.clients.claim());
    })
  );
});

// Estratégia de cache Stale-While-Revalidate para solicitações da mesma origem
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Ignora o service worker para solicitações de origem cruzada (CDNs, APIs)
  // e extensões do navegador.
  if (url.origin !== self.location.origin || url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        // Busca na rede em segundo plano para atualizar o cache.
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Verifica se a resposta é válida antes de colocar no cache.
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(error => {
            console.warn(`Fetch falhou para: ${event.request.url}.`, error);
            // Se a busca falhar e não houver resposta em cache, a promessa será rejeitada,
            // resultando em um erro de rede do navegador. Isso é esperado para recursos não cacheados offline.
          });

        // Retorna a resposta em cache imediatamente se disponível, senão aguarda a rede.
        return cachedResponse || fetchPromise;
      });
    })
  );
});