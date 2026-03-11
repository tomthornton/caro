// Procedural ambient audio engine — no files, pure Web Audio API

export type Environment = 'day' | 'dusk' | 'night' | 'indoor' | 'silent'

export class AmbientAudio {
  private ctx:    AudioContext | null = null
  private master: GainNode    | null = null
  private nodes:  AudioNode[] = []
  private timers: ReturnType<typeof setTimeout>[] = []
  private currentEnv: Environment = 'silent'
  private stepping = false
  private stepInterval: ReturnType<typeof setInterval> | null = null

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.4
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  // ── Wind layer (filtered white noise) ───────────────────────────────────────
  private startWind(vol = 0.12): void {
    const ctx = this.getCtx()
    const bufLen = ctx.sampleRate * 3
    const buf  = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1)

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true

    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 400

    // Slow LFO on wind volume (gusting)
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.08
    lfoGain.gain.value = 0.04
    lfo.connect(lfoGain)

    const windGain = ctx.createGain()
    windGain.gain.value = vol
    lfoGain.connect(windGain.gain)

    src.connect(lpf)
    lpf.connect(windGain)
    windGain.connect(this.master!)
    src.start()
    lfo.start()

    this.nodes.push(src, lpf, lfoGain, windGain, lfo)
  }

  // ── Bird chirp ───────────────────────────────────────────────────────────────
  private chirp(): void {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const now = ctx.currentTime

    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'

    const baseFreq = 2200 + Math.random() * 1400
    const duration = 0.04 + Math.random() * 0.06
    const repeats  = Math.floor(1 + Math.random() * 3)

    for (let r = 0; r < repeats; r++) {
      const t = now + r * (duration + 0.02)
      osc.frequency.setValueAtTime(baseFreq, t)
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, t + duration * 0.4)
      osc.frequency.linearRampToValueAtTime(baseFreq, t + duration)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.05, t + 0.01)
      gain.gain.linearRampToValueAtTime(0, t + duration)
    }

    osc.connect(gain)
    gain.connect(this.master)
    osc.start(now)
    osc.stop(now + repeats * (duration + 0.02) + 0.1)
  }

  private scheduleBirds(interval = 2500): void {
    const jitter = interval * 0.6
    const next = interval + (Math.random() * jitter - jitter / 2)
    const t = setTimeout(() => {
      this.chirp()
      if (Math.random() < 0.4) {
        setTimeout(() => this.chirp(), 180 + Math.random() * 200)
      }
      this.scheduleBirds(interval)
    }, next)
    this.timers.push(t)
  }

  // ── Cricket layer ────────────────────────────────────────────────────────────
  private startCrickets(vol = 0.07): void {
    const ctx = this.getCtx()
    // Multiple cricket oscillators with slight frequency offsets
    const freqs = [4200, 4350, 4480, 4600]
    freqs.forEach(freq => {
      const osc = ctx.createOscillator()
      osc.frequency.value = freq + (Math.random() * 60 - 30)

      // AM modulation at cricket chirp rate ~16hz
      const amOsc  = ctx.createOscillator()
      const amGain = ctx.createGain()
      amOsc.frequency.value = 14 + Math.random() * 4
      amGain.gain.value = 0.5
      amOsc.connect(amGain)

      const gain = ctx.createGain()
      gain.gain.value = vol / freqs.length
      amGain.connect(gain.gain)

      osc.connect(gain)
      gain.connect(this.master!)
      osc.start()
      amOsc.start()
      this.nodes.push(osc, amOsc, amGain, gain)
    })
  }

  // ── Fireplace crackle (indoor) ───────────────────────────────────────────────
  private startFireplace(): void {
    const ctx = this.getCtx()
    const bufLen = ctx.sampleRate * 2
    const buf  = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    // Crackle: mostly silence with occasional pops
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() < 0.003 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.02
    }

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true

    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 2000

    const gain = ctx.createGain()
    gain.gain.value = 0.15

    src.connect(lpf)
    lpf.connect(gain)
    gain.connect(this.master!)
    src.start()
    this.nodes.push(src, lpf, gain)

    // Deep rumble
    const rumble = ctx.createOscillator()
    rumble.frequency.value = 55
    const rGain = ctx.createGain()
    rGain.gain.value = 0.04
    rumble.connect(rGain)
    rGain.connect(this.master!)
    rumble.start()
    this.nodes.push(rumble, rGain)
  }

  // ── Footstep ─────────────────────────────────────────────────────────────────
  playFootstep(): void {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const now = ctx.currentTime

    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3))
    }

    const src = ctx.createBufferSource()
    src.buffer = buf

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 300 + Math.random() * 200

    const gain = ctx.createGain()
    gain.gain.value = 0.12
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    src.start(now)
  }

  setWalking(isWalking: boolean): void {
    if (isWalking === this.stepping) return
    this.stepping = isWalking
    if (isWalking) {
      this.stepInterval = setInterval(() => this.playFootstep(), 380)
    } else {
      if (this.stepInterval) { clearInterval(this.stepInterval); this.stepInterval = null }
    }
  }

  // ── Environment switcher ─────────────────────────────────────────────────────
  setEnvironment(env: Environment): void {
    if (env === this.currentEnv) return
    this.currentEnv = env
    this.stop(false)  // clear nodes but keep ctx

    if (env === 'silent') return

    // Resume AudioContext if suspended (autoplay policy)
    if (this.ctx?.state === 'suspended') this.ctx.resume()

    switch (env) {
      case 'day':
        this.startWind(0.08)
        this.scheduleBirds(2800)
        break
      case 'dusk':
        this.startWind(0.1)
        this.scheduleBirds(5000)
        this.startCrickets(0.03)
        break
      case 'night':
        this.startWind(0.06)
        this.startCrickets(0.1)
        break
      case 'indoor':
        this.startFireplace()
        this.startWind(0.03)
        break
    }
  }

  resume(): void {
    this.ctx?.resume()
  }

  // stop(full=true) destroys context; stop(false) only clears running nodes
  stop(full = true): void {
    this.timers.forEach(t => clearTimeout(t))
    this.timers = []
    if (this.stepInterval) { clearInterval(this.stepInterval); this.stepInterval = null }
    this.nodes.forEach(n => {
      try { (n as any).stop?.(); n.disconnect() } catch { /* already stopped */ }
    })
    this.nodes = []
    if (full) { this.ctx?.close(); this.ctx = null; this.master = null }
  }

  // Call once on first user interaction to unblock autoplay
  unlock(): void { this.getCtx().resume() }
}

export function getTimeEnvironment(hour: number): Environment {
  if (hour >= 7 && hour < 18) return 'day'
  if (hour >= 18 && hour < 20) return 'dusk'
  return 'night'
}
