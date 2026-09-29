(() => {
  'use strict';

  const A4_REFERENCE = 440;
  const IN_TUNE_CENTS = 5;
  const MIN_FREQUENCY = 45;
  const MAX_FREQUENCY = 1800;
  const TRANSPOSE_SEMITONES = { concert: 0, bb: 2, eb: 9, f: 7 };

  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let stream = null;
  let animationFrame = 0;
  let floatBuffer = null;
  let frequencyHistory = [];
  let lastStableMidi = null;
  let running = false;
  let initialized = false;
  let lastAnalysisAt = 0;

  const $ = selector => document.querySelector(selector);

  function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function yinPitch(buffer, sampleRate) {
    const size = buffer.length;
    const half = Math.floor(size / 2);
    const threshold = 0.12;
    const minTau = Math.max(2, Math.floor(sampleRate / MAX_FREQUENCY));
    const maxTau = Math.min(half - 2, Math.ceil(sampleRate / MIN_FREQUENCY));
    const compareLength = Math.min(2048, size - maxTau - 1);
    const yin = new Float32Array(maxTau + 2);

    let rms = 0;
    for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / size);
    if (rms < 0.008) return null;

    yin[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= maxTau; tau++) {
      let diff = 0;
      for (let i = 0; i < compareLength; i++) {
        const delta = buffer[i] - buffer[i + tau];
        diff += delta * delta;
      }
      yin[tau] = diff;
      runningSum += diff;
      yin[tau] = runningSum ? (yin[tau] * tau) / runningSum : 1;
    }

    let tauEstimate = -1;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (yin[tau] < threshold) {
        while (tau + 1 <= maxTau && yin[tau + 1] < yin[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate < 0) {
      let best = minTau;
      for (let tau = minTau + 1; tau <= maxTau; tau++) if (yin[tau] < yin[best]) best = tau;
      if (yin[best] > 0.2) return null;
      tauEstimate = best;
    }

    const x0 = tauEstimate > 1 ? tauEstimate - 1 : tauEstimate;
    const x2 = tauEstimate + 1 <= maxTau ? tauEstimate + 1 : tauEstimate;
    let betterTau = tauEstimate;
    if (x0 !== tauEstimate && x2 !== tauEstimate) {
      const s0 = yin[x0], s1 = yin[tauEstimate], s2 = yin[x2];
      const denom = 2 * (2 * s1 - s2 - s0);
      if (Math.abs(denom) > 1e-9) betterTau += (s2 - s0) / denom;
    }

    const freq = sampleRate / betterTau;
    return freq >= MIN_FREQUENCY && freq <= MAX_FREQUENCY ? freq : null;
  }

  function frequencyToMidi(frequency) {
    return 69 + 12 * Math.log2(frequency / A4_REFERENCE);
  }

  function midiToFrequency(midi) {
    return A4_REFERENCE * Math.pow(2, (midi - 69) / 12);
  }

  function noteNameFromMidi(midi, transposeMode = 'concert') {
    const names = ['DO', 'DO♯', 'RE', 'RE♯', 'MI', 'FA', 'FA♯', 'SOL', 'SOL♯', 'LA', 'LA♯', 'SI'];
    const transposed = midi + (TRANSPOSE_SEMITONES[transposeMode] || 0);
    const rounded = Math.round(transposed);
    const name = names[((rounded % 12) + 12) % 12];
    const octave = Math.floor(rounded / 12) - 1;
    return { name, octave };
  }

  function setStatus(message, type = '') {
    const el = $('#tunerStatus');
    if (!el) return;
    el.textContent = message || '';
    el.dataset.type = type;
  }

  function resetDisplay() {
    const note = $('#tunerNote');
    const octave = $('#tunerOctave');
    const cents = $('#tunerCents');
    const hz = $('#tunerHz');
    const state = $('#tunerState');
    const needle = $('#tunerNeedle');
    const meter = $('#tunerMeter');
    if (note) note.textContent = '—';
    if (octave) octave.textContent = '';
    if (cents) cents.textContent = '0 cents';
    if (hz) hz.textContent = '— Hz';
    if (state) { state.textContent = 'ESPERANT SO'; state.dataset.tune = 'idle'; }
    if (needle) needle.style.setProperty('--needle-position', '50%');
    if (meter) meter.dataset.tune = 'idle';
    frequencyHistory = [];
    lastStableMidi = null;
  }

  function renderPitch(rawFrequency) {
    frequencyHistory.push(rawFrequency);
    if (frequencyHistory.length > 7) frequencyHistory.shift();
    let frequency = median(frequencyHistory);

    let midiFloat = frequencyToMidi(frequency);
    let nearestMidi = Math.round(midiFloat);

    if (lastStableMidi !== null && Math.abs(nearestMidi - lastStableMidi) === 12) {
      const currentTarget = midiToFrequency(lastStableMidi);
      const candidateTarget = midiToFrequency(nearestMidi);
      const currentDistance = Math.abs(1200 * Math.log2(frequency / currentTarget));
      const candidateDistance = Math.abs(1200 * Math.log2(frequency / candidateTarget));
      if (currentDistance < candidateDistance + 18) nearestMidi = lastStableMidi;
    }

    if (lastStableMidi === null || Math.abs(nearestMidi - lastStableMidi) <= 2 || Math.abs(nearestMidi - lastStableMidi) === 12) {
      lastStableMidi = nearestMidi;
    }

    const targetFrequency = midiToFrequency(nearestMidi);
    const cents = 1200 * Math.log2(frequency / targetFrequency);
    const noteInfo = noteNameFromMidi(nearestMidi, 'concert');
    const clamped = Math.max(-50, Math.min(50, cents));
    const position = 50 + clamped;
    const tune = Math.abs(cents) <= IN_TUNE_CENTS ? 'in' : cents < 0 ? 'low' : 'high';

    const note = $('#tunerNote');
    const octave = $('#tunerOctave');
    const centsEl = $('#tunerCents');
    const hz = $('#tunerHz');
    const state = $('#tunerState');
    const needle = $('#tunerNeedle');
    const meter = $('#tunerMeter');

    if (note) note.textContent = noteInfo.name;
    if (octave) octave.textContent = String(noteInfo.octave);
    if (centsEl) centsEl.textContent = `${cents >= 0 ? '+' : ''}${Math.round(cents)} cents`;
    if (hz) hz.textContent = `${frequency.toFixed(1)} Hz`;
    if (state) {
      state.textContent = tune === 'in' ? 'AFINAT' : tune === 'low' ? 'GREU' : 'AGUT';
      state.dataset.tune = tune;
    }
    if (needle) needle.style.setProperty('--needle-position', `${position}%`);
    if (meter) meter.dataset.tune = tune;
  }

  function analyse(timestamp = 0) {
    if (!running || !analyser || !audioContext) return;
    if (timestamp - lastAnalysisAt >= 50) {
      lastAnalysisAt = timestamp;
      analyser.getFloatTimeDomainData(floatBuffer);
      const detected = yinPitch(floatBuffer, audioContext.sampleRate);
      if (detected) {
        renderPitch(detected);
        setStatus('MICRÒFON ACTIU · anàlisi local', 'ok');
      } else {
        setStatus('MICRÒFON ACTIU · toca una nota sostinguda', 'ok');
      }
    }
    animationFrame = requestAnimationFrame(analyse);
  }

  async function start() {
    if (running) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Aquest dispositiu o navegador no permet accedir al micròfon.', 'error');
      return;
    }

    const btn = $('#tunerMicBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'ACTIVANT…'; }
    setStatus('Demanant accés al micròfon…');

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1
        },
        video: false
      });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx({ latencyHint: 'interactive' });
      await audioContext.resume();
      sourceNode = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      floatBuffer = new Float32Array(analyser.fftSize);
      sourceNode.connect(analyser);
      running = true;
      lastAnalysisAt = 0;
      if (btn) { btn.disabled = false; btn.textContent = 'DETENIR MICRO'; btn.classList.add('is-active'); }
      analyse();
    } catch (error) {
      console.warn('AFINADOR: no s’ha pogut activar el micròfon', error);
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
      setStatus(denied ? 'Permís de micròfon denegat. Activa’l als permisos del navegador per utilitzar l’afinador.' : 'No s’ha pogut activar el micròfon en aquest dispositiu.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'ACTIVAR MICRO'; btn.classList.remove('is-active'); }
      await stop({ keepMessage: true });
    }
  }

  async function stop(options = {}) {
    running = false;
    lastAnalysisAt = 0;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    try { sourceNode?.disconnect(); } catch (_error) {}
    try { analyser?.disconnect(); } catch (_error) {}
    if (stream) stream.getTracks().forEach(track => { try { track.stop(); } catch (_error) {} });
    if (audioContext) {
      try { await audioContext.close(); } catch (_error) {}
    }
    audioContext = null;
    analyser = null;
    sourceNode = null;
    stream = null;
    floatBuffer = null;
    const btn = $('#tunerMicBtn');
    if (btn) { btn.disabled = false; btn.textContent = 'ACTIVAR MICRO'; btn.classList.remove('is-active'); }
    resetDisplay();
    if (!options.keepMessage) setStatus('Micròfon aturat.');
  }

  function isAuthenticated() {
    return Boolean(window.BandaAppAuth?.isAuthenticated?.());
  }

  function open() {
    if (!isAuthenticated()) return false;
    const panel = $('#tunerOverlay');
    if (!panel) return false;
    panel.hidden = false;
    document.body.classList.add('tuner-open');
    resetDisplay();
    setStatus('Prem ACTIVAR MICRO per començar.');
    setTimeout(() => $('#tunerMicBtn')?.focus(), 0);
    return true;
  }

  async function close() {
    await stop({ keepMessage: true });
    const panel = $('#tunerOverlay');
    if (panel) panel.hidden = true;
    document.body.classList.remove('tuner-open');
  }

  function bind() {
    if (initialized) return;
    initialized = true;
    $('#openTunerBtn')?.addEventListener('click', open);
    $('#closeTunerBtn')?.addEventListener('click', close);
    $('#tunerMicBtn')?.addEventListener('click', () => running ? stop() : start());
    $('#tunerBackdrop')?.addEventListener('click', close);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !$('#tunerOverlay')?.hidden) close();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && running) stop({ keepMessage: true });
    });
  }

  window.BandaTuner = {
    init: bind,
    open,
    close,
    stop,
    isOpen: () => !$('#tunerOverlay')?.hidden,
    config: { A4_REFERENCE, IN_TUNE_CENTS, TRANSPOSE_SEMITONES }
  };
})();
