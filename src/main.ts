import './style.css';
import { createState, injectTone, rotateCord, setDigit, step } from './model';
import { SwitchboardRenderer } from './render';
import { playDigit } from './audio';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('missing app root');

const digits = ['1','2','3','4','5','6','7','8','9','*','0','#'];
const state = createState();

app.innerHTML = `
<main class="switchboard-room" aria-labelledby="title">
  <section class="wall" aria-label="synthetic manual switchboard wall">
    <div class="station-plaque">
      <p>synthetic telecom bench / no carrier / no live network</p>
      <h1 id="title">switchboard ghostline</h1>
    </div>
    <div class="lamp-bank" aria-hidden="true">
      ${Array.from({length: 32}, (_, i) => `<i style="--i:${i}"></i>`).join('')}
    </div>
    <svg id="boardSvg" viewBox="0 0 760 560" role="img" aria-label="dark manual switchboard wall with fabric cords linking exchange jacks and animated DTMF pulses">
      <defs>
        <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0.08"/><feBlend mode="multiply" in2="SourceGraphic"/></filter>
      </defs>
      <rect class="panel-back" x="10" y="10" width="740" height="540" rx="0"/>
      <g class="socket-grid" aria-hidden="true">
        ${Array.from({length: 48}, (_, i) => {
          const x = 52 + (i % 8) * 91;
          const y = 58 + Math.floor(i / 8) * 82;
          return `<circle cx="${x}" cy="${y}" r="11"/>`;
        }).join('')}
      </g>
      <g id="routes"></g>
      <g id="jacks"></g>
      <g id="pulses"></g>
      <g class="engraving"><text x="36" y="526">manual cord field / dtmf pair monitor / crosstalk decay instrument</text></g>
    </svg>
    <div class="floor-shadow" aria-hidden="true"></div>
  </section>

  <aside class="operator-rack" aria-label="operator rack">
    <div class="readout-cluster" aria-live="polite">
      <span><em>ring</em><b id="ringOut">0.00</b></span>
      <span><em>bleed</em><b id="bleedOut">0.28</b></span>
      <span><em>cross</em><b id="crossOut">0.00</b></span>
    </div>
    <div class="tone-pad" aria-label="DTMF tone pad">
      ${digits.map(d => `<button class="tone-key" data-digit="${d}" aria-label="send synthetic ${d} tone">${d}</button>`).join('')}
    </div>
    <div class="patch-bay" aria-label="operator cord plugs">
      ${state.routes.map(r => `<button class="cord-btn" data-cord="${r.id}" aria-label="rotate cord ${r.id}"><strong>${r.id}</strong><output id="cord${r.id}">${r.from}⇄${r.to}</output></button>`).join('')}
    </div>
    <label class="lever">line gain <input id="gain" type="range" min="0" max="1" step="0.01" value="${state.gain}"><output id="gainOut">0.74</output></label>
    <label class="lever">cloth bleed <input id="bleed" type="range" min="0" max="1" step="0.01" value="${state.bleed}"><output id="bleedVal">0.28</output></label>
    <label class="lever">operator bias <input id="bias" type="range" min="0" max="1" step="0.01" value="${state.operatorBias}"><output id="biasOut">0.45</output></label>
    <button id="burst" class="burst">send selected tone <output id="selected">5</output></button>
    <ol id="log" class="log" aria-label="synthetic routing log"></ol>
  </aside>
</main>`;

const svg = document.querySelector<SVGSVGElement>('#boardSvg')!;
const renderer = new SwitchboardRenderer(svg);
renderer.init(state);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function sync() {
  $('ringOut').textContent = state.ringing.toFixed(2);
  $('crossOut').textContent = state.crosstalk.toFixed(2);
  $('bleedOut').textContent = state.bleed.toFixed(2);
  $('gainOut').textContent = state.gain.toFixed(2);
  $('bleedVal').textContent = state.bleed.toFixed(2);
  $('biasOut').textContent = state.operatorBias.toFixed(2);
  $('selected').textContent = state.selectedDigit;
  for (const r of state.routes) $('cord' + r.id).textContent = `${r.from}⇄${r.to} ${r.mode}`;
  $('log').innerHTML = state.log.map(line => `<li>${line}</li>`).join('');
  document.documentElement.style.setProperty('--ring', state.ringing.toFixed(3));
  document.documentElement.style.setProperty('--cross', state.crosstalk.toFixed(3));
}

document.querySelectorAll<HTMLButtonElement>('.tone-key').forEach(btn => {
  btn.addEventListener('click', () => {
    const digit = btn.dataset.digit!;
    setDigit(state, digit);
    playDigit(digit, state.gain);
    sync();
  });
});

document.querySelectorAll<HTMLButtonElement>('.cord-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    rotateCord(state, btn.dataset.cord!);
    sync();
  });
});

$('burst').addEventListener('click', () => {
  injectTone(state);
  playDigit(state.selectedDigit, state.gain);
  sync();
});
$('gain').addEventListener('input', e => { state.gain = Number((e.target as HTMLInputElement).value); sync(); });
$('bleed').addEventListener('input', e => { state.bleed = Number((e.target as HTMLInputElement).value); sync(); });
$('bias').addEventListener('input', e => { state.operatorBias = Number((e.target as HTMLInputElement).value); sync(); });

window.addEventListener('keydown', e => {
  if (digits.includes(e.key)) {
    setDigit(state, e.key);
    playDigit(e.key, state.gain);
    sync();
  }
});

for (const d of ['5','8','2','9']) injectTone(state, d);

let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, .05);
  last = now;
  step(state, dt);
  renderer.draw(state);
  sync();
  requestAnimationFrame(frame);
}

sync();
requestAnimationFrame(frame);
