/**
 * Test script for /api/v2/testCompile endpoint
 * Run with: node test-testCompile.js
 */

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 2000;

function makeRequest(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);

        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(responseData)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('Testing /api/v2/testCompile endpoint');
    console.log('='.repeat(60));
    console.log();

    const tests = [
        {
            name: 'Python - Basic function calls',
            request: {
                language: 'python',
                version: '*',
                files: [{
                    name: 'solution.py',
                    content: `
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

def greet(name):
    return f"Hello, {name}!"
`
                }],
                test_cases: [
                    { call: 'add(1, 2)', expected: 3 },
                    { call: 'add(10, 20)', expected: 30 },
                    { call: 'multiply(3, 4)', expected: 12 },
                    { call: 'greet("World")', expected: 'Hello, World!' }
                ]
            }
        },
        {
            name: 'Python - Complex data types',
            request: {
                language: 'python',
                version: '*',
                files: [{
                    name: 'solution.py',
                    content: `
def get_list(n):
    return list(range(n))

def get_dict(keys, values):
    return dict(zip(keys, values))

def transform(data):
    return {"result": data["items"], "count": len(data["items"])}
`
                }],
                test_cases: [
                    { call: 'get_list(5)', expected: [0, 1, 2, 3, 4] },
                    { call: 'get_list(0)', expected: [] },
                    { call: 'get_dict(["a", "b"], [1, 2])', expected: { a: 1, b: 2 } },
                    { call: 'transform({items: [1, 2, 3]})', expected: { result: [1, 2, 3], count: 3 } }
                ]
            }
        },
        {
            name: 'Python - Edge cases',
            request: {
                language: 'python',
                version: '*',
                files: [{
                    name: 'solution.py',
                    content: `
def return_none():
    return None

def return_bool(x):
    return x > 0

def return_string_with_special():
    return "Hello\\nWorld"
`
                }],
                test_cases: [
                    { call: 'return_none()', expected: null },
                    { call: 'return_bool(5)', expected: true },
                    { call: 'return_bool(-5)', expected: false },
                    { call: 'return_string_with_special()', expected: 'Hello\nWorld' }
                ]
            }
        },
        {
            name: 'JavaScript - Basic function calls',
            request: {
                language: 'javascript',
                version: '*',
                files: [{
                    name: 'solution.js',
                    content: `
function add(a, b) {
    return a + b;
}

function multiply(a, b) {
    return a * b;
}

function greet(name) {
    return "Hello, " + name + "!";
}
`
                }],
                test_cases: [
                    { call: 'add(1, 2)', expected: 3 },
                    { call: 'add(10, 20)', expected: 30 },
                    { call: 'multiply(3, 4)', expected: 12 },
                    { call: 'greet("World")', expected: 'Hello, World!' }
                ]
            }
        },
        {
            name: 'JavaScript - Complex data types',
            request: {
                language: 'javascript',
                version: '*',
                files: [{
                    name: 'solution.js',
                    content: `
function getArray(n) {
    return Array.from({length: n}, (_, i) => i);
}

function getObject(a, b) {
    return {x: a, y: b};
}

function sumValues(obj) {
    return Object.values(obj).reduce((a, b) => a + b, 0);
}
`
                }],
                test_cases: [
                    { call: 'getArray(5)', expected: [0, 1, 2, 3, 4] },
                    { call: 'getArray(0)', expected: [] },
                    { call: 'getObject(1, 2)', expected: { x: 1, y: 2 } },
                    { call: 'sumValues({a: 1, b: 2, c: 3})', expected: 6 }
                ]
            }
        },
        {
            name: 'Python - Test with expected failure',
            request: {
                language: 'python',
                version: '*',
                files: [{
                    name: 'solution.py',
                    content: `
def add(a, b):
    return a + b
`
                }],
                test_cases: [
                    { call: 'add(1, 2)', expected: 3 },      // Should pass
                    { call: 'add(1, 2)', expected: 999 }    // Should fail (wrong expected)
                ]
            },
            expectedResults: {
                passed: 1,
                failed: 1
            }
        },
        {
            name: 'Python - Runtime error handling',
            request: {
                language: 'python',
                version: '*',
                files: [{
                    name: 'solution.py',
                    content: `
def divide(a, b):
    return a / b
`
                }],
                test_cases: [
                    { call: 'divide(10, 2)', expected: 5.0 },   // Should pass
                    { call: 'divide(10, 0)', expected: null }   // Should fail with error
                ]
            },
            expectedResults: {
                passed: 1,
                failed: 1
            }
        }
    ];

    let totalPassed = 0;
    let totalFailed = 0;

    for (const test of tests) {
        console.log(`\nTest: ${test.name}`);
        console.log('-'.repeat(50));

        try {
            const response = await makeRequest('/api/v2/testCompile', test.request);

            if (response.status !== 200) {
                console.log(`  ❌ FAILED - HTTP ${response.status}`);
                console.log(`  Response: ${JSON.stringify(response.data, null, 2)}`);
                totalFailed++;
                continue;
            }

            const result = response.data;

            // Check compilation
            if (result.compile && result.compile.code !== 0) {
                console.log(`  ❌ FAILED - Compilation error`);
                console.log(`  stderr: ${result.compile.stderr}`);
                totalFailed++;
                continue;
            }

            // Check results
            const summary = result.summary;
            console.log(`  Results: ${summary.passed}/${summary.total} passed`);

            // Print each test case result
            for (const tr of result.test_results) {
                const status = tr.passed ? '✅' : '❌';
                console.log(`    ${status} ${tr.call}`);
                if (!tr.passed) {
                    console.log(`       Expected: ${JSON.stringify(tr.expected)}`);
                    console.log(`       Actual:   ${JSON.stringify(tr.actual)}`);
                    if (tr.error) {
                        console.log(`       Error:    ${tr.error}`);
                    }
                }
            }

            // Validate against expected results if specified
            if (test.expectedResults) {
                if (summary.passed === test.expectedResults.passed &&
                    summary.failed === test.expectedResults.failed) {
                    console.log(`  ✅ TEST PASSED (expected ${test.expectedResults.passed} pass, ${test.expectedResults.failed} fail)`);
                    totalPassed++;
                } else {
                    console.log(`  ❌ TEST FAILED - Expected ${test.expectedResults.passed} pass/${test.expectedResults.failed} fail, got ${summary.passed}/${summary.failed}`);
                    totalFailed++;
                }
            } else {
                // All test cases should pass
                if (summary.failed === 0) {
                    console.log(`  ✅ TEST PASSED`);
                    totalPassed++;
                } else {
                    console.log(`  ❌ TEST FAILED - ${summary.failed} test cases failed`);
                    totalFailed++;
                }
            }

        } catch (error) {
            console.log(`  ❌ ERROR: ${error.message}`);
            if (error.code === 'ECONNREFUSED') {
                console.log(`  Make sure Piston API is running on ${API_HOST}:${API_PORT}`);
            }
            totalFailed++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`SUMMARY: ${totalPassed} passed, ${totalFailed} failed`);
    console.log('='.repeat(60));

    return totalFailed === 0;
}

// Run tests
runTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
