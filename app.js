const defaults = { beat: 0, lyrics: 0, sound: 0, idea: 0, energy: 0, impression: 0 };
const values = { ...defaults };
const extraNames = { atmosphere: 'Атмосфера', mix: 'Сведение', vocal: 'Подача', originality: 'Оригинальность' };
const extraValues = { atmosphere: 0, mix: 0, vocal: 0, originality: 0 };
const activeExtras = new Set();
const knobs = [...document.querySelectorAll('.knob')];
const focusButtons = [...document.querySelectorAll('.focus-button')];
const extraItems = [...document.querySelectorAll('.extra-item')];
const scoreEl = document.getElementById('score');
const headingEl = document.getElementById('result-heading');
const descriptionEl = document.getElementById('result-description');
const copyButton = document.getElementById('copy-button');
const unclearButton = document.getElementById('unclear-lyrics');
let focus = 'all';
let shownScore = 0;
let animationFrame = 0;

function totalScore() {
  let sum = 0;
  let weightSum = 0;
  for (const [key, value] of Object.entries(values)) {
    const weight = key === focus ? 2.5 : 1;
    sum += value * weight;
    weightSum += weight;
  }
  for (const key of activeExtras) { sum += extraValues[key]; weightSum += 1; }
  return sum / weightSum;
}

function verdict(score) {
  if (score === 0) return ['Начни оценку', 'Поверни крутилки и оцени трек.'];
  if (score >= 8.5) return ['Хочется на повтор', 'Трек попал точно в цель.'];
  if (score >= 7) return ['Звучит уверенно', 'Трек оставляет хорошее впечатление.'];
  if (score >= 5) return ['Есть потенциал', 'В нём уже есть за что зацепиться.'];
  if (score >= 3) return ['Пока не зацепил', 'Не всё сложилось в цельное ощущение.'];
  return ['Не твоё звучание', 'Сегодня этот трек не попал в настроение.'];
}

function updateResult(animate = true) {
  const target = totalScore();
  const [heading, description] = verdict(target);
  headingEl.textContent = heading;
  descriptionEl.textContent = description;
  cancelAnimationFrame(animationFrame);
  if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shownScore = target;
    scoreEl.textContent = target.toFixed(1);
    return;
  }
  const start = shownScore;
  const startTime = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - startTime) / 280);
    shownScore = start + (target - start) * (1 - Math.pow(1 - t, 3));
    scoreEl.textContent = shownScore.toFixed(1);
    if (t < 1) animationFrame = requestAnimationFrame(frame);
  }
  animationFrame = requestAnimationFrame(frame);
}

function renderKnob(knob) {
  const value = values[knob.dataset.key];
  const angle = (225 + value / 10 * 270) * Math.PI / 180;
  const radius = knob.clientWidth / 2 - 4;
  knob.style.setProperty('--fill-angle', `${value / 10 * 270}deg`);
  knob.style.setProperty('--dot-x', `${Math.sin(angle) * radius}px`);
  knob.style.setProperty('--dot-y', `${-Math.cos(angle) * radius}px`);
  knob.querySelector('.knob-value').textContent = value.toFixed(1);
  knob.setAttribute('aria-valuenow', value);
  knob.setAttribute('aria-valuetext', `${value.toFixed(1)} из 10`);
}

function setKnobValue(knob, next) {
  values[knob.dataset.key] = Math.max(0, Math.min(10, Math.round(next * 2) / 2));
  if (knob.dataset.key === 'lyrics') {
    unclearButton.classList.remove('is-active');
    unclearButton.setAttribute('aria-pressed', 'false');
  }
  renderKnob(knob);
  updateResult();
}

function pointerValue(knob, event) {
  const rect = knob.getBoundingClientRect();
  const x = event.clientX - rect.left - rect.width / 2;
  const y = event.clientY - rect.top - rect.height / 2;
  const angle = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
  const progress = angle >= 225 ? (angle - 225) / 270 : angle <= 135 ? (angle + 135) / 270 : angle < 180 ? 1 : 0;
  return progress * 10;
}

