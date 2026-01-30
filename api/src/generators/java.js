const BaseGenerator = require('./base');

/**
 * Java test runner generator
 *
 * PASS-THROUGH MODE: Call expressions are embedded directly in generated Java code.
 * The call syntax must be valid Java (e.g., "Solution.add(1, 2)")
 */
class JavaGenerator extends BaseGenerator {
    constructor() {
        super('java');
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

        // Generate test method calls - call expressions are embedded directly
        const testCalls = testCases.map((tc, i) => {
            const expectedJson = this.escapeJava(JSON.stringify(tc.expected));
            // The call is used directly as Java code
            const callCode = tc.call;
            return `
            try {
                Object actual = ${callCode};
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
