/**
 * Unit tests for testCompile components
 *
 * PASS-THROUGH MODE: Call expressions are passed directly to the language runtime.
 * This allows language-specific syntax like Python lambdas, list comprehensions, etc.
 */

const { generateTestRunner } = require('./src/generators');

// Test state
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (err) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${err.message}`);
        failed++;
    }
}

function assertEqual(actual, expected) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`Expected ${expectedStr}, got ${actualStr}`);
    }
}

function assertContains(str, substr) {
    if (!str.includes(substr)) {
        throw new Error(`Expected string to contain "${substr}"`);
    }
}

console.log('============================================================');
console.log('Unit Tests for testCompile Components (Pass-Through Mode)');
console.log('============================================================\n');

// ============================================
// Python Generator Tests
// ============================================
console.log('--- Python Generator Tests ---\n');

test('Python - generates runner with test cases', () => {
    const userFiles = [{ name: 'solution.py', content: 'def add(a, b): return a + b' }];
    const testCases = [
        { call: 'add(1, 2)', expected: 3 },
        { call: 'add(10, 20)', expected: 30 }
    ];

    const result = generateTestRunner('python', userFiles, testCases);

    if (!result.files || result.files.length === 0) {
        throw new Error('No files generated');
    }
    if (!result.stdin) {
        throw new Error('No stdin generated');
    }

    // Check stdin contains raw call strings
    const stdinData = JSON.parse(result.stdin);
    assertEqual(stdinData.length, 2);
    assertEqual(stdinData[0].call, 'add(1, 2)');
    assertEqual(stdinData[0].expected, 3);
});

test('Python - supports Python-specific syntax (list comprehension)', () => {
    const userFiles = [{ name: 'solution.py', content: 'def process(x): return x' }];
    const testCases = [
        { call: '[x**2 for x in range(5)]', expected: [0, 1, 4, 9, 16] }
    ];

    const result = generateTestRunner('python', userFiles, testCases);
    const stdinData = JSON.parse(result.stdin);

    // Call is passed through as-is
    assertEqual(stdinData[0].call, '[x**2 for x in range(5)]');
});

test('Python - supports Python lambda expressions', () => {
    const userFiles = [{ name: 'solution.py', content: 'def run(f): return f(5)' }];
    const testCases = [
        { call: '(lambda x: x * 2)(5)', expected: 10 }
    ];

    const result = generateTestRunner('python', userFiles, testCases);
    const stdinData = JSON.parse(result.stdin);

    assertEqual(stdinData[0].call, '(lambda x: x * 2)(5)');
});

test('Python - supports f-strings', () => {
    const userFiles = [{ name: 'solution.py', content: 'def greet(name): return f"Hello, {name}"' }];
    const testCases = [
        { call: 'greet("World")', expected: 'Hello, World' }
    ];

    const result = generateTestRunner('python', userFiles, testCases);
    const stdinData = JSON.parse(result.stdin);

    assertEqual(stdinData[0].call, 'greet("World")');
});

test('Python - supports tuples as expected values', () => {
    const userFiles = [{ name: 'solution.py', content: 'def get_pair(): return (1, 2)' }];
    const testCases = [
        { call: 'get_pair()', expected: [1, 2] }  // Tuples become arrays in JSON
    ];

    const result = generateTestRunner('python', userFiles, testCases);
    const stdinData = JSON.parse(result.stdin);

    assertEqual(stdinData[0].expected, [1, 2]);
});

test('Python - runner file contains eval for call execution', () => {
    const userFiles = [{ name: 'solution.py', content: 'def add(a, b): return a + b' }];
    const testCases = [{ call: 'add(1, 2)', expected: 3 }];

    const result = generateTestRunner('python', userFiles, testCases);
    const runnerFile = result.files.find(f => f.name === '__test_runner__.py');

    if (!runnerFile) {
        throw new Error('Runner file not found');
    }

    assertContains(runnerFile.content, "eval(tc['call'])");
});

// ============================================
// JavaScript Generator Tests
// ============================================
console.log('\n--- JavaScript Generator Tests ---\n');

test('JavaScript - generates runner with test cases', () => {
    const userFiles = [{ name: 'solution.js', content: 'function add(a, b) { return a + b; }' }];
    const testCases = [
        { call: 'add(1, 2)', expected: 3 }
    ];

    const result = generateTestRunner('javascript', userFiles, testCases);

    if (!result.files || result.files.length === 0) {
        throw new Error('No files generated');
    }
});

test('JavaScript - supports arrow functions in calls', () => {
    const userFiles = [{ name: 'solution.js', content: 'const arr = [1, 2, 3];' }];
    const testCases = [
        { call: 'arr.map(x => x * 2)', expected: [2, 4, 6] }
    ];

    const result = generateTestRunner('javascript', userFiles, testCases);
    const stdinData = JSON.parse(result.stdin);

    assertEqual(stdinData[0].call, 'arr.map(x => x * 2)');
});

test('JavaScript - supports template literals', () => {
    const userFiles = [{ name: 'solution.js', content: 'const name = "World";' }];
    const testCases = [
        { call: '`Hello, ${name}!`', expected: 'Hello, World!' }
    ];

    const result = generateTestRunner('javascript', userFiles, testCases);
    const stdinData = JSON.parse(result.stdin);

    assertEqual(stdinData[0].call, '`Hello, ${name}!`');
});

test('JavaScript - runner file embeds user code', () => {
    const userFiles = [{ name: 'solution.js', content: 'function test() { return 42; }' }];
    const testCases = [{ call: 'test()', expected: 42 }];

    const result = generateTestRunner('javascript', userFiles, testCases);
    const runnerFile = result.files.find(f => f.name === '__test_runner__.js');

    if (!runnerFile) {
        throw new Error('Runner file not found');
    }

    assertContains(runnerFile.content, 'function test()');
    assertContains(runnerFile.content, 'eval(tc.call)');
});

// ============================================
// Ruby Generator Tests
// ============================================
console.log('\n--- Ruby Generator Tests ---\n');

test('Ruby - generates runner with test cases', () => {
    const userFiles = [{ name: 'solution.rb', content: 'def add(a, b); a + b; end' }];
    const testCases = [
        { call: 'add(1, 2)', expected: 3 }
    ];

    const result = generateTestRunner('ruby', userFiles, testCases);

    if (!result.files || result.files.length === 0) {
        throw new Error('No files generated');
    }
});

test('Ruby - supports Ruby block syntax', () => {
    const userFiles = [{ name: 'solution.rb', content: 'def process(arr); arr; end' }];
    const testCases = [
        { call: '[1, 2, 3].map { |x| x * 2 }', expected: [2, 4, 6] }
    ];

    const result = generateTestRunner('ruby', userFiles, testCases);
    const stdinData = JSON.parse(result.stdin);

    assertEqual(stdinData[0].call, '[1, 2, 3].map { |x| x * 2 }');
});

// ============================================
// Java Generator Tests
// ============================================
console.log('\n--- Java Generator Tests ---\n');

test('Java - generates runner with embedded calls', () => {
    const userFiles = [{ name: 'Solution.java', content: 'public class Solution { public static int add(int a, int b) { return a + b; } }' }];
    const testCases = [
        { call: 'Solution.add(1, 2)', expected: 3 }
    ];

    const result = generateTestRunner('java', userFiles, testCases);
    const runnerFile = result.files.find(f => f.name === '__TestRunner__.java');

    if (!runnerFile) {
        throw new Error('Runner file not found');
    }

    // Java embeds the call directly in the code
    assertContains(runnerFile.content, 'Solution.add(1, 2)');
});

// ============================================
// C++ Generator Tests
// ============================================
console.log('\n--- C++ Generator Tests ---\n');

test('C++ - generates runner with embedded calls', () => {
    const userFiles = [{ name: 'solution.cpp', content: 'int add(int a, int b) { return a + b; }' }];
    const testCases = [
        { call: 'add(1, 2)', expected: 3 }
    ];

    const result = generateTestRunner('cpp', userFiles, testCases);
    const runnerFile = result.files.find(f => f.name === '__test_runner__.cpp');

    if (!runnerFile) {
        throw new Error('Runner file not found');
    }

    assertContains(runnerFile.content, 'add(1, 2)');
});

// ============================================
// Go Generator Tests
// ============================================
console.log('\n--- Go Generator Tests ---\n');

test('Go - generates runner with embedded calls', () => {
    const userFiles = [{ name: 'solution.go', content: 'func Add(a, b int) int { return a + b }' }];
    const testCases = [
        { call: 'Add(1, 2)', expected: 3 }
    ];

    const result = generateTestRunner('go', userFiles, testCases);
    const runnerFile = result.files.find(f => f.name === '__test_runner__.go');

    if (!runnerFile) {
        throw new Error('Runner file not found');
    }

    assertContains(runnerFile.content, 'Add(1, 2)');
});

// ============================================
// C# Generator Tests
// ============================================
console.log('\n--- C# Generator Tests ---\n');

test('C# - generates runner with embedded calls', () => {
    const userFiles = [{ name: 'Solution.cs', content: 'public class Solution { public static int Add(int a, int b) { return a + b; } }' }];
    const testCases = [
        { call: 'Solution.Add(1, 2)', expected: 3 }
    ];

    const result = generateTestRunner('csharp', userFiles, testCases);
    const runnerFile = result.files.find(f => f.name === '__TestRunner__.cs');

    if (!runnerFile) {
        throw new Error('Runner file not found');
    }

    assertContains(runnerFile.content, 'Solution.Add(1, 2)');
});

// ============================================
// Generic/Fallback Generator Tests
// ============================================
console.log('\n--- Generic/Fallback Generator Tests ---\n');

test('Unknown language uses generic fallback', () => {
    const userFiles = [{ name: 'solution.xyz', content: 'some code' }];
    const testCases = [
        { call: 'test(1, 2)', expected: 3 }
    ];

    const result = generateTestRunner('unknownlang', userFiles, testCases);

    assertEqual(result.mode, 'fallback');

    const stdinData = JSON.parse(result.stdin);
    assertEqual(stdinData[0].call, 'test(1, 2)');
});

// ============================================
// Complex Test Cases
// ============================================
console.log('\n--- Complex Test Cases ---\n');

test('Python - complex nested structures', () => {
    const userFiles = [{ name: 'solution.py', content: 'def transform(data): return data' }];
    const testCases = [
        {
            call: 'transform({"items": [1, 2, 3], "meta": {"count": 3}})',
            expected: { items: [1, 2, 3], meta: { count: 3 } }
        }
    ];

    const result = generateTestRunner('python', userFiles, testCases);
    const stdinData = JSON.parse(result.stdin);

    assertEqual(stdinData[0].expected, { items: [1, 2, 3], meta: { count: 3 } });
});

test('Python - handles the user example with tuples and list comprehensions', () => {
    const userFiles = [{ name: 'solution.py', content: 'def detect_card_token_cycles(events): return []' }];
    const testCases = [
        {
            call: 'detect_card_token_cycles([(0, "card", "a"), (500, "card", "b"), (1000, "card", "a")])',
            expected: [["card", 1000]]
        },
        {
            call: '(lambda r: (len(r), sum(t for _, t in r) % 1000000007))(detect_card_token_cycles([(i, f"card_{i % 100}", f"tok_{(i // 3) % 2}") for i in range(100000)]))',
            expected: [100, 31550]
        }
    ];

    const result = generateTestRunner('python', userFiles, testCases);
    const stdinData = JSON.parse(result.stdin);

    // Both calls are passed through as-is
    assertContains(stdinData[0].call, 'detect_card_token_cycles');
    assertContains(stdinData[1].call, 'lambda r:');
    assertContains(stdinData[1].call, 'for i in range(100000)');
});

// ============================================
// Summary
// ============================================
console.log('\n============================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('============================================================');

if (failed > 0) {
    process.exit(1);
}
