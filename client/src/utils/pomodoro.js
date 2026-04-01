class Pomodoro {
  static WORK_DURATION = 25 * 60; // 1500 seconds
  static BREAK_DURATION = 5 * 60; // 300 seconds

  constructor(onTick, onComplete) {
    this.onTick = onTick || (() => {});
    this.onComplete = onComplete || (() => {});
    this.timeRemaining = Pomodoro.WORK_DURATION;
    this.isBreak = false;
    this.completedCount = 0;
    this._interval = null;
  }

  start() {
    if (this._interval !== null) return; // already running
    this._interval = setInterval(() => {
      this.timeRemaining -= 1;
      this.onTick(this.getRemaining());
      if (this.timeRemaining <= 0) {
        this.completedCount += 1;
        this.onComplete({ isBreak: this.isBreak, completedCount: this.completedCount });
        this.isBreak = !this.isBreak;
        this.timeRemaining = this.isBreak
          ? Pomodoro.BREAK_DURATION
          : Pomodoro.WORK_DURATION;
      }
    }, 1000);
  }

  pause() {
    if (this._interval !== null) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  reset() {
    this.pause();
    this.timeRemaining = Pomodoro.WORK_DURATION;
    this.isBreak = false;
  }

  getRemaining() {
    const total = this.timeRemaining;
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return { minutes, seconds, total, isBreak: this.isBreak };
  }
}

export default Pomodoro;
