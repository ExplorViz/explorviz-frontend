import Service from '@ember/service';

export default class DeltaTime extends Service {
  private deltaTime: number = 0; // Time between last two frames in seconds

  private lastFrameTime: number = 0; // Time in seconds of last frame

  init() {
    super.init();

    this.deltaTime = 0;
    this.lastFrameTime = Date.now() / 1000.0;
  }

  /**
   * Updates the time of the last frame and recomputes delta time
   */
  update() {
    const currentTime = Date.now() / 1000.0;
    this.deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
  }

  /**
   * Returns time in seconds between the last two frames
   */
  getDeltaTime() {
    return this.deltaTime;
  }
}

declare module '@ember/service' {
  interface Registry {
    'delta-time': DeltaTime;
  }
}
