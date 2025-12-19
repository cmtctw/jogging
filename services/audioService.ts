
class MetronomeService {
  private audioContext: AudioContext | null = null;
  private nextNoteTime: number = 0;
  private timerID: number | null = null;
  private bpm: number = 180;
  private readonly lookahead = 25.0; // How frequently to call scheduling function (ms)
  private readonly scheduleAheadTime = 0.1; // How far ahead to schedule audio (s)

  constructor() {
    this.audioContext = null;
  }

  public setBPM(bpm: number) {
    this.bpm = bpm;
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
  }

  private scheduleNote(time: number) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();

    osc.frequency.value = 880; // High pitch for better clarity over music
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(envelope);
    envelope.connect(this.audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private scheduler() {
    while (this.audioContext && this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  public start() {
    if (this.timerID) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.nextNoteTime = this.audioContext.currentTime + 0.05;
    this.scheduler();
  }

  public stop() {
    if (this.timerID) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
  }
}

export const metronome = new MetronomeService();
