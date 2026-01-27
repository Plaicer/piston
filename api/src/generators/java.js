const BaseGenerator = require('./base');

/**
 * Java test runner generator
 * Note: Java requires more complex code generation due to static typing
 */
class JavaGenerator extends BaseGenerator {
    constructor() {
        super('java');
    }

    numberLiteral(value) {
        if (Number.isNaN(value)) return 'Double.NaN';
        if (!Number.isFinite(value)) return value > 0 ? 'Double.POSITIVE_INFINITY' : 'Double.NEGATIVE_INFINITY';
        // Add type suffix for clarity
        if (Number.isInteger(value)) {
            if (value > 2147483647 || value < -2147483648) {
                return value + 'L';
            }
            return String(value);
        }
        return value + 'd';
    }

    arrayLiteral(arr) {
        const elements = arr.map(v => this.valueToCode(v)).join(', ');
        return 'Arrays.asList(' + elements + ')';
    }

    objectLiteral(obj) {
        const pairs = Object.entries(obj)
            .map(([k, v]) => `"${this.escapeString(k)}", ${this.valueToCode(v)}`);
        if (pairs.length === 0) {
            return 'new HashMap<>()';
        }
        return 'Map.of(' + pairs.join(', ') + ')';
    }

    escapeJava(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    generateRunner(userFiles, testCases) {
        const mainFile = userFiles[0];
        const className = mainFile.name.replace(/\.java$/, '');

        // Generate test method calls
        const testCalls = testCases.map((tc, i) => {
            const nativeCall = `${className}.${this.callToNative(tc.parsed)}`;
            const expectedJson = this.escapeJava(JSON.stringify(tc.expected));
            return `
            try {
                Object actual = ${nativeCall};
                Object expected = gson.fromJson("${expectedJson}", Object.class);
                boolean passed = deepEquals(actual, expected);
                results.add(new TestResult(${i}, actual, passed, null));
            } catch (Exception e) {
                results.add(new TestResult(${i}, null, false, e.getClass().getSimpleName() + ": " + e.getMessage()));
            }`;
        }).join('\n');

        const runnerCode = `
import java.util.*;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public class __TestRunner__ {
    static Gson gson = new GsonBuilder().serializeNulls().create();

    static class TestResult {
        int index;
        Object actual;
        boolean passed;
        String error;

        TestResult(int i, Object a, boolean p, String e) {
            index = i;
            actual = a;
            passed = p;
            error = e;
        }
    }

    static boolean deepEquals(Object a, Object b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;

        // Handle numeric comparison with tolerance for int/double
        if (a instanceof Number && b instanceof Number) {
            double da = ((Number) a).doubleValue();
            double db = ((Number) b).doubleValue();
            if (Double.isNaN(da) && Double.isNaN(db)) return true;
            return da == db;
        }

        // Handle lists
        if (a instanceof List && b instanceof List) {
            List<?> la = (List<?>) a;
            List<?> lb = (List<?>) b;
            if (la.size() != lb.size()) return false;
            for (int i = 0; i < la.size(); i++) {
                if (!deepEquals(la.get(i), lb.get(i))) return false;
            }
            return true;
        }

        // Handle arrays
        if (a.getClass().isArray() && b instanceof List) {
            List<?> lb = (List<?>) b;
            int len = java.lang.reflect.Array.getLength(a);
            if (len != lb.size()) return false;
            for (int i = 0; i < len; i++) {
                if (!deepEquals(java.lang.reflect.Array.get(a, i), lb.get(i))) return false;
            }
            return true;
        }

        // Handle maps
        if (a instanceof Map && b instanceof Map) {
            Map<?, ?> ma = (Map<?, ?>) a;
            Map<?, ?> mb = (Map<?, ?>) b;
            if (ma.size() != mb.size()) return false;
            for (Object key : ma.keySet()) {
                String keyStr = String.valueOf(key);
                Object va = ma.get(key);
                // Try both the key and string version
                Object vb = mb.containsKey(key) ? mb.get(key) : mb.get(keyStr);
                if (vb == null && !mb.containsKey(key) && !mb.containsKey(keyStr)) return false;
                if (!deepEquals(va, vb)) return false;
            }
            return true;
        }

        return a.equals(b);
    }

    public static void main(String[] args) {
        List<TestResult> results = new ArrayList<>();
        ${testCalls}
        System.out.println(gson.toJson(results));
    }
}
`;

        return {
            files: [
                mainFile,
                { name: '__TestRunner__.java', content: runnerCode.trim() }
            ],
            entryPoint: '__TestRunner__.java',
            stdin: ''
        };
    }
}

module.exports = JavaGenerator;
