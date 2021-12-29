const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', () => {
    sw.skipWaiting();
});

sw.addEventListener('activate', (event) =>  {
    event.waitUntil(sw.clients.claim());
});

const requests = new Map<number, (keys: string[]) => void>();
let requestNr = 0;

sw.addEventListener('message', (event) => {
    if (event.data.type === 'import') {
        const resolve = requests.get(event.data.id);
        requests.delete(event.data.id);

        resolve?.(event.data.keys);
    }
})

sw.addEventListener('fetch', (event) => {
    if (!event.request.url.includes('/test/') || event.request.url.endsWith('?bypass=true')) {
        return event.respondWith(fetch(event.request));
    }
    if (event.request.url.endsWith('.js')) {
        const url = event.request.url.replace('\\', '\\').replace('\'', '\\\'') + '';
        return event.respondWith((async () => {
            const id = requestNr++;
            const client = await sw.clients.get(event.clientId)
            const keys = await new Promise<string[]>(resolve => {
                requests.set(id, resolve);
                client?.postMessage({type: 'import', url: url + '?bypass=true', id});
            });

            const reducedKeys = keys.filter(k => k !== 'default' && k !== 'modul');
            let moduleKey = 'modul';
            while (keys.includes(moduleKey)) {
                moduleKey += '_';
            }

            const resultCode: string = `
import * as modul from '${url}?bypass=true';
${reducedKeys.map(k => `export const ${k} = globalThis.hookImport(modul['${k}']);`).join('\n')}
${keys.includes('modul') ? `const ${moduleKey} = globalThis.hookImport(modul['modul']);\nexport { ${moduleKey} as modul };` : ''}
${keys.includes('default') ? 'export default globalThis.hookImport(modul["default"]);' : ''}
`
            
            return new Response(new Blob([resultCode], {type: 'text/javascript'}));
        })());
    }

    return event.respondWith(fetch(event.request));
});