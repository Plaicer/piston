const BaseGenerator = require('./base');

/**
 * TypeScript test runner generator
 *
 * PASS-THROUGH MODE: Call expressions are passed directly to eval()
 * Uses TypeScript-compatible syntax without Node.js type dependencies
 */
class TypeScriptGenerator extends BaseGenerator {
    constructor() {
        super('typescript');
    }

    generateRunner(userFiles, testCases) {
        const mainFile = userFiles[0];

        // Embed test data directly to avoid fs.readFileSync type issues
        const testDataJson = JSON.stringify(testCases.map(tc => ({
            call: tc.call,
            expected: tc.expected
        })));

        const runnerCode = `// TypeScript declarations for Node.js globals
declare const process: { stdout: { write: (s: string) => void } };
declare function require(name: string): any;

// Capture console output from user code
const __capturedLogs__: any[] = [];
const __origLog__ = console.log;
const __origWarn__ = console.warn;
const __origError__ = console.error;
console.log = (...args: any[]) => __capturedLogs__.push({ type: 'log', args });
console.warn = (...args: any[]) => __capturedLogs__.push({ type: 'warn', args });
console.error = (...args: any[]) => __capturedLogs__.push({ type: 'error', args });

// User code
${mainFile.content}

function __deepEquals__(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (a === undefined || b === undefined) return a === b;

    // Handle NaN - use global isNaN for TS compatibility
    if (typeof a === 'number' && typeof b === 'number') {
        if (isNaN(a) && isNaN(b)) return true;
    }

    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((v: any, i: number) => __deepEquals__(v, b[i]));
    }

    if (typeof a === 'object') {
        const keysA = Object.keys(a).sort();
        const keysB = Object.keys(b).sort();
        if (keysA.length !== keysB.length) return false;
        if (!keysA.every((k: string, i: number) => k === keysB[i])) return false;
        return keysA.every((k: string) => __deepEquals__(a[k], b[k]));
    }

    return false;
}

function __serialize__(value: any): any {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value === 'number') {
        if (isNaN(value)) return 'NaN';
        if (!isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    }
    if (Array.isArray(value)) {
        return value.map(__serialize__);
    }
    if (typeof value === 'object') {
        const result: any = {};
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            result[k] = __serialize__(value[k]);
        }
        return result;
    }
    return value;
}

// Test cases embedded directly
const __testCases__: any[] = ${testDataJson};
const __results__: any[] = [];

for (let i = 0; i < __testCases__.length; i++) {
    const tc = __testCases__[i];
    try {
        const actual = eval(tc.call);
        const passed = __deepEquals__(actual, tc.expected);
        __results__.push({
            index: i,
            actual: __serialize__(actual),
            passed,
            error: null
        });
    } catch (e: any) {
        __results__.push({
            index: i,
            actual: null,
            passed: false,
            error: (e.name || 'Error') + ': ' + (e.message || String(e))
        });
    }
}

// Output results - try process.stdout.write first, fall back to console
try {
    process.stdout.write(JSON.stringify(__results__));
} catch {
    __origLog__(JSON.stringify(__results__));
}
`;

        return {
            files: [
                { name: '__test_runner__.ts', content: runnerCode.trim() }
            ],
            entryPoint: '__test_runner__.ts',
            stdin: ''
        };
    }
}

module.exports = TypeScriptGenerator;
