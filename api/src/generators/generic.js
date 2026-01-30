const BaseGenerator = require('./base');

/**
 * Generic/Fallback test runner generator
 * Used for languages without a specific generator
 *
 * PASS-THROUGH MODE: Test cases are passed via stdin with raw call expressions.
 * The call expressions are in the target language's native syntax.
 */
class GenericGenerator extends BaseGenerator {
    constructor(language) {
        super(language || 'generic');
    }

    /**
     * For unsupported languages, we provide a fallback mode that:
     * 1. Passes test case inputs via stdin (raw call expressions)
     * 2. Expects the user to handle output
     * 3. Compares stdout with expected output
     */
    generateRunner(userFiles, testCases) {
        const logger = require('logplease').create('generators/generic');
        logger.warn(
            `No specific generator for '${this.language}', using generic fallback. ` +
            `Test execution may be limited.`
        );

        // For generic mode, we pass test cases with raw call strings
        const stdinTestCases = testCases.map(tc => ({
            call: tc.call,
            expected: tc.expected
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
