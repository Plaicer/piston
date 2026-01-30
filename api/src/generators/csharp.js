const BaseGenerator = require('./base');

/**
 * C# test runner generator
 *
 * PASS-THROUGH MODE: Call expressions are embedded directly in generated C# code.
 * The call syntax must be valid C# (e.g., "Solution.Add(1, 2)")
 */
class CSharpGenerator extends BaseGenerator {
    constructor() {
        super('csharp');
    }

    escapeCSharp(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    generateRunner(userFiles, testCases) {
        const mainFile = userFiles[0];
        const className = mainFile.name.replace(/\.cs$/, '');

        // Generate test method calls - call expressions are embedded directly
        const testCalls = testCases.map((tc, i) => {
            const expectedJson = this.escapeCSharp(JSON.stringify(tc.expected));
            // The call is used directly as C# code
            const callCode = tc.call;
            return `
            try
            {
                var actual = ${callCode};
                var expected = JsonConvert.DeserializeObject<object>("${expectedJson}");
                bool passed = DeepEquals(actual, expected);
                results.Add(new TestResult { Index = ${i}, Actual = actual, Passed = passed, Error = null });
            }
            catch (Exception e)
            {
                results.Add(new TestResult { Index = ${i}, Actual = null, Passed = false, Error = e.GetType().Name + ": " + e.Message });
            }`;
        }).join('\n');

        const runnerCode = `
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;

public class TestResult
{
    public int Index { get; set; }
    public object Actual { get; set; }
    public bool Passed { get; set; }
    public string Error { get; set; }
}

public class __TestRunner__
{
    static bool DeepEquals(object a, object b)
    {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;

        // Handle numeric comparison
        if (IsNumeric(a) && IsNumeric(b))
        {
            double da = Convert.ToDouble(a);
            double db = Convert.ToDouble(b);
            if (double.IsNaN(da) && double.IsNaN(db)) return true;
            return da == db;
        }

        // Handle arrays/lists
        if (a is IEnumerable && b is IEnumerable && !(a is string) && !(b is string))
        {
            var listA = ((IEnumerable)a).Cast<object>().ToList();
            var listB = ((IEnumerable)b).Cast<object>().ToList();
            if (listA.Count != listB.Count) return false;
            for (int i = 0; i < listA.Count; i++)
            {
                if (!DeepEquals(listA[i], listB[i])) return false;
            }
            return true;
        }

        // Handle dictionaries
        if (a is IDictionary && b is IDictionary)
        {
            var dictA = (IDictionary)a;
            var dictB = (IDictionary)b;
            if (dictA.Count != dictB.Count) return false;
            foreach (var key in dictA.Keys)
            {
                var keyStr = key.ToString();
                object valB = null;
                if (dictB.Contains(key)) valB = dictB[key];
                else if (dictB.Contains(keyStr)) valB = dictB[keyStr];
                else return false;
                if (!DeepEquals(dictA[key], valB)) return false;
            }
            return true;
        }

        return a.Equals(b);
    }

    static bool IsNumeric(object o)
    {
        return o is sbyte || o is byte || o is short || o is ushort ||
               o is int || o is uint || o is long || o is ulong ||
               o is float || o is double || o is decimal;
    }

    public static void Main(string[] args)
    {
        var results = new List<TestResult>();

        ${testCalls}

        Console.WriteLine(JsonConvert.SerializeObject(results));
    }
}
`;

        return {
            files: [
                mainFile,
                { name: '__TestRunner__.cs', content: runnerCode.trim() }
            ],
            entryPoint: '__TestRunner__.cs',
            stdin: ''
        };
    }
}

module.exports = CSharpGenerator;
