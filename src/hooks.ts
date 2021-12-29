const hooks = new Map<Function, (...args: unknown[]) => void>();

export async function initHooks() {
    (window as unknown as Record<string, unknown>).hookImport = function hookImport(ctor: unknown) {
        if (typeof ctor !== 'function' || !/^\s*class\s+/.test(ctor.toString())) {
            return ctor;
        }
        
        const result = class Hook extends (ctor as unknown as any) {
            constructor(...args: unknown[]) {
                super(...preSuper(args));
                //console.log('post hook');
            }
        }
    
        function preSuper(args: unknown[]) {
            //console.log('pre hook');
            const cb = hooks.get(result);
            cb?.(...args);
            return args;
        }
    
        return result;
    }

    await navigator.serviceWorker.register('./worker.js');
    const sw = await navigator.serviceWorker.ready;
    navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data.type === 'import') {
            const module = await import(event.data.url);
            sw.active!.postMessage({type: 'import', keys: Object.keys(module), id: event.data.id});
        }
    });
}

export function hookCtor(clazz: Function, cb: (...args: unknown[]) => void) {
    hooks.set(clazz, cb);
}