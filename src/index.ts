import { hookCtor, initHooks } from './hooks.js';

(window as unknown as Record<string, unknown>).run = async function run() {
    await fetch('./test/b.js');
    const modA = await import('./test/a.js');
    hookCtor(modA.Foo, () => {console.log('hooked')})
    const modB = await import('./test/b.js');
    modB.run('testing');
}

initHooks();