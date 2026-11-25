export function mountTouch(root, actions, signal) {
    const panel = root.querySelector('.nb-touch');
    const stick = panel.querySelector('.nb-stick');
    const thumb = stick.querySelector('i');
    const held = new Map();
    const interactionPresses = new Map();
    let owner;
    const axes = { x: 0, y: 0 };
    function release(id, activate = false) {
        if (id === owner) {
            owner = undefined;
            axes.x = axes.y = 0;
            thumb.style.transform = '';
        }
        const button = held.get(id);
        held.delete(id);
        const press = interactionPresses.get(id);
        if (press) {
            window.clearTimeout(press.timer);
            interactionPresses.delete(id);
            if (activate && !press.long && !panel.hidden) actions.interact();
        }
        if (button && ![...held.values()].includes(button)) button.classList.remove('nb-pressed');
    }
    function reset() {
        for (const [id, button] of held) {
            if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
            release(id);
        }
        if (owner !== undefined && stick.hasPointerCapture(owner)) stick.releasePointerCapture(owner);
        release(owner);
    }
    function move(event) {
        if (event.pointerId !== owner) return;
        const bounds = stick.getBoundingClientRect();
        const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width * .32);
        const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height * .32);
        const scale = Math.max(1, Math.hypot(x, y));
        axes.x = Math.abs(x / scale) < .12 ? 0 : x / scale;
        axes.y = Math.abs(y / scale) < .12 ? 0 : y / scale;
        thumb.style.transform = 'translate(' + axes.x * 28 + 'px,' + axes.y * 28 + 'px)';
    }
    panel.addEventListener('pointerdown', event => {
        const button = event.target.closest('button');
        if (!button || button.disabled || panel.hidden || event.button !== 0) return;
        if (button === stick && owner !== undefined) return;
        event.preventDefault();
        try { button.setPointerCapture(event.pointerId); } catch { /* Synthetic pointer events lack capture. */ }
        if (button === stick) {
            owner = event.pointerId;
            move(event);
        } else {
            held.set(event.pointerId, button);
            button.classList.add('nb-pressed');
            const action = button.dataset.action;
            if (action === 'interact' && actions.alternate) {
                const press = { long: false, timer: 0 };
                press.timer = window.setTimeout(() => {
                    if (!held.has(event.pointerId) || panel.hidden) return;
                    press.long = true;
                    actions.alternate();
                }, 480);
                interactionPresses.set(event.pointerId, press);
            } else actions[action]?.();
        }
    }, { signal });
    panel.addEventListener('pointermove', move, { signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        panel.addEventListener(type, event => release(event.pointerId, type === 'pointerup'), { signal });
        window.addEventListener(type, event => release(event.pointerId, type === 'pointerup'), { signal });
    }
    window.addEventListener('blur', reset, { signal });
    signal.addEventListener('abort', reset, { once: true });
    return { panel, axes, reset, held: action => [...held.values()].some(button => button.dataset.action === action) };
}
