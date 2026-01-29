const acorn = require('acorn');

/**
 * Convert Python tuple syntax to JavaScript array syntax
 * e.g., [(1, "a"), (2, "b")] -> [[1, "a"], [2, "b"]]
 * Uses a stack to properly track function calls vs tuples
 */
function convertPythonTuplesToArrays(str) {
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = '';
    // Stack to track: 'func' for function call parens, 'tuple' for converted tuples, 'array' for original arrays
    const stack = [];

    while (i < str.length) {
        const char = str[i];
        const prevChar = i > 0 ? str[i - 1] : '';

        // Track string boundaries
        if ((char === '"' || char === "'") && prevChar !== '\\') {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (char === stringChar) {
                inString = false;
            }
            result += char;
            i++;
            continue;
        }

        if (!inString) {
            if (char === '(') {
                // Check if this is a function call by looking backwards in original string
                let j = i - 1;
                while (j >= 0 && /\s/.test(str[j])) j--;

                if (j >= 0 && /[a-zA-Z0-9_\)]/.test(str[j])) {
                    // It's a function call, keep as '('
                    result += '(';
                    stack.push('func');
                } else {
                    // It's a tuple, convert to '['
                    result += '[';
                    stack.push('tuple');
                }
                i++;
                continue;
            }

            if (char === ')') {
                // Pop from stack to determine what we're closing
                const type = stack.pop();
                if (type === 'func') {
                    result += ')';
                } else {
                    // tuple -> close as array
                    result += ']';
                }
                i++;
                continue;
            }

            if (char === '[') {
                result += '[';
                stack.push('array');
                i++;
                continue;
            }

            if (char === ']') {
                stack.pop(); // Should be 'array'
                result += ']';
                i++;
                continue;
            }
        }

        result += char;
        i++;
    }

    return result;
}

/**
 * Parse a JavaScript-like call expression into structured data
 * e.g., "compute({a: 1, b: 2}, 5)" -> { function: "compute", args: [{a: 1, b: 2}, 5] }
 * Also supports Python tuple syntax which gets converted to arrays
 */
function parseCallExpression(callStr) {
    if (!callStr || typeof callStr !== 'string') {
        throw new Error('Call expression must be a non-empty string');
    }

    // Convert Python tuples to JavaScript arrays
    const jsCallStr = convertPythonTuplesToArrays(callStr.trim());

    let ast;
    try {
        ast = acorn.parseExpressionAt(jsCallStr, 0, { ecmaVersion: 2020 });
    } catch (e) {
        throw new Error(`Failed to parse call expression: ${e.message}`);
    }

    if (ast.type !== 'CallExpression') {
        throw new Error(`Expected a function call, got: ${ast.type}`);
    }

    // Handle both simple identifiers and member expressions (e.g., obj.method())
    let functionName;
    if (ast.callee.type === 'Identifier') {
        functionName = ast.callee.name;
    } else if (ast.callee.type === 'MemberExpression') {
        // For method calls like obj.method(), we need the full path
        functionName = extractMemberExpression(ast.callee);
    } else {
        throw new Error(`Unsupported callee type: ${ast.callee.type}`);
    }

    const args = ast.arguments.map((arg, index) => {
        try {
            return evalASTNode(arg);
        } catch (e) {
            throw new Error(`Failed to evaluate argument ${index}: ${e.message}`);
        }
    });

    return {
        function: functionName,
        args: args
    };
}

/**
 * Extract the full path of a member expression (e.g., "obj.method" or "a.b.c")
 */
function extractMemberExpression(node) {
    if (node.type === 'Identifier') {
        return node.name;
    }
    if (node.type === 'MemberExpression') {
        const object = extractMemberExpression(node.object);
        const property = node.computed
            ? `[${evalASTNode(node.property)}]`
            : `.${node.property.name}`;
        return object + property;
    }
    throw new Error(`Cannot extract member expression from: ${node.type}`);
}

/**
 * Evaluate an AST node to get its JavaScript value
 */
function evalASTNode(node) {
    if (!node) {
        return undefined;
    }

    switch (node.type) {
        case 'Literal':
            return node.value;

        case 'ArrayExpression':
            return node.elements.map(el => evalASTNode(el));

        case 'ObjectExpression':
            const obj = {};
            for (const prop of node.properties) {
                if (prop.type === 'SpreadElement') {
                    throw new Error('Spread elements are not supported');
                }

                let key;
                if (prop.key.type === 'Identifier') {
                    key = prop.key.name;
                } else if (prop.key.type === 'Literal') {
                    key = prop.key.value;
                } else {
                    throw new Error(`Unsupported property key type: ${prop.key.type}`);
                }

                obj[key] = evalASTNode(prop.value);
            }
            return obj;

        case 'UnaryExpression':
            const argument = evalASTNode(node.argument);
            switch (node.operator) {
                case '-':
                    return -argument;
                case '+':
                    return +argument;
                case '!':
                    return !argument;
                case '~':
                    return ~argument;
                default:
                    throw new Error(`Unsupported unary operator: ${node.operator}`);
            }

        case 'BinaryExpression':
            const left = evalASTNode(node.left);
            const right = evalASTNode(node.right);
            switch (node.operator) {
                case '+':
                    return left + right;
                case '-':
                    return left - right;
                case '*':
                    return left * right;
                case '/':
                    return left / right;
                case '%':
                    return left % right;
                case '**':
                    return left ** right;
                default:
                    throw new Error(`Unsupported binary operator: ${node.operator}`);
            }

        case 'Identifier':
            // Handle special identifiers
            switch (node.name) {
                case 'null':
                    return null;
                case 'undefined':
                    return undefined;
                case 'true':
                    return true;
                case 'false':
                    return false;
                case 'Infinity':
                    return Infinity;
                case 'NaN':
                    return NaN;
                default:
                    // For other identifiers, return them as a special marker
                    // This allows for variable references in some languages
                    throw new Error(`Unknown identifier: ${node.name}. Only literals are supported in test case arguments.`);
            }

        case 'TemplateLiteral':
            // Simple template literal support (no expressions)
            if (node.expressions.length > 0) {
                throw new Error('Template literals with expressions are not supported');
            }
            return node.quasis.map(q => q.value.cooked).join('');

        case 'ConditionalExpression':
            throw new Error('Conditional expressions (ternary) are not supported');

        case 'CallExpression':
            throw new Error('Nested function calls are not supported in arguments');

        default:
            throw new Error(`Unsupported AST node type: ${node.type}`);
    }
}

module.exports = {
    parseCallExpression,
    evalASTNode
};
