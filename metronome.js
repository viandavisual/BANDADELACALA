(() => {
  'use strict';

  const MIN_BPM = 40;
  const MAX_BPM = 220;
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD_SEC = 0.12;

  let audioContext = null;
  let timerId = 0;
  let running = false;
  let bpm = 120;
  let beatsPerBar = 4;
  let currentBeat = 0;
  let nextNoteTime = 0;
  let initialized = false;
  let mobileAudioPrimer = null;

  const $ = selector => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function isAuthenticated() {
    return Boolean(window.BandaAppAuth?.isAuthenticated?.());
  }


  // iOS/PWA: activa explícitament la sessió d'àudio des del gest de l'usuari.
  // Alguns dispositius mantenen Web Audio en silenci fins que un HTMLMediaElement
  // ha iniciat reproducció. El primer és pràcticament inaudible i només desbloqueja la sortida.
  function primeMobileAudio() {
    try {
      if (!mobileAudioPrimer) {
        mobileAudioPrimer = new Audio('data:audio/wav;base64,UklGRiQFAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAFAAAAAFQAdwBUAAAArP+K/63/AABTAHYAUwAAAK3/i/+u/wAAUgB0AFIAAACu/43/r/8AAFEAcwBRAAAAr/+O/7D/AABQAHEAUAAAALH/kP+x/wAATwBwAE8AAACy/5H/sv8AAE4AbgBOAAAAs/+T/7P/AABNAG0ATQAAALT/lP+0/wAATABrAEsAAAC1/5b/tf8AAEsAagBKAAAAtv+X/7b/AABKAGgASQAAALf/mf+3/wAASQBnAEgAAAC4/5r/uP8AAEcAZQBHAAAAuf+c/7n/AABGAGQARgAAALr/nf+6/wAARQBiAEUAAAC7/5//u/8AAEQAYQBEAAAAvP+g/7z/AABDAF8AQwAAAL3/ov++/wAAQgBeAEIAAAC+/6P/v/8AAEEAXABBAAAAv/+l/8D/AABAAFsAQAAAAMD/pv/B/wAAPwBZAD8AAADC/6j/wv8AAD4AWAA+AAAAw/+p/8P/AAA9AFYAPQAAAMT/q//E/wAAPABVADwAAADF/6z/xf8AADsAUwA6AAAAxv+u/8b/AAA6AFIAOQAAAMf/r//H/wAAOQBQADgAAADI/7H/yP8AADgATwA3AAAAyf+y/8n/AAA3AE0ANgAAAMr/tP/K/wAANQBMADUAAADL/7X/y/8AADQASgA0AAAAzP+3/8z/AAAzAEkAMwAAAM3/uP/N/wAAMgBHADIAAADO/7r/z/8AADEARgAxAAAAz/+7/9D/AAAwAEQAMAAAAND/vf/R/wAALwBDAC8AAADR/77/0v8AAC4AQQAuAAAA0v/A/9P/AAAtAEAALQAAANT/wf/U/wAALAA+ACwAAADV/8P/1f8AACsAPQArAAAA1v/E/9b/AAAqADsAKgAAANf/xv/X/wAAKQA6ACgAAADY/8f/2P8AACgAOAAnAAAA2f/J/9n/AAAnADcAJgAAANr/yv/a/wAAJgA1ACUAAADb/8z/2/8AACQANAAkAAAA3P/N/9z/AAAjADIAIwAAAN3/z//d/wAAIgAxACIAAADe/9D/3v8AACEALwAhAAAA3//S/9//AAAgAC4AIAAAAOD/0//h/wAAHwAsAB8AAADh/9X/4v8AAB4AKwAeAAAA4v/W/+P/AAAdACkAHQAAAOP/2P/k/wAAHAAoABwAAADl/9n/5f8AABsAJgAbAAAA5v/b/+b/AAAaACUAGgAAAOf/3P/n/wAAGQAjABkAAADo/97/6P8AABgAIgAXAAAA6f/f/+n/AAAXACAAFgAAAOr/4f/q/wAAFgAfABUAAADr/+L/6/8AABUAHQAUAAAA7P/k/+z/AAAUABwAEwAAAO3/5f/t/wAAEgAaABIAAADu/+f/7v8AABEAGQARAAAA7//o/+//AAAQABcAEAAAAPD/6v/w/wAADwAWAA8AAADx/+v/8v8AAA4AFAAOAAAA8v/t//P/AAANABMADQAAAPP/7v/0/wAADAARAAwAAAD0//D/9f8AAAsAEAALAAAA9f/x//b/AAAKAA4ACgAAAPf/8//3/wAACQANAAkAAAD4//T/+P8AAAgACwAIAAAA+f/2//n/AAAHAAoABwAAAPr/9//6/wAABgAIAAUAAAD7//n/+/8AAAUABwAEAAAA/P/6//z/AAAEAAUAAwAAAP3//P/9/wAAAwAEAAIAAAD+//3//v8AAAEAAgABAAAA////////AAAAAAEAAAAAAAAAAAAAAA==');
        mobileAudioPrimer.preload = 'auto';
        mobileAudioPrimer.volume = 0.02;
        mobileAudioPrimer.setAttribute('playsinline', '');
      }
      mobileAudioPrimer.currentTime = 0;
      const playPromise = mobileAudioPrimer.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    } catch (_error) {}
  }

  function primeWebAudio(ctx) {
    try {
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    } catch (_error) {}
  }

  function renderDots() {
    const wrap = $('#metronomeBeatDots');
    if (!wrap) return;
    wrap.innerHTML = Array.from({ length: beatsPerBar }, (_, i) => `<span data-beat="${i}" aria-hidden="true"></span>`).join('');
  }

  function setActiveBeat(index = -1) {
    document.querySelectorAll('#metronomeBeatDots span').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      dot.classList.toggle('is-accent', i === 0);
    });
  }

  function syncUI() {
    const value = $('#metronomeBpmValue');
    const range = $('#metronomeBpmRange');
    if (value) value.textContent = String(Math.round(bpm));
    if (range) range.value = String(Math.round(bpm));
  }

  function setStatus(message) {
    const status = $('#metronomeStatus');
    if (status) status.textContent = message || '';
  }

  function setBpm(next) {
    bpm = clamp(Math.round(Number(next) || 120), MIN_BPM, MAX_BPM);
    syncUI();
  }

  function createClick(time, accent) {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1450 : 1000, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.42 : 0.28, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(time);
    osc.stop(time + 0.065);
  }

  function scheduleBeat(beatIndex, time) {
    createClick(time, beatIndex === 0);
    const delay = Math.max(0, (time - audioContext.currentTime) * 1000);
    window.setTimeout(() => {
      if (running) setActiveBeat(beatIndex);
    }, delay);
  }

  function scheduler() {
    if (!running || !audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    while (nextNoteTime < audioContext.currentTime + SCHEDULE_AHEAD_SEC) {
      scheduleBeat(currentBeat, nextNoteTime);
      nextNoteTime += 60 / bpm;
      currentBeat = (currentBeat + 1) % beatsPerBar;
    }
  }

  async function start() {
    if (running) return;
    // Ha d'executar-se abans del primer await perquè segueixi dins del gest tàctil.
    primeMobileAudio();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      setStatus('Aquest navegador no permet utilitzar el metrònom d’àudio.');
      return;
    }
    try {
      audioContext = audioContext || new AudioCtx({ latencyHint: 'interactive' });
      primeWebAudio(audioContext);
      await audioContext.resume();
      // En iOS standalone pot quedar temporalment 'interrupted'/'suspended'.
      if (audioContext.state !== 'running') {
        await new Promise(resolve => setTimeout(resolve, 40));
        await audioContext.resume();
      }
      running = true;
      currentBeat = 0;
      nextNoteTime = audioContext.currentTime + 0.05;
      timerId = window.setInterval(scheduler, LOOKAHEAD_MS);
      scheduler();
      const btn = $('#metronomeStartBtn');
      if (btn) { btn.textContent = 'ATURAR'; btn.classList.add('is-active'); }
      setStatus(`${bpm} BPM · ${beatsPerBar === 6 ? '6/8' : beatsPerBar + '/4'}`);
    } catch (error) {
      console.warn('METRÒNOM', error);
      setStatus('No s’ha pogut iniciar el metrònom.');
    }
  }

  async function stop(options = {}) {
    running = false;
    if (timerId) clearInterval(timerId);
    timerId = 0;
    setActiveBeat(-1);
    const btn = $('#metronomeStartBtn');
    if (btn) { btn.textContent = 'INICIAR'; btn.classList.remove('is-active'); }
    if (audioContext) {
      try { await audioContext.close(); } catch (_error) {}
    }
    audioContext = null;
    if (!options.keepMessage) setStatus('Metrònom aturat.');
  }


  function open() {
    if (!isAuthenticated()) return false;
    const panel = $('#metronomeOverlay');
    if (!panel) return false;
    panel.hidden = false;
    document.body.classList.add('metronome-open');
    renderDots();
    syncUI();
    setStatus('Tria el tempo i prem INICIAR.');
    setTimeout(() => $('#metronomeStartBtn')?.focus(), 0);
    return true;
  }

  async function close() {
    await stop({ keepMessage: true });
    const panel = $('#metronomeOverlay');
    if (panel) panel.hidden = true;
    document.body.classList.remove('metronome-open');
  }

  function bind() {
    if (initialized) return;
    initialized = true;
    renderDots();
    syncUI();
    $('#openMetronomeBtn')?.addEventListener('click', open);
    $('#closeMetronomeBtn')?.addEventListener('click', close);
    $('#metronomeBackdrop')?.addEventListener('click', close);
    $('#metronomeStartBtn')?.addEventListener('click', () => running ? stop() : start());
    $('#metronomeMinusBtn')?.addEventListener('click', () => setBpm(bpm - 1));
    $('#metronomePlusBtn')?.addEventListener('click', () => setBpm(bpm + 1));
    $('#metronomeBpmRange')?.addEventListener('input', event => setBpm(event.target.value));
    $('#metronomeMeter')?.addEventListener('change', event => {
      beatsPerBar = Number(event.target.value) || 4;
      currentBeat = 0;
      renderDots();
      if (running && audioContext) nextNoteTime = audioContext.currentTime + 0.05;
      setStatus(`${bpm} BPM · ${beatsPerBar === 6 ? '6/8' : beatsPerBar + '/4'}`);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !$('#metronomeOverlay')?.hidden) close();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && running) stop({ keepMessage: true });
    });
  }

  window.BandaMetronome = {
    init: bind,
    open,
    close,
    stop,
    isOpen: () => !$('#metronomeOverlay')?.hidden,
    config: { MIN_BPM, MAX_BPM }
  };
})();
