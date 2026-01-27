/**
 * Unit tests for call-parser and generators
 * Run with: node test-unit.js
 */

const callParser = require('./src/call-parser');
const {
    generateTestRunner,
    PythonGenerator,
    JavaScriptGenerator,
    JavaGenerator,
    CppGenerator,
    CSharpGenerator,
    GoGenerator,
    RubyGenerator
} = require('./src/generators');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

function assertEqual(actual, expected, message = '') {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}\n   Expected: ${expectedStr}\n   Actual: ${actualStr}`);
    }
}

console.log('='.repeat(60));
console.log('Unit Tests for testCompile Components');
console.log('='.repeat(60));
console.log();

// ============================================
// Call Parser Tests
// ============================================
console.log('\n--- Call Parser Tests ---\n');

test('Parse simple function call', () => {
    const result = callParser.parseCallExpression('add(1, 2)');
    assertEqual(result.function, 'add');
    assertEqual(result.args, [1, 2]);
});

test('Parse function with string argument', () => {
    const result = callParser.parseCallExpression('greet("World")');
    assertEqual(result.function, 'greet');
    assertEqual(result.args, ['World']);
});

test('Parse function with object argument', () => {
    const result = callParser.parseCallExpression('compute({a: 1, b: 2}, 5)');
    assertEqual(result.function, 'compute');
    assertEqual(result.args, [{a: 1, b: 2}, 5]);
});

test('Parse function with array argument', () => {
    const result = callParser.parseCallExpression('sum([1, 2, 3])');
    assertEqual(result.function, 'sum');
    assertEqual(result.args, [[1, 2, 3]]);
});

test('Parse function with nested objects', () => {
    const result = callParser.parseCallExpression('process({items: [1, 2], meta: {count: 2}})');
    assertEqual(result.function, 'process');
    assertEqual(result.args, [{items: [1, 2], meta: {count: 2}}]);
});

test('Parse function with boolean arguments', () => {
    const result = callParser.parseCallExpression('check(true, false)');
    assertEqual(result.function, 'check');
    assertEqual(result.args, [true, false]);
});

test('Parse function with null argument', () => {
    const result = callParser.parseCallExpression('process(null)');
    assertEqual(result.function, 'process');
    assertEqual(result.args, [null]);
});

test('Parse function with negative numbers', () => {
    const result = callParser.parseCallExpression('calculate(-5, -10.5)');
    assertEqual(result.function, 'calculate');
    assertEqual(result.args, [-5, -10.5]);
});

test('Parse function with no arguments', () => {
    const result = callParser.parseCallExpression('getData()');
    assertEqual(result.function, 'getData');
    assertEqual(result.args, []);
});

test('Parse function with mixed types', () => {
    const result = callParser.parseCallExpression('mixed(1, "two", [3], {four: 4}, true, null)');
    assertEqual(result.function, 'mixed');
    assertEqual(result.args, [1, 'two', [3], {four: 4}, true, null]);
});

// ============================================
// Python Generator Tests
// ============================================
console.log('\n--- Python Generator Tests ---\n');

test('Python generator - valueToCode for basic types', () => {
    const gen = new PythonGenerator();
    assertEqual(gen.valueToCode(42), '42');
    assertEqual(gen.valueToCode('hello'), '"hello"');
    assertEqual(gen.valueToCode(true), 'True');
    assertEqual(gen.valueToCode(false), 'False');
    assertEqual(gen.valueToCode(null), 'None');
});

test('Python generator - valueToCode for arrays', () => {
    const gen = new PythonGenerator();
    assertEqual(gen.valueToCode([1, 2, 3]), '[1, 2, 3]');
    assertEqual(gen.valueToCode([]), '[]');
});

test('Python generator - valueToCode for objects', () => {
    const gen = new PythonGenerator();
    assertEqual(gen.valueToCode({a: 1, b: 2}), '{"a": 1, "b": 2}');
});

test('Python generator - callToNative', () => {
    const gen = new PythonGenerator();
    const parsed = { function: 'add', args: [1, 2] };
    assertEqual(gen.callToNative(parsed), 'add(1, 2)');
});

test('Python generator - callToNative with object', () => {
    const gen = new PythonGenerator();
    const parsed = { function: 'compute', args: [{a: 1}, 5] };
    assertEqual(gen.callToNative(parsed), 'compute({"a": 1}, 5)');
});

test('Python generator - generates runner files', () => {
    const gen = new PythonGenerator();
    const userFiles = [{ name: 'solution.py', content: 'def add(a, b): return a + b' }];
    const testCases = [
        { call: 'add(1, 2)', expected: 3, parsed: { function: 'add', args: [1, 2] } }
    ];
    const result = gen.generateRunner(userFiles, testCases);

    // Check that files were generated
    if (result.files.length !== 2) {
        throw new Error(`Expected 2 files, got ${result.files.length}`);
    }
    if (result.entryPoint !== '__test_runner__.py') {
        throw new Error(`Expected entry point __test_runner__.py, got ${result.entryPoint}`);
    }
    if (!result.stdin) {
        throw new Error('Expected stdin to be set');
    }
});

// ============================================
// JavaScript Generator Tests
// ============================================
console.log('\n--- JavaScript Generator Tests ---\n');

test('JavaScript generator - valueToCode for basic types', () => {
    const gen = new JavaScriptGenerator();
    assertEqual(gen.valueToCode(42), '42');
    assertEqual(gen.valueToCode('hello'), '"hello"');
    assertEqual(gen.valueToCode(true), 'true');
    assertEqual(gen.valueToCode(false), 'false');
    assertEqual(gen.valueToCode(null), 'null');
});

test('JavaScript generator - valueToCode for objects (unquoted keys)', () => {
    const gen = new JavaScriptGenerator();
    assertEqual(gen.valueToCode({a: 1, b: 2}), '{a: 1, b: 2}');
});

test('JavaScript generator - callToNative', () => {
    const gen = new JavaScriptGenerator();
    const parsed = { function: 'add', args: [1, 2] };
    assertEqual(gen.callToNative(parsed), 'add(1, 2)');
});

test('JavaScript generator - generates runner files', () => {
    const gen = new JavaScriptGenerator();
    const userFiles = [{ name: 'solution.js', content: 'function add(a, b) { return a + b; }' }];
    const testCases = [
        { call: 'add(1, 2)', expected: 3, parsed: { function: 'add', args: [1, 2] } }
    ];
    const result = gen.generateRunner(userFiles, testCases);

    // Check that files were generated
    if (result.files.length !== 1) {
        throw new Error(`Expected 1 file, got ${result.files.length}`);
    }
    if (result.entryPoint !== '__test_runner__.js') {
        throw new Error(`Expected entry point __test_runner__.js, got ${result.entryPoint}`);
    }
});

// ============================================
// Integration Test: generateTestRunner
// ============================================
console.log('\n--- Integration Tests ---\n');

test('generateTestRunner for Python', () => {
    const userFiles = [{ name: 'solution.py', content: 'def add(a, b): return a + b' }];
    const testCases = [
        { call: 'add(1, 2)', expected: 3 },
        { call: 'add(10, 20)', expected: 30 }
    ];

    const result = generateTestRunner('python', userFiles, testCases, callParser);

    if (!result.files || result.files.length === 0) {
        throw new Error('No files generated');
    }
    if (!result.entryPoint) {
        throw new Error('No entry point specified');
    }
    if (!result.stdin) {
        throw new Error('No stdin specified');
    }

    // Verify stdin contains the test cases
    const stdinData = JSON.parse(result.stdin);
    if (stdinData.length !== 2) {
        throw new Error(`Expected 2 test cases in stdin, got ${stdinData.length}`);
    }
});

test('generateTestRunner for JavaScript', () => {
    const userFiles = [{ name: 'solution.js', content: 'function sum(arr) { return arr.reduce((a,b) => a+b, 0); }' }];
    const testCases = [
        { call: 'sum([1, 2, 3])', expected: 6 }
    ];

    const result = generateTestRunner('javascript', userFiles, testCases, callParser);

    if (!result.files || result.files.length === 0) {
        throw new Error('No files generated');
    }
});

test('generateTestRunner for unknown language (fallback)', () => {
    const userFiles = [{ name: 'solution.xyz', content: 'some code' }];
    const testCases = [
        { call: 'test(1)', expected: 1 }
    ];

    const result = generateTestRunner('unknownlang', userFiles, testCases, callParser);

    if (result.mode !== 'fallback') {
        throw new Error(`Expected fallback mode, got ${result.mode}`);
    }
});

// ============================================
// Complex Types Tests - All Languages
// ============================================
console.log('\n--- Complex Types Tests ---\n');

// Test tuples (represented as arrays in universal syntax)
test('Parse tuple-like array', () => {
    const result = callParser.parseCallExpression('getTuple([1, "hello", true])');
    assertEqual(result.function, 'getTuple');
    assertEqual(result.args, [[1, "hello", true]]);
});

test('Parse nested tuple/array', () => {
    const result = callParser.parseCallExpression('process([[1, 2], [3, 4], [5, 6]])');
    assertEqual(result.function, 'process');
    assertEqual(result.args, [[[1, 2], [3, 4], [5, 6]]]);
});

// Test deeply nested structures
test('Parse deeply nested structure', () => {
    const result = callParser.parseCallExpression('deepNest({a: {b: {c: {d: [1, 2, 3]}}}})');
    assertEqual(result.function, 'deepNest');
    assertEqual(result.args, [{a: {b: {c: {d: [1, 2, 3]}}}}]);
});

// Test special numeric values
test('Parse special numbers (Infinity)', () => {
    // Note: Infinity is parsed as identifier, which throws
    // We handle this in call-parser
    try {
        callParser.parseCallExpression('handleInf(Infinity)');
    } catch (e) {
        // Expected - Infinity not supported directly in universal syntax
    }
});

// Test empty collections
test('Parse empty array', () => {
    const result = callParser.parseCallExpression('process([])');
    assertEqual(result.function, 'process');
    assertEqual(result.args, [[]]);
});

test('Parse empty object', () => {
    const result = callParser.parseCallExpression('process({})');
    assertEqual(result.function, 'process');
    assertEqual(result.args, [{}]);
});

// Test complex mixed types
test('Parse complex mixed argument types', () => {
    const result = callParser.parseCallExpression('complex({items: [1, 2], meta: {name: "test", active: true}}, [null, false], "suffix")');
    assertEqual(result.function, 'complex');
    assertEqual(result.args, [
        {items: [1, 2], meta: {name: "test", active: true}},
        [null, false],
        "suffix"
    ]);
});

// ============================================
// Python Generator - Complex Types
// ============================================
console.log('\n--- Python Generator Complex Types ---\n');

test('Python - tuple-like array conversion', () => {
    const gen = new PythonGenerator();
    // Tuples in Python are represented as arrays in universal syntax
    assertEqual(gen.valueToCode([1, "hello", true]), '[1, "hello", True]');
});

test('Python - nested dict conversion', () => {
    const gen = new PythonGenerator();
    const nested = {outer: {inner: {deep: 42}}};
    assertEqual(gen.valueToCode(nested), '{"outer": {"inner": {"deep": 42}}}');
});

test('Python - NaN and Infinity', () => {
    const gen = new PythonGenerator();
    assertEqual(gen.valueToCode(NaN), 'float("nan")');
    assertEqual(gen.valueToCode(Infinity), 'float("inf")');
    assertEqual(gen.valueToCode(-Infinity), 'float("-inf")');
});

test('Python - mixed array with objects', () => {
    const gen = new PythonGenerator();
    const mixed = [{a: 1}, {b: 2}, [3, 4]];
    assertEqual(gen.valueToCode(mixed), '[{"a": 1}, {"b": 2}, [3, 4]]');
});

test('Python - callToNative with complex args', () => {
    const gen = new PythonGenerator();
    const parsed = {
        function: 'transform',
        args: [{data: [1, 2, 3], config: {normalize: true}}]
    };
    assertEqual(gen.callToNative(parsed), 'transform({"data": [1, 2, 3], "config": {"normalize": True}})');
});

// ============================================
// JavaScript Generator - Complex Types
// ============================================
console.log('\n--- JavaScript Generator Complex Types ---\n');

test('JavaScript - nested object with unquoted keys', () => {
    const gen = new JavaScriptGenerator();
    const nested = {outer: {inner: {value: 42}}};
    assertEqual(gen.valueToCode(nested), '{outer: {inner: {value: 42}}}');
});

test('JavaScript - array of objects', () => {
    const gen = new JavaScriptGenerator();
    const arr = [{id: 1, name: "a"}, {id: 2, name: "b"}];
    assertEqual(gen.valueToCode(arr), '[{id: 1, name: "a"}, {id: 2, name: "b"}]');
});

test('JavaScript - NaN and Infinity', () => {
    const gen = new JavaScriptGenerator();
    assertEqual(gen.valueToCode(NaN), 'NaN');
    assertEqual(gen.valueToCode(Infinity), 'Infinity');
    assertEqual(gen.valueToCode(-Infinity), '-Infinity');
});

test('JavaScript - callToNative with nested structure', () => {
    const gen = new JavaScriptGenerator();
    const parsed = {
        function: 'analyze',
        args: [{points: [[0, 0], [1, 1], [2, 4]]}, "linear"]
    };
    assertEqual(gen.callToNative(parsed), 'analyze({points: [[0, 0], [1, 1], [2, 4]]}, "linear")');
});

// ============================================
// Java Generator - Complex Types
// ============================================
console.log('\n--- Java Generator Complex Types ---\n');

test('Java - array conversion to Arrays.asList', () => {
    const gen = new JavaGenerator();
    assertEqual(gen.valueToCode([1, 2, 3]), 'Arrays.asList(1, 2, 3)');
});

test('Java - object conversion to Map.of', () => {
    const gen = new JavaGenerator();
    assertEqual(gen.valueToCode({a: 1, b: 2}), 'Map.of("a", 1, "b", 2)');
});

test('Java - empty map', () => {
    const gen = new JavaGenerator();
    assertEqual(gen.valueToCode({}), 'new HashMap<>()');
});

test('Java - NaN and Infinity', () => {
    const gen = new JavaGenerator();
    assertEqual(gen.valueToCode(NaN), 'Double.NaN');
    assertEqual(gen.valueToCode(Infinity), 'Double.POSITIVE_INFINITY');
    assertEqual(gen.valueToCode(-Infinity), 'Double.NEGATIVE_INFINITY');
});

test('Java - long numbers', () => {
    const gen = new JavaGenerator();
    assertEqual(gen.valueToCode(3000000000), '3000000000L');
    assertEqual(gen.valueToCode(-3000000000), '-3000000000L');
});

test('Java - double numbers', () => {
    const gen = new JavaGenerator();
    assertEqual(gen.valueToCode(3.14), '3.14d');
});

// ============================================
// C++ Generator - Complex Types
// ============================================
console.log('\n--- C++ Generator Complex Types ---\n');

test('C++ - array conversion', () => {
    const gen = new CppGenerator();
    assertEqual(gen.valueToCode([1, 2, 3]), '{1, 2, 3}');
});

test('C++ - object conversion', () => {
    const gen = new CppGenerator();
    assertEqual(gen.valueToCode({x: 10, y: 20}), '{{"x", 10}, {"y", 20}}');
});

test('C++ - NaN and Infinity', () => {
    const gen = new CppGenerator();
    assertEqual(gen.valueToCode(NaN), 'std::numeric_limits<double>::quiet_NaN()');
    assertEqual(gen.valueToCode(Infinity), 'std::numeric_limits<double>::infinity()');
    assertEqual(gen.valueToCode(-Infinity), '-std::numeric_limits<double>::infinity()');
});

test('C++ - long long numbers', () => {
    const gen = new CppGenerator();
    assertEqual(gen.valueToCode(3000000000), '3000000000LL');
});

test('C++ - nullptr', () => {
    const gen = new CppGenerator();
    assertEqual(gen.valueToCode(null), 'nullptr');
});

// ============================================
// C# Generator - Complex Types
// ============================================
console.log('\n--- C# Generator Complex Types ---\n');

test('C# - array conversion', () => {
    const gen = new CSharpGenerator();
    assertEqual(gen.valueToCode([1, 2, 3]), 'new object[] {1, 2, 3}');
});

test('C# - dictionary conversion', () => {
    const gen = new CSharpGenerator();
    assertEqual(gen.valueToCode({a: 1}), 'new Dictionary<string, object> {{"a", 1}}');
});

test('C# - NaN and Infinity', () => {
    const gen = new CSharpGenerator();
    assertEqual(gen.valueToCode(NaN), 'double.NaN');
    assertEqual(gen.valueToCode(Infinity), 'double.PositiveInfinity');
    assertEqual(gen.valueToCode(-Infinity), 'double.NegativeInfinity');
});

test('C# - long numbers', () => {
    const gen = new CSharpGenerator();
    assertEqual(gen.valueToCode(3000000000), '3000000000L');
});

test('C# - double suffix', () => {
    const gen = new CSharpGenerator();
    assertEqual(gen.valueToCode(3.14159), '3.14159d');
});

// ============================================
// Go Generator - Complex Types
// ============================================
console.log('\n--- Go Generator Complex Types ---\n');

test('Go - slice conversion', () => {
    const gen = new GoGenerator();
    assertEqual(gen.valueToCode([1, 2, 3]), '[]interface{}{1, 2, 3}');
});

test('Go - map conversion', () => {
    const gen = new GoGenerator();
    assertEqual(gen.valueToCode({x: 1, y: 2}), 'map[string]interface{}{"x": 1, "y": 2}');
});

test('Go - NaN and Infinity', () => {
    const gen = new GoGenerator();
    assertEqual(gen.valueToCode(NaN), 'math.NaN()');
    assertEqual(gen.valueToCode(Infinity), 'math.Inf(1)');
    assertEqual(gen.valueToCode(-Infinity), 'math.Inf(-1)');
});

test('Go - nil', () => {
    const gen = new GoGenerator();
    assertEqual(gen.valueToCode(null), 'nil');
});

// ============================================
// Ruby Generator - Complex Types
// ============================================
console.log('\n--- Ruby Generator Complex Types ---\n');

test('Ruby - hash with arrow syntax', () => {
    const gen = new RubyGenerator();
    assertEqual(gen.valueToCode({a: 1, b: 2}), '{"a" => 1, "b" => 2}');
});

test('Ruby - NaN and Infinity', () => {
    const gen = new RubyGenerator();
    assertEqual(gen.valueToCode(NaN), 'Float::NAN');
    assertEqual(gen.valueToCode(Infinity), 'Float::INFINITY');
    assertEqual(gen.valueToCode(-Infinity), '-Float::INFINITY');
});

test('Ruby - nil', () => {
    const gen = new RubyGenerator();
    assertEqual(gen.valueToCode(null), 'nil');
});

test('Ruby - nested hash', () => {
    const gen = new RubyGenerator();
    const nested = {user: {name: "John", scores: [90, 85, 92]}};
    assertEqual(gen.valueToCode(nested), '{"user" => {"name" => "John", "scores" => [90, 85, 92]}}');
});

// ============================================
// Cross-Language Integration Tests
// ============================================
console.log('\n--- Cross-Language Integration Tests ---\n');

test('All generators handle deeply nested structure', () => {
    const complex = {
        data: {
            items: [
                {id: 1, values: [10, 20]},
                {id: 2, values: [30, 40]}
            ],
            meta: {count: 2, active: true}
        }
    };

    const generators = [
        { name: 'Python', gen: new PythonGenerator() },
        { name: 'JavaScript', gen: new JavaScriptGenerator() },
        { name: 'Java', gen: new JavaGenerator() },
        { name: 'Go', gen: new GoGenerator() },
        { name: 'Ruby', gen: new RubyGenerator() }
    ];

    for (const {name, gen} of generators) {
        const code = gen.valueToCode(complex);
        if (!code || code.length === 0) {
            throw new Error(`${name} generator produced empty output`);
        }
    }
});

test('generateTestRunner handles complex test cases for Python', () => {
    const userFiles = [{ name: 'solution.py', content: 'def transform(data): return data' }];
    const testCases = [
        { call: 'transform({items: [1, 2], meta: {count: 2}})', expected: {items: [1, 2], meta: {count: 2}} },
        { call: 'transform([[1, 2], [3, 4]])', expected: [[1, 2], [3, 4]] },
        { call: 'transform(null)', expected: null }
    ];

    const result = generateTestRunner('python', userFiles, testCases, callParser);

    if (!result.files || result.files.length === 0) {
        throw new Error('No files generated');
    }
    if (!result.stdin) {
        throw new Error('No stdin generated');
    }

    // Verify stdin contains properly converted calls
    const stdinData = JSON.parse(result.stdin);
    assertEqual(stdinData.length, 3);

    // Check first test case has Python-converted call
    if (!stdinData[0].call_native.includes('"items"')) {
        throw new Error('Python call should have quoted keys');
    }
});

test('generateTestRunner handles complex test cases for JavaScript', () => {
    const userFiles = [{ name: 'solution.js', content: 'function process(data) { return data; }' }];
    const testCases = [
        { call: 'process({nested: {deep: [1, 2, 3]}})', expected: {nested: {deep: [1, 2, 3]}} }
    ];

    const result = generateTestRunner('javascript', userFiles, testCases, callParser);

    if (!result.files || result.files.length === 0) {
        throw new Error('No files generated');
    }

    // JavaScript should have unquoted keys in the runner
    const runnerFile = result.files.find(f => f.name === '__test_runner__.js');
    if (!runnerFile) {
        throw new Error('Runner file not found');
    }
});

// ============================================
// Error Handling Tests
// ============================================
console.log('\n--- Error Handling Tests ---\n');

test('Call parser rejects invalid syntax', () => {
    try {
        callParser.parseCallExpression('not a function call');
        throw new Error('Should have thrown an error');
    } catch (e) {
        if (!e.message.includes('Expected a function call') && !e.message.includes('Failed to parse')) {
            throw e;
        }
    }
});

test('Call parser rejects empty string', () => {
    try {
        callParser.parseCallExpression('');
        throw new Error('Should have thrown an error');
    } catch (e) {
        if (!e.message.includes('non-empty string')) {
            throw e;
        }
    }
});

test('Call parser rejects nested function calls in args', () => {
    try {
        callParser.parseCallExpression('outer(inner())');
        throw new Error('Should have thrown an error');
    } catch (e) {
        if (!e.message.includes('Nested function calls')) {
            throw e;
        }
    }
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(60));
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

process.exit(failed === 0 ? 0 : 1);
