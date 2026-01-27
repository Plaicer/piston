const BaseGenerator = require('./base');

/**
 * JavaScript/Node.js test runner generator
 */
class JavaScriptGenerator extends BaseGenerator {
    constructor() {
        super('javascript');
    }

    objectLiteral(obj) {
        // JavaScript allows unquoted keys (identifiers)
        const pairs = Object.entries(obj)
            .map(([k, v]) => {
                // Use unquoted key if it's a valid identifier
                const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : this.stringLiteral(k);
                return `${key}: ${this.valueToCode(v)}`;
            });
        return '{' + pairs.join(', ') + '}';
    }

    generateRunner(userFiles, testCases) {
        const mainFile = userFiles[0];

        // Convert each test case call to JavaScript syntax
        const nativeTestCases = testCases.map(tc => ({
            ...tc,
            call_native: this.callToNative(tc.parsed),
            parsed: undefined
        }));

        const runnerCode = `
const fs = require('fs');

// Load user code
${mainFile.content}

function deepEquals(a, b) {
    // Handle identical values
    if (a === b) return true;

    // Handle null/undefined
    if (a === null || b === null) return a === b;
    if (a === undefined || b === undefined) return a === b;

    // Handle NaN
    if (typeof a === 'number' && typeof b === 'number') {
        if (Number.isNaN(a) && Number.isNaN(b)) return true;
    }

    // Type check
    if (typeof a !== typeof b) return false;

    // Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((v, i) => deepEquals(v, b[i]));
    }

    // Objects
    if (typeof a === 'object') {
        const keysA = Object.keys(a).sort();
        const keysB = Object.keys(b).sort();
        if (keysA.length !== keysB.length) return false;
        if (!keysA.every((k, i) => k === keysB[i])) return false;
        return keysA.every(k => deepEquals(a[k], b[k]));
    }

    return false;
}

function serialize(value) {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value === 'number') {
        if (Number.isNaN(value)) return 'NaN';
        if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    }
    if (Array.isArray(value)) {
        return value.map(serialize);
    }
    if (typeof value === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(value)) {
            result[k] = serialize(v);
        }
        return result;
    }
    return value;
}

// Read test cases from stdin
const input = fs.readFileSync(0, 'utf-8');
const testCases = JSON.parse(input);
const results = [];

for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
        // Execute the function call
        const actual = eval(tc.call_native);

        // Compare with expected
        const passed = deepEquals(actual, tc.expected);

        results.push({
            index: i,
            actual: serialize(actual),
            passed,
            error: null
        });
    } catch (e) {
        results.push({
            index: i,
            actual: null,
            passed: false,
            error: e.name + ': ' + e.message
        });
    }
}

console.log(JSON.stringify(results));
`;

        return {
            files: [
                { name: '__test_runner__.js', content: runnerCode.trim() }
            ],
            entryPoint: '__test_runner__.js',
            stdin: JSON.stringify(nativeTestCases)
        };
    }
}

module.exports = JavaScriptGenerator;
