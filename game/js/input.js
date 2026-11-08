// Finger flick capture. Records every touch point (including the extra in-between
// points phones report) with timestamps, and hands the stroke over on release.
export function flickInput(el, { canStart, onFlick, onMove }) {
  let id = null, samples = [];
  const pt = e => ({ x: e.clientX, y: e.clientY, t: e.timeStamp });

  el.addEventListener("pointerdown", e => {
    if (id !== null || !canStart()) return;
    id = e.pointerId;
    samples = [pt(e)];
    try { el.setPointerCapture(id); } catch (_) { /* old Safari */ }
    onMove?.(samples);
    e.preventDefault();
  });
  el.addEventListener("pointermove", e => {
    if (e.pointerId !== id) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (list.length) for (const c of list) samples.push(pt(c)); else samples.push(pt(e));
    onMove?.(samples);
    e.preventDefault();
  });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    if (e.type === "pointerup") { samples.push(pt(e)); onFlick(samples); }
    else onFlick([]);
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}
