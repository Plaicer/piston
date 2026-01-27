/**
 * Base class for language-specific test runner generators
 */
class BaseGenerator {
    constructor(language) {
        this.language = language;
    }

    /**
     * Convert a JavaScript value to language-specific code syntax
     */
    valueToCode(value) {
        if (value === null) return this.nullLiteral();
        if (value === undefined) return this.undefinedLiteral();
        if (typeof value === 'boolean') return this.boolLiteral(value);
        if (typeof value === 'number') return this.numberLiteral(value);
        if (typeof value === 'string') return this.stringLiteral(value);
        if (Array.isArray(value)) return this.arrayLiteral(value);
        if (typeof value === 'object') return this.objectLiteral(value);
        throw new Error(`Unsupported value type: ${typeof value}`);
    }

    // Override these methods in subclasses for language-specific syntax
    nullLiteral() {
        return 'null';
    }

    undefinedLiteral() {
        return 'null';
    }

    boolLiteral(value) {
        return value ? 'true' : 'false';
    }

    numberLiteral(value) {
        if (Number.isNaN(value)) return 'NaN';
        if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
        return String(value);
    }

    stringLiteral(value) {
        return JSON.stringify(value);
    }

    arrayLiteral(arr) {
        const elements = arr.map(v => this.valueToCode(v)).join(', ');
        return '[' + elements + ']';
    }

    objectLiteral(obj) {
        const pairs = Object.entries(obj)
            .map(([k, v]) => `${this.stringLiteral(k)}: ${this.valueToCode(v)}`);
        return '{' + pairs.join(', ') + '}';
    }

    /**
     * Convert a parsed call expression to native language syntax
     */
    callToNative(parsed) {
        const args = parsed.args.map(a => this.valueToCode(a)).join(', ');
        return `${parsed.function}(${args})`;
    }

    /**
     * Generate the test runner files and configuration
     * Must be implemented by subclasses
     *
     * @param {Array} userFiles - Array of {name, content} objects
     * @param {Array} testCases - Array of test cases with parsed call expressions
     * @returns {Object} - { files: [...], entryPoint: string, stdin: string }
     */
    generateRunner(userFiles, testCases) {
        throw new Error('Must implement generateRunner in subclass');
    }

    /**
     * Escape a string for safe inclusion in the target language
     */
    escapeString(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }
}

module.exports = BaseGenerator;
