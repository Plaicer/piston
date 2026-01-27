const BaseGenerator = require('./base');

/**
 * C++ test runner generator
 * Note: C++ has limited reflection, so we use a simpler approach
 */
class CppGenerator extends BaseGenerator {
    constructor() {
        super('cpp');
    }

    boolLiteral(value) {
        return value ? 'true' : 'false';
    }

    nullLiteral() {
        return 'nullptr';
    }

    numberLiteral(value) {
        if (Number.isNaN(value)) return 'std::numeric_limits<double>::quiet_NaN()';
        if (!Number.isFinite(value)) {
            return value > 0
                ? 'std::numeric_limits<double>::infinity()'
                : '-std::numeric_limits<double>::infinity()';
        }
        if (Number.isInteger(value)) {
            if (value > 2147483647 || value < -2147483648) {
                return value + 'LL';
            }
            return String(value);
        }
        return value.toString();
    }

    arrayLiteral(arr) {
        const elements = arr.map(v => this.valueToCode(v)).join(', ');
        return '{' + elements + '}';
    }

    objectLiteral(obj) {
        const pairs = Object.entries(obj)
            .map(([k, v]) => `{"${this.escapeString(k)}", ${this.valueToCode(v)}}`);
        return '{' + pairs.join(', ') + '}';
    }

    generateRunner(userFiles, testCases) {
        const mainFile = userFiles[0];

        // For C++, we generate test calls inline since there's no eval
        const testCalls = testCases.map((tc, i) => {
            const nativeCall = this.callToNative(tc.parsed);
            const expectedJson = JSON.stringify(tc.expected).replace(/"/g, '\\"');
            return `
    {
        try {
            auto actual = ${nativeCall};
            auto expected = json::parse("${expectedJson}");
            bool passed = compareResults(actual, expected);
            results.push_back({{"index", ${i}}, {"actual", actual}, {"passed", passed}, {"error", nullptr}});
        } catch (const std::exception& e) {
            results.push_back({{"index", ${i}}, {"actual", nullptr}, {"passed", false}, {"error", e.what()}});
        }
    }`;
        }).join('\n');

        // Note: This is a simplified C++ runner that requires nlohmann/json
        const runnerCode = `
#include <iostream>
#include <vector>
#include <map>
#include <string>
#include <limits>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// User code
${mainFile.content}

// Helper to compare results
template<typename T>
bool compareResults(const T& actual, const json& expected) {
    try {
        json actualJson = actual;
        return actualJson == expected;
    } catch (...) {
        return false;
    }
}

// Specializations for common types
template<>
bool compareResults(const int& actual, const json& expected) {
    if (expected.is_number()) {
        return actual == expected.get<int>();
    }
    return false;
}

template<>
bool compareResults(const double& actual, const json& expected) {
    if (expected.is_number()) {
        double exp = expected.get<double>();
        if (std::isnan(actual) && std::isnan(exp)) return true;
        return actual == exp;
    }
    return false;
}

template<>
bool compareResults(const std::string& actual, const json& expected) {
    if (expected.is_string()) {
        return actual == expected.get<std::string>();
    }
    return false;
}

template<>
bool compareResults(const bool& actual, const json& expected) {
    if (expected.is_boolean()) {
        return actual == expected.get<bool>();
    }
    return false;
}

template<typename T>
bool compareResults(const std::vector<T>& actual, const json& expected) {
    if (!expected.is_array() || actual.size() != expected.size()) return false;
    for (size_t i = 0; i < actual.size(); ++i) {
        if (!compareResults(actual[i], expected[i])) return false;
    }
    return true;
}

int main() {
    std::vector<json> results;

    ${testCalls}

    std::cout << json(results).dump() << std::endl;
    return 0;
}
`;

        return {
            files: [
                { name: '__test_runner__.cpp', content: runnerCode.trim() }
            ],
            entryPoint: '__test_runner__.cpp',
            stdin: ''
        };
    }
}

module.exports = CppGenerator;
