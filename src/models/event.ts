export enum EventType {
  EVENT = 0,
  COMMAND = 1,
}

export interface Event<T> {
  _v: number;
  id: string;
  createdAt: number;
  origin: string;
  name: string;
  type?: EventType;
  entity?: string;
  args?: object;
  payload: T;
}
