const state: Record<string, any> = {};

export const addItem = (key: string, value: any) => (state[key] = value);
export const getItem = (key: string): any => state[key];
export const deleteItem = (key: string): any => delete state[key];
export const all = () => state;
