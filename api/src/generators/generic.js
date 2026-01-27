const BaseGenerator = require('./base');

/**
 * Generic/Fallback test runner generator
 * Used for languages without a specific generator
 *
 * This generator uses stdin/stdout based testing where:
 * - Test cases are passed as JSON via stdin
 * - The user's code is expected to read stdin and write results to stdout
 */
class GenericGenerator extends BaseGenerator {
    constructor(language) {
        super(language || 'generic');
    }

    /**
     * For unsupported languages, we provide a fallback mode that:
     * 1. Passes test case inputs via stdin
     * 2. Expects the user to handle output
     * 3. Compares stdout with expected output
     */
    generateRunner(userFiles, testCases) {
        const logger = require('logplease').create('generators/generic');
        logger.warn(
            `No specific generator for '${this.language}', using generic fallback. ` +
            `Test execution may be limited.`
        );

        // For generic mode, we prepare test cases for stdin-based testing
        // The user's code should read from stdin and print results
        const stdinTestCases = testCases.map(tc => ({
            call: tc.call,
            call_native: this.callToNative(tc.parsed),
            expected: tc.expected,
            parsed: undefined
        }));

        return {
            files: userFiles,
            entryPoint: userFiles[0].name,
            stdin: JSON.stringify(stdinTestCases),
            mode: 'fallback'
        };
    }
}

module.exports = GenericGenerator;