knobs.forEach(knob => {
  knob.addEventListener('pointerdown', event => {
    knob.setPointerCapture(event.pointerId);
    setKnobValue(knob, pointerValue(knob, event));
  });
  knob.addEventListener('pointermove', event => {
    if (knob.hasPointerCapture(event.pointerId)) setKnobValue(knob, pointerValue(knob, event));
  });
  knob.addEventListener('keydown', event => {
    const step = { ArrowRight: .5, ArrowUp: .5, ArrowLeft: -.5, ArrowDown: -.5, PageUp: 1, PageDown: -1 }[event.key];
    if (step !== undefined) { event.preventDefault(); setKnobValue(knob, values[knob.dataset.key] + step); }
    if (event.key === 'Home') { event.preventDefault(); setKnobValue(knob, 0); }
    if (event.key === 'End') { event.preventDefault(); setKnobValue(knob, 10); }
  });
  renderKnob(knob);
});

unclearButton.addEventListener('click', () => {
  const selected = unclearButton.getAttribute('aria-pressed') !== 'true';
  const lyricsKnob = document.querySelector('.knob[data-key="lyrics"]');
  setKnobValue(lyricsKnob, selected ? 4 : 0);
  unclearButton.classList.toggle('is-active', selected);
  unclearButton.setAttribute('aria-pressed', String(selected));
});

focusButtons.forEach(button => button.addEventListener('click', () => {
  focus = button.dataset.focus;
  focusButtons.forEach(item => {
    const selected = item === button;
    item.classList.toggle('is-active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  updateResult();
}));

extraItems.forEach(item => {
  const key = item.dataset.extra;
  const button = item.querySelector('.extra-toggle');
  const range = item.querySelector('input');
  const output = item.querySelector('output');
  button.addEventListener('click', () => {
    if (activeExtras.has(key)) activeExtras.delete(key);
    else activeExtras.add(key);
    const active = activeExtras.has(key);
    item.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    range.disabled = !active;
    document.getElementById('extras-count').textContent = `${activeExtras.size} / 4 ВКЛЮЧЕНО`;
    updateResult();
  });
  range.addEventListener('input', () => {
    extraValues[key] = Number(range.value);
    output.textContent = extraValues[key].toFixed(1);
    updateResult();
  });
});

document.getElementById('reset-button').addEventListener('click', () => {
  Object.assign(values, defaults);
  knobs.forEach(renderKnob);
  unclearButton.classList.remove('is-active');
  unclearButton.setAttribute('aria-pressed', 'false');
  for (const item of extraItems) {
    if (activeExtras.has(item.dataset.extra)) item.querySelector('.extra-toggle').click();
    const range = item.querySelector('input');
    range.value = 0;
    item.querySelector('output').textContent = '0.0';
    extraValues[item.dataset.extra] = 0;
  }
  focusButtons[0].click();
  updateResult();
});

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* local files may block clipboard */ }
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Clipboard unavailable');
}

copyButton.addEventListener('click', async () => {
  const label = copyButton.querySelector('span');
  const extras = [...activeExtras].map(key => `${extraNames[key]} ${extraValues[key]}/10`);
  const lyricsPart = unclearButton.getAttribute('aria-pressed') === 'true'
    ? `Неразборчивый текст ${values.lyrics}/10`
    : `текст ${values.lyrics}/10`;
  const text = `Оценка трека: ${totalScore().toFixed(1)}/10. Бит ${values.beat}/10, ${lyricsPart}, звучание ${values.sound}/10, идея ${values.idea}/10, энергия ${values.energy}/10, впечатление ${values.impression}/10${extras.length ? ', ' + extras.join(', ') : ''}.`;
  try { await copyText(text); label.textContent = 'СКОПИРОВАНО'; }
  catch { label.textContent = 'НЕ УДАЛОСЬ СКОПИРОВАТЬ'; }
  setTimeout(() => { label.textContent = 'СКОПИРОВАТЬ ОЦЕНКУ'; }, 2200);
});

window.addEventListener('resize', () => knobs.forEach(renderKnob));
updateResult(false);
