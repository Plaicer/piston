const BaseGenerator = require('./base');

/**
 * Python test runner generator
 */
class PythonGenerator extends BaseGenerator {
    constructor() {
        super('python');
        this.nestingLevel = 0;
    }

    boolLiteral(value) {
        return value ? 'True' : 'False';
    }

    nullLiteral() {
        return 'None';
    }

    undefinedLiteral() {
        return 'None';
    }

    numberLiteral(value) {
        if (Number.isNaN(value)) return 'float("nan")';
        if (!Number.isFinite(value)) return value > 0 ? 'float("inf")' : 'float("-inf")';
        return String(value);
    }

    objectLiteral(obj) {
        const pairs = Object.entries(obj)
            .map(([k, v]) => `${this.stringLiteral(k)}: ${this.valueToCode(v)}`);
        return '{' + pairs.join(', ') + '}';
    }

    // Override arrayLiteral to output tuples for nested arrays (common Python pattern)
    // e.g., [(1, "a"), (2, "b")] - outer is list, inner are tuples
    arrayLiteral(arr) {
        this.nestingLevel++;
        const elements = arr.map(v => this.valueToCode(v)).join(', ');
        this.nestingLevel--;

        // Top-level arrays stay as lists, nested arrays become tuples
        if (this.nestingLevel > 0) {
            // Nested array -> tuple
            // Handle single-element tuples: (x,) instead of (x)
            if (arr.length === 1) {
                return '(' + elements + ',)';
            }
            return '(' + elements + ')';
        }
        // Top-level -> list
        return '[' + elements + ']';
    }

    generateRunner(userFiles, testCases) {
        const mainFile = userFiles[0];
        const moduleName = mainFile.name.replace(/\.py$/, '');

        // Convert each test case call to Python syntax
        const nativeTestCases = testCases.map(tc => ({
            ...tc,
            call_native: this.callToNative(tc.parsed),
            // Remove parsed to avoid circular JSON
            parsed: undefined
        }));

        const runnerCode = `
import json
import sys
import math

sys.path.insert(0, '.')

from ${moduleName} import *

def deep_equals(a, b):
    """Deep equality comparison that handles various Python types"""
    # Handle None
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False

    # Handle NaN
    if isinstance(a, float) and isinstance(b, float):
        if math.isnan(a) and math.isnan(b):
            return True

    # Type check with numeric flexibility
    if type(a) != type(b):
        # Allow int/float comparison
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return a == b
        # Allow list/tuple comparison
        if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
            if len(a) != len(b):
                return False
            return all(deep_equals(x, y) for x, y in zip(a, b))
        return False

    # Lists and tuples
    if isinstance(a, (list, tuple)):
        if len(a) != len(b):
            return False
        return all(deep_equals(x, y) for x, y in zip(a, b))

    # Dictionaries
    if isinstance(a, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(deep_equals(a[k], b[k]) for k in a)

    # Sets
    if isinstance(a, set):
        return a == b

    # Default comparison
    return a == b

def serialize(value):
    """Serialize a Python value to JSON-compatible format"""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        if math.isnan(value):
            return "NaN"
        if math.isinf(value):
            return "Infinity" if value > 0 else "-Infinity"
        return value
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple)):
        return [serialize(v) for v in value]
    if isinstance(value, dict):
        return {str(k): serialize(v) for k, v in value.items()}
    if isinstance(value, set):
        return sorted([serialize(v) for v in value], key=lambda x: (type(x).__name__, str(x)))
    # For other types, try to convert to string
    return str(value)

# Read test cases from stdin
test_cases = json.loads(sys.stdin.read())
results = []

for i, tc in enumerate(test_cases):
    try:
        # Execute the function call
        actual = eval(tc['call_native'])

        # Compare with expected
        passed = deep_equals(actual, tc['expected'])

        results.append({
            'index': i,
            'actual': serialize(actual),
            'passed': passed,
            'error': None
        })
    except Exception as e:
        results.append({
            'index': i,
            'actual': None,
            'passed': False,
            'error': f"{type(e).__name__}: {str(e)}"
        })

print(json.dumps(results))
`;

        return {
            files: [
                ...userFiles,
                { name: '__test_runner__.py', content: runnerCode.trim() }
            ],
            entryPoint: '__test_runner__.py',
            stdin: JSON.stringify(nativeTestCases)
        };
    }
}

module.exports = PythonGenerator;
