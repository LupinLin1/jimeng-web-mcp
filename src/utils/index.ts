
import { v4 as uuidv4 } from 'uuid';

export function toUrlParams(obj: Record<string, any>): string {
  const params = new URLSearchParams()

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, String(v)))
      } else {
        params.append(key, String(value))
      }
    }
  })

  return params.toString()
}


export const generateMsToken = (randomlength = 128) => {
  const baseStr = 'ABCDEFGHIGKLMNOPQRSTUVWXYZabcdefghigklmnopqrstuvwxyz0123456789='
  let random_str = ''
  const length = baseStr.length - 1
  for (let i = 0; i < randomlength; i++) {
    random_str += baseStr[Math.floor(Math.random() * length)]
  }
  return random_str
}


export const generateUuid = (): string => {
  return uuidv4();
};

export const jsonEncode = (obj: any): string => {
  return JSON.stringify(obj);
};

export const urlEncode = (str: string): string => {
  return encodeURI(str);
};

export const unixTimestamp = () => {
  return parseInt(`${Date.now() / 1000}`);
}

// Export new utilities for code quality optimization
export * from './cache-manager.js';
export { logger } from './logger.js';
export * from './prompt-validator.js';