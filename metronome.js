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
  let tapTimes = [];
  let initialized = false;

  const $ = selector => document.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function isAuthenticated() {
    return Boolean(window.BandaAppAuth?.isAuthenticated?.());
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
    while (nextNoteTime < audioContext.currentTime + SCHEDULE_AHEAD_SEC) {
      scheduleBeat(currentBeat, nextNoteTime);
      nextNoteTime += 60 / bpm;
      currentBeat = (currentBeat + 1) % beatsPerBar;
    }
  }

  async function start() {
    if (running) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      setStatus('Aquest navegador no permet utilitzar el metrònom d’àudio.');
      return;
    }
    try {
      audioContext = audioContext || new AudioCtx({ latencyHint: 'interactive' });
      await audioContext.resume();
      running = true;
      currentBeat = 0;
      nextNoteTime = audioContext.currentTime + 0.05;
      timerId = window.setInterval(scheduler, LOOKAHEAD_MS);
      scheduler();
      const btn = $('#metronomeStartBtn');
      if (btn) { btn.textContent = 'DETENIR'; btn.classList.add('is-active'); }
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

  function tapTempo() {
    const now = performance.now();
    tapTimes = tapTimes.filter(t => now - t < 2400);
    tapTimes.push(now);
    if (tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(60000 / avg);
      setStatus(`TAP TEMPO · ${bpm} BPM`);
      if (running && audioContext) {
        currentBeat = 0;
        nextNoteTime = audioContext.currentTime + 0.05;
      }
    } else {
      setStatus('Torna a tocar TAP seguint el pols.');
    }
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
    $('#metronomeTapBtn')?.addEventListener('click', tapTempo);
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
