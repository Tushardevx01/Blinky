import assert from 'node:assert/strict';

export interface MockFn {
  (...args: any[]): any;
  mock: {
    calls: any[][];
    results: { type: 'return' | 'throw'; value: any }[];
  };
}

export function fn(impl?: (...args: any[]) => any): MockFn {
  const calls: any[][] = [];
  const results: { type: 'return' | 'throw'; value: any }[] = [];
  const mocked = function (...args: any[]) {
    calls.push(args);
    if (impl) {
      try {
        const ret = impl(...args);
        results.push({ type: 'return', value: ret });
        return ret;
      } catch (err) {
        results.push({ type: 'throw', value: err });
        throw err;
      }
    }
    results.push({ type: 'return', value: undefined });
    return undefined;
  };
  mocked.mock = { calls, results };
  return mocked as MockFn;
}

const moduleMocks = new Map<string, any>();

export const mock = Object.assign(fn, {
  fn,
  module: (name: string, factory: () => any) => {
    moduleMocks.set(name, factory());
  },
});

export function expect(actual: any) {
  const matchers = (isNot = false) => ({
    toBe(expected: any) {
      const pass = Object.is(actual, expected);
      if (isNot ? pass : !pass) {
        assert.fail(`Expected ${actual} ${isNot ? 'not to be' : 'to be'} ${expected}`);
      }
    },
    toEqual(expected: any) {
      try {
        assert.deepStrictEqual(actual, expected);
        if (isNot) assert.fail(`Expected deep not equal`);
      } catch (e) {
        if (!isNot) throw e;
      }
    },
    toBeNull() {
      const pass = actual === null;
      if (isNot ? pass : !pass) {
        assert.fail(`Expected ${actual} ${isNot ? 'not to be' : 'to be'} null`);
      }
    },
    toBeUndefined() {
      const pass = actual === undefined;
      if (isNot ? pass : !pass) {
        assert.fail(`Expected ${actual} ${isNot ? 'not to be' : 'to be'} undefined`);
      }
    },
    toHaveBeenCalled() {
      const pass = actual && actual.mock && actual.mock.calls.length > 0;
      if (isNot ? pass : !pass) {
        assert.fail(`Expected mock ${isNot ? 'not to have been called' : 'to have been called'}`);
      }
    },
    toHaveBeenCalledWith(...args: any[]) {
      const pass = actual && actual.mock && actual.mock.calls.some((c: any[]) => {
        try {
          assert.deepStrictEqual(c, args);
          return true;
        } catch {
          return false;
        }
      });
      if (isNot ? pass : !pass) {
        assert.fail(`Expected mock ${isNot ? 'not to have been called with' : 'to have been called with'} ${JSON.stringify(args)}`);
      }
    },
  });

  return {
    ...matchers(false),
    not: matchers(true),
  };
}

export type TestFn = () => void | Promise<void>;

export function describe(_name: string, fn: () => void) {
  fn();
}

export function test(_name: string, fn: TestFn) {
  fn();
}

export function beforeEach(_fn: TestFn) {}
export function afterEach(_fn: TestFn) {}
