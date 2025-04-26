export abstract class BaseModule<T> {
  protected state: T;

  constructor(state: T) {
    this.state = state;
  }

  abstract initialize(): void;
}
