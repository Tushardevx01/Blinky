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

export const mock = {
  fn,
  module: (name: string, factory: () => any) => {
    moduleMocks.set(name, factory());
  },
};

export function getMockedModule(name: string): any {
  return moduleMocks.get(name);
}

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
    toContain(expected: any) {
      let pass = false;
      if (typeof actual === 'string' || Array.isArray(actual)) {
        pass = actual.includes(expected);
      } else if (actual instanceof Set || actual instanceof Map) {
        pass = actual.has(expected);
      }
      if (isNot ? pass : !pass) {
        assert.fail(`Expected ${JSON.stringify(actual)} ${isNot ? 'not to contain' : 'to contain'} ${expected}`);
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
    toBeGreaterThanOrEqual(expected: number) {
      const pass = actual >= expected;
      if (isNot ? pass : !pass) {
        assert.fail(`Expected ${actual} ${isNot ? 'not to be' : 'to be'} >= ${expected}`);
      }
    },
    toHaveLength(expected: number) {
      const pass = actual?.length === expected;
      if (isNot ? pass : !pass) {
        assert.fail(`Expected length ${actual?.length} ${isNot ? 'not to be' : 'to be'} ${expected}`);
      }
    },
    toMatchObject(expected: Record<string, any>) {
      for (const [k, v] of Object.entries(expected)) {
        assert.deepStrictEqual(actual[k], v);
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
    toHaveBeenLastCalledWith(...args: any[]) {
      const lastCall = actual && actual.mock && actual.mock.calls.at(-1);
      try {
        assert.deepStrictEqual(lastCall, args);
        if (isNot) assert.fail(`Expected mock not to have been last called with ${JSON.stringify(args)}`);
      } catch (e) {
        if (!isNot) throw e;
      }
    },
  });

  return {
    ...matchers(false),
    not: matchers(true),
    rejects: {
      toThrow(expected?: string | RegExp) {
        return (async () => {
          let threw = false;
          let thrownError: any;
          try {
            await actual;
          } catch (err) {
            threw = true;
            thrownError = err;
          }
          if (!threw) {
            assert.fail('Expected promise to reject, but it resolved.');
          }
          if (expected) {
            const msg = thrownError instanceof Error ? thrownError.message : String(thrownError);
            if (typeof expected === 'string') {
              assert.ok(msg.includes(expected), `Expected error message to include "${expected}", got "${msg}"`);
            } else {
              assert.ok(expected.test(msg), `Expected error message to match ${expected}, got "${msg}"`);
            }
          }
        })();
      },
    },
  };
}

export type TestFn = () => void | Promise<void>;

const suites: { name: string; tests: { name: string; fn: TestFn }[]; beforeEaches: TestFn[]; afterEaches: TestFn[] }[] = [
  { name: 'root', tests: [], beforeEaches: [], afterEaches: [] },
];

export function describe(name: string, fn: () => void) {
  suites.push({ name, tests: [], beforeEaches: [], afterEaches: [] });
  fn();
  const suite = suites.pop();
  if (suite && suites.length > 0) {
    const parent = suites[suites.length - 1];
    for (const t of suite.tests) {
      parent.tests.push({
        name: `${suite.name} > ${t.name}`,
        fn: async () => {
          for (const b of suite.beforeEaches) await b();
          try {
            await t.fn();
          } finally {
            for (const a of suite.afterEaches) await a();
          }
        },
      });
    }
  }
}

export function test(name: string, fn: TestFn) {
  const current = suites[suites.length - 1];
  current.tests.push({ name, fn });
}

export function beforeEach(fn: TestFn) {
  const current = suites[suites.length - 1];
  current.beforeEaches.push(fn);
}

export function afterEach(fn: TestFn) {
  const current = suites[suites.length - 1];
  current.afterEaches.push(fn);
}
