import isObject from '../object-helpers';

export interface Trace {
  landscapeToken: string;
  traceId: string;
  startTime: {
    seconds: number,
    nanoAdjust: number,
  };
  endTime: {
    seconds: number,
    nanoAdjust: number,
  };
  duration: number;
  overallRequestCount: 1;
  traceCount: number;
  spanList: Span[];
}

export interface Span {
  landscapeToken: string;
  spanId: string;
  parentSpanId: string;
  traceId: string;
  startTime: {
    seconds: number,
    nanoAdjust: number,
  };
  endTime: {
    seconds: number,
    nanoAdjust: number,
  };
  hashCode: string;
}

export function isTrace(x: any): x is Trace {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'traceId');
}

export function isSpan(x: any): x is Span {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'spanId');
}

export type DynamicLandscapeData = Trace[];
