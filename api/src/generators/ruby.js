const BaseGenerator = require('./base');

/**
 * Ruby test runner generator
 */
class RubyGenerator extends BaseGenerator {
    constructor() {
        super('ruby');
    }

    boolLiteral(value) {
        return value ? 'true' : 'false';
    }

    nullLiteral() {
        return 'nil';
    }

    numberLiteral(value) {
        if (Number.isNaN(value)) return 'Float::NAN';
        if (!Number.isFinite(value)) {
            return value > 0 ? 'Float::INFINITY' : '-Float::INFINITY';
        }
        return String(value);
    }

    objectLiteral(obj) {
        // Ruby uses => for hash key-value pairs
        const pairs = Object.entries(obj)
            .map(([k, v]) => `${this.stringLiteral(k)} => ${this.valueToCode(v)}`);
        return '{' + pairs.join(', ') + '}';
    }

    generateRunner(userFiles, testCases) {
        const mainFile = userFiles[0];
        const moduleName = mainFile.name.replace(/\.rb$/, '');

        // Convert each test case call to Ruby syntax
        const nativeTestCases = testCases.map(tc => ({
            ...tc,
            call_native: this.callToNative(tc.parsed),
            parsed: undefined
        }));

        const runnerCode = `
require 'json'
require_relative '${moduleName}'

def deep_equals(a, b)
  # Handle nil
  return true if a.nil? && b.nil?
  return false if a.nil? || b.nil?

  # Handle NaN
  if a.is_a?(Float) && b.is_a?(Float)
    return true if a.nan? && b.nan?
  end

  # Type check with numeric flexibility
  if a.class != b.class
    # Allow numeric comparison
    if a.is_a?(Numeric) && b.is_a?(Numeric)
      return a == b
    end
    # Allow array comparison
    if a.is_a?(Array) && b.is_a?(Array)
      return false if a.length != b.length
      return a.zip(b).all? { |x, y| deep_equals(x, y) }
    end
    return false
  end

  # Arrays
  if a.is_a?(Array)
    return false if a.length != b.length
    return a.zip(b).all? { |x, y| deep_equals(x, y) }
  end

  # Hashes
  if a.is_a?(Hash)
    return false if a.keys.sort != b.keys.sort
    return a.keys.all? { |k| deep_equals(a[k], b[k]) }
  end

  # Default comparison
  a == b
end

def serialize(value)
  case value
  when nil
    nil
  when Float
    if value.nan?
      'NaN'
    elsif value.infinite?
      value > 0 ? 'Infinity' : '-Infinity'
    else
      value
    end
  when Array
    value.map { |v| serialize(v) }
  when Hash
    value.transform_keys(&:to_s).transform_values { |v| serialize(v) }
  when Set
    value.map { |v| serialize(v) }.sort_by { |v| [v.class.name, v.to_s] }
  else
    value
  end
end

# Read test cases from stdin
test_cases = JSON.parse(STDIN.read)
results = []

test_cases.each_with_index do |tc, i|
  begin
    # Execute the function call
    actual = eval(tc['call_native'])

    # Compare with expected
    passed = deep_equals(actual, tc['expected'])

    results << {
      'index' => i,
      'actual' => serialize(actual),
      'passed' => passed,
      'error' => nil
    }
  rescue => e
    results << {
      'index' => i,
      'actual' => nil,
      'passed' => false,
      'error' => "\#{e.class}: \#{e.message}"
    }
  end
end

puts JSON.generate(results)
`;

        return {
            files: [
                ...userFiles,
                { name: '__test_runner__.rb', content: runnerCode.trim() }
            ],
            entryPoint: '__test_runner__.rb',
            stdin: JSON.stringify(nativeTestCases)
        };
    }
}

module.exports = RubyGenerator;
