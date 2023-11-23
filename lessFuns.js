
var Math$1 = {
    ALWAYS: 0,
    PARENS_DIVISION: 1,
    PARENS: 2
    // removed - STRICT_LEGACY: 3
};
var MATH$1 = Math$1;
function evalName(context, name) {
    var value = '';
    var i;
    var n = name.length;
    var output = { add: function (s) { value += s; } };
    for (i = 0; i < n; i++) {
        name[i].eval(context).genCSS(context, output);
    }
    return value;
}

var Node = /** @class */ (function () {
    function Node() {
        this.parent = null;
        this.visibilityBlocks = undefined;
        this.nodeVisible = undefined;
        this.rootNode = null;
        this.parsed = null;
    }
    Object.defineProperty(Node.prototype, "currentFileInfo", {
        get: function () {
            return this.fileInfo();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "index", {
        get: function () {
            return this.getIndex();
        },
        enumerable: false,
        configurable: true
    });
    Node.prototype.setParent = function (nodes, parent) {
        function set(node) {
            if (node && node instanceof Node) {
                node.parent = parent;
            }
        }
        if (Array.isArray(nodes)) {
            nodes.forEach(set);
        }
        else {
            set(nodes);
        }
    };
    Node.prototype.getIndex = function () {
        return this._index || (this.parent && this.parent.getIndex()) || 0;
    };
    Node.prototype.fileInfo = function () {
        return this._fileInfo || (this.parent && this.parent.fileInfo()) || {};
    };
    Node.prototype.isRulesetLike = function () { return false; };
    Node.prototype.toCSS = function (context) {
        var strs = [];
        this.genCSS(context, {
            // remove when genCSS has JSDoc types
            // eslint-disable-next-line no-unused-vars
            add: function (chunk, fileInfo, index) {
                strs.push(chunk);
            },
            isEmpty: function () {
                return strs.length === 0;
            }
        });
        return strs.join('');
    };
    Node.prototype.genCSS = function (context, output) {
        output.add(this.value);
    };
    Node.prototype.accept = function (visitor) {
        this.value = visitor.visit(this.value);
    };
    Node.prototype.eval = function () { return this; };
    Node.prototype._operate = function (context, op, a, b) {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
        }
    };
    Node.prototype.fround = function (context, value) {
        var precision = context && context.numPrecision;
        // add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999...) are properly rounded:
        return (precision) ? Number((value + 2e-16).toFixed(precision)) : value;
    };
    Node.compare = function (a, b) {
        /* returns:
         -1: a < b
         0: a = b
         1: a > b
         and *any* other value for a != b (e.g. undefined, NaN, -2 etc.) */
        if ((a.compare) &&
            // for "symmetric results" force toCSS-based comparison
            // of Quoted or Anonymous if either value is one of those
            !(b.type === 'Quoted' || b.type === 'Anonymous')) {
            return a.compare(b);
        }
        else if (b.compare) {
            return -b.compare(a);
        }
        else if (a.type !== b.type) {
            return undefined;
        }
        a = a.value;
        b = b.value;
        if (!Array.isArray(a)) {
            return a === b ? 0 : undefined;
        }
        if (a.length !== b.length) {
            return undefined;
        }
        for (var i_1 = 0; i_1 < a.length; i_1++) {
            if (Node.compare(a[i_1], b[i_1]) !== 0) {
                return undefined;
            }
        }
        return 0;
    };
    Node.numericCompare = function (a, b) {
        return a < b ? -1
            : a === b ? 0
                : a > b ? 1 : undefined;
    };
    // Returns true if this node represents root of ast imported by reference
    Node.prototype.blocksVisibility = function () {
        if (this.visibilityBlocks === undefined) {
            this.visibilityBlocks = 0;
        }
        return this.visibilityBlocks !== 0;
    };
    Node.prototype.addVisibilityBlock = function () {
        if (this.visibilityBlocks === undefined) {
            this.visibilityBlocks = 0;
        }
        this.visibilityBlocks = this.visibilityBlocks + 1;
    };
    Node.prototype.removeVisibilityBlock = function () {
        if (this.visibilityBlocks === undefined) {
            this.visibilityBlocks = 0;
        }
        this.visibilityBlocks = this.visibilityBlocks - 1;
    };
    // Turns on node visibility - if called node will be shown in output regardless
    // of whether it comes from import by reference or not
    Node.prototype.ensureVisibility = function () {
        this.nodeVisible = true;
    };
    // Turns off node visibility - if called node will NOT be shown in output regardless
    // of whether it comes from import by reference or not
    Node.prototype.ensureInvisibility = function () {
        this.nodeVisible = false;
    };
    // return values:
    // false - the node must not be visible
    // true - the node must be visible
    // undefined or null - the node has the same visibility as its parent
    Node.prototype.isVisible = function () {
        return this.nodeVisible;
    };
    Node.prototype.visibilityInfo = function () {
        return {
            visibilityBlocks: this.visibilityBlocks,
            nodeVisible: this.nodeVisible
        };
    };
    Node.prototype.copyVisibilityInfo = function (info) {
        if (!info) {
            return;
        }
        this.visibilityBlocks = info.visibilityBlocks;
        this.nodeVisible = info.nodeVisible;
    };
    return Node;
}());

var Value = function (value) {
    if (!value) {
        throw new Error('Value requires an array argument');
    }
    if (!Array.isArray(value)) {
        this.value = [value];
    }
    else {
        this.value = value;
    }
};
Value.prototype = Object.assign(new Node(), {
    type: 'Value',
    accept: function (visitor) {
        if (this.value) {
            this.value = visitor.visitArray(this.value);
        }
    },
    eval: function (context) {
        if (this.value.length === 1) {
            return this.value[0].eval(context);
        }
        else {
            return new Value(this.value.map(function (v) {
                return v.eval(context);
            }));
        }
    },
    genCSS: function (context, output) {
        var i;
        for (i = 0; i < this.value.length; i++) {
            this.value[i].genCSS(context, output);
            if (i + 1 < this.value.length) {
                output.add((context && context.compress) ? ',' : ', ');
            }
        }
    }
});

var Keyword = function (value) {
    this.value = value;
};
Keyword.prototype = Object.assign(new Node(), {
    type: 'Keyword',
    genCSS: function (context, output) {
        if (this.value === '%') {
            throw { type: 'Syntax', message: 'Invalid % without number' };
        }
        output.add(this.value);
    }
});
Keyword.True = new Keyword('true');
Keyword.False = new Keyword('false');

var Anonymous = function (value, index, currentFileInfo, mapLines, rulesetLike, visibilityInfo) {
    this.value = value;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.mapLines = mapLines;
    this.rulesetLike = (typeof rulesetLike === 'undefined') ? false : rulesetLike;
    this.allowRoot = true;
    this.copyVisibilityInfo(visibilityInfo);
};
Anonymous.prototype = Object.assign(new Node(), {
    type: 'Anonymous',
    eval: function () {
        return new Anonymous(this.value, this._index, this._fileInfo, this.mapLines, this.rulesetLike, this.visibilityInfo());
    },
    compare: function (other) {
        return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
    },
    isRulesetLike: function () {
        return this.rulesetLike;
    },
    genCSS: function (context, output) {
        this.nodeVisible = Boolean(this.value);
        if (this.nodeVisible) {
            output.add(this.value, this._fileInfo, this._index, this.mapLines);
        }
    }
});

var colors = {
    'aliceblue': '#f0f8ff',
    'antiquewhite': '#faebd7',
    'aqua': '#00ffff',
    'aquamarine': '#7fffd4',
    'azure': '#f0ffff',
    'beige': '#f5f5dc',
    'bisque': '#ffe4c4',
    'black': '#000000',
    'blanchedalmond': '#ffebcd',
    'blue': '#0000ff',
    'blueviolet': '#8a2be2',
    'brown': '#a52a2a',
    'burlywood': '#deb887',
    'cadetblue': '#5f9ea0',
    'chartreuse': '#7fff00',
    'chocolate': '#d2691e',
    'coral': '#ff7f50',
    'cornflowerblue': '#6495ed',
    'cornsilk': '#fff8dc',
    'crimson': '#dc143c',
    'cyan': '#00ffff',
    'darkblue': '#00008b',
    'darkcyan': '#008b8b',
    'darkgoldenrod': '#b8860b',
    'darkgray': '#a9a9a9',
    'darkgrey': '#a9a9a9',
    'darkgreen': '#006400',
    'darkkhaki': '#bdb76b',
    'darkmagenta': '#8b008b',
    'darkolivegreen': '#556b2f',
    'darkorange': '#ff8c00',
    'darkorchid': '#9932cc',
    'darkred': '#8b0000',
    'darksalmon': '#e9967a',
    'darkseagreen': '#8fbc8f',
    'darkslateblue': '#483d8b',
    'darkslategray': '#2f4f4f',
    'darkslategrey': '#2f4f4f',
    'darkturquoise': '#00ced1',
    'darkviolet': '#9400d3',
    'deeppink': '#ff1493',
    'deepskyblue': '#00bfff',
    'dimgray': '#696969',
    'dimgrey': '#696969',
    'dodgerblue': '#1e90ff',
    'firebrick': '#b22222',
    'floralwhite': '#fffaf0',
    'forestgreen': '#228b22',
    'fuchsia': '#ff00ff',
    'gainsboro': '#dcdcdc',
    'ghostwhite': '#f8f8ff',
    'gold': '#ffd700',
    'goldenrod': '#daa520',
    'gray': '#808080',
    'grey': '#808080',
    'green': '#008000',
    'greenyellow': '#adff2f',
    'honeydew': '#f0fff0',
    'hotpink': '#ff69b4',
    'indianred': '#cd5c5c',
    'indigo': '#4b0082',
    'ivory': '#fffff0',
    'khaki': '#f0e68c',
    'lavender': '#e6e6fa',
    'lavenderblush': '#fff0f5',
    'lawngreen': '#7cfc00',
    'lemonchiffon': '#fffacd',
    'lightblue': '#add8e6',
    'lightcoral': '#f08080',
    'lightcyan': '#e0ffff',
    'lightgoldenrodyellow': '#fafad2',
    'lightgray': '#d3d3d3',
    'lightgrey': '#d3d3d3',
    'lightgreen': '#90ee90',
    'lightpink': '#ffb6c1',
    'lightsalmon': '#ffa07a',
    'lightseagreen': '#20b2aa',
    'lightskyblue': '#87cefa',
    'lightslategray': '#778899',
    'lightslategrey': '#778899',
    'lightsteelblue': '#b0c4de',
    'lightyellow': '#ffffe0',
    'lime': '#00ff00',
    'limegreen': '#32cd32',
    'linen': '#faf0e6',
    'magenta': '#ff00ff',
    'maroon': '#800000',
    'mediumaquamarine': '#66cdaa',
    'mediumblue': '#0000cd',
    'mediumorchid': '#ba55d3',
    'mediumpurple': '#9370d8',
    'mediumseagreen': '#3cb371',
    'mediumslateblue': '#7b68ee',
    'mediumspringgreen': '#00fa9a',
    'mediumturquoise': '#48d1cc',
    'mediumvioletred': '#c71585',
    'midnightblue': '#191970',
    'mintcream': '#f5fffa',
    'mistyrose': '#ffe4e1',
    'moccasin': '#ffe4b5',
    'navajowhite': '#ffdead',
    'navy': '#000080',
    'oldlace': '#fdf5e6',
    'olive': '#808000',
    'olivedrab': '#6b8e23',
    'orange': '#ffa500',
    'orangered': '#ff4500',
    'orchid': '#da70d6',
    'palegoldenrod': '#eee8aa',
    'palegreen': '#98fb98',
    'paleturquoise': '#afeeee',
    'palevioletred': '#d87093',
    'papayawhip': '#ffefd5',
    'peachpuff': '#ffdab9',
    'peru': '#cd853f',
    'pink': '#ffc0cb',
    'plum': '#dda0dd',
    'powderblue': '#b0e0e6',
    'purple': '#800080',
    'rebeccapurple': '#663399',
    'red': '#ff0000',
    'rosybrown': '#bc8f8f',
    'royalblue': '#4169e1',
    'saddlebrown': '#8b4513',
    'salmon': '#fa8072',
    'sandybrown': '#f4a460',
    'seagreen': '#2e8b57',
    'seashell': '#fff5ee',
    'sienna': '#a0522d',
    'silver': '#c0c0c0',
    'skyblue': '#87ceeb',
    'slateblue': '#6a5acd',
    'slategray': '#708090',
    'slategrey': '#708090',
    'snow': '#fffafa',
    'springgreen': '#00ff7f',
    'steelblue': '#4682b4',
    'tan': '#d2b48c',
    'teal': '#008080',
    'thistle': '#d8bfd8',
    'tomato': '#ff6347',
    'turquoise': '#40e0d0',
    'violet': '#ee82ee',
    'wheat': '#f5deb3',
    'white': '#ffffff',
    'whitesmoke': '#f5f5f5',
    'yellow': '#ffff00',
    'yellowgreen': '#9acd32'
};

var functionCaller = /** @class */ (function () {
    function functionCaller(name, context, index, currentFileInfo) {
        this.name = name.toLowerCase();
        this.index = index;
        this.context = context;
        this.currentFileInfo = currentFileInfo;
        this.func = context.frames[0].functionRegistry.get(this.name);
    }
    functionCaller.prototype.isValid = function () {
        return Boolean(this.func);
    };
    functionCaller.prototype.call = function (args) {
        var _this = this;
        if (!(Array.isArray(args))) {
            args = [args];
        }
        var evalArgs = this.func.evalArgs;
        if (evalArgs !== false) {
            args = args.map(function (a) { return a.eval(_this.context); });
        }
        var commentFilter = function (item) { return !(item.type === 'Comment'); };
        // This code is terrible and should be replaced as per this issue...
        // https://github.com/less/less.js/issues/2477
        args = args
            .filter(commentFilter)
            .map(function (item) {
            if (item.type === 'Expression') {
                var subNodes = item.value.filter(commentFilter);
                if (subNodes.length === 1) {
                    // https://github.com/less/less.js/issues/3616
                    if (item.parens && subNodes[0].op === '/') {
                        return item;
                    }
                    return subNodes[0];
                }
                else {
                    return new Expression(subNodes);
                }
            }
            return item;
        });
        if (evalArgs === false) {
            return this.func.apply(this, __spreadArray([this.context], args));
        }
        return this.func.apply(this, args);
    };
    return functionCaller;
}());

var Call = function (name, args, index, currentFileInfo) {
    this.name = name;
    this.args = args;
    this.calc = name === 'calc';
    this._index = index;
    this._fileInfo = currentFileInfo;
};
Call.prototype = Object.assign(new Node(), {
    type: 'Call',
    accept: function (visitor) {
        if (this.args) {
            this.args = visitor.visitArray(this.args);
        }
    },
    //
    // When evaluating a function call,
    // we either find the function in the functionRegistry,
    // in which case we call it, passing the  evaluated arguments,
    // if this returns null or we cannot find the function, we
    // simply print it out as it appeared originally [2].
    //
    // The reason why we evaluate the arguments, is in the case where
    // we try to pass a variable to a function, like: `saturate(@color)`.
    // The function should receive the value, not the variable.
    //
    eval: function (context) {
        var _this = this;
        /**
         * Turn off math for calc(), and switch back on for evaluating nested functions
         */
        var currentMathContext = context.mathOn;
        context.mathOn = !this.calc;
        if (this.calc || context.inCalc) {
            context.enterCalc();
        }
        var exitCalc = function () {
            if (_this.calc || context.inCalc) {
                context.exitCalc();
            }
            context.mathOn = currentMathContext;
        };
        var result;
        var funcCaller = new functionCaller(this.name, context, this.getIndex(), this.fileInfo());
        if (funcCaller.isValid()) {
            try {
                result = funcCaller.call(this.args);
                exitCalc();
            }
            catch (e) {
                // eslint-disable-next-line no-prototype-builtins
                if (e.hasOwnProperty('line') && e.hasOwnProperty('column')) {
                    throw e;
                }
                throw {
                    type: e.type || 'Runtime',
                    message: "Error evaluating function `" + this.name + "`" + (e.message ? ": " + e.message : ''),
                    index: this.getIndex(),
                    filename: this.fileInfo().filename,
                    line: e.lineNumber,
                    column: e.columnNumber
                };
            }
        }
        if (result !== null && result !== undefined) {
            // Results that that are not nodes are cast as Anonymous nodes
            // Falsy values or booleans are returned as empty nodes
            if (!(result instanceof Node)) {
                if (!result || result === true) {
                    result = new Anonymous(null);
                }
                else {
                    result = new Anonymous(result.toString());
                }
            }
            result._index = this._index;
            result._fileInfo = this._fileInfo;
            return result;
        }
        var args = this.args.map(function (a) { return a.eval(context); });
        exitCalc();
        return new Call(this.name, args, this.getIndex(), this.fileInfo());
    },
    genCSS: function (context, output) {
        output.add(this.name + "(", this.fileInfo(), this.getIndex());
        for (var i_1 = 0; i_1 < this.args.length; i_1++) {
            this.args[i_1].genCSS(context, output);
            if (i_1 + 1 < this.args.length) {
                output.add(', ');
            }
        }
        output.add(')');
    }
});

var Variable = function (name, index, currentFileInfo) {
    this.name = name;
    this._index = index;
    this._fileInfo = currentFileInfo;
};
Variable.prototype = Object.assign(new Node(), {
    type: 'Variable',
    eval: function (context) {
        var variable, name = this.name;
        if (name.indexOf('@@') === 0) {
            name = "@" + new Variable(name.slice(1), this.getIndex(), this.fileInfo()).eval(context).value;
        }
        if (this.evaluating) {
            throw { type: 'Name',
                message: "Recursive variable definition for " + name,
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }
        this.evaluating = true;
        variable = this.find(context.frames, function (frame) {
            var v = frame.variable(name);
            if (v) {
                if (v.important) {
                    var importantScope = context.importantScope[context.importantScope.length - 1];
                    importantScope.important = v.important;
                }
                // If in calc, wrap vars in a function call to cascade evaluate args first
                if (context.inCalc) {
                    return (new Call('_SELF', [v.value])).eval(context);
                }
                else {
                    return v.value.eval(context);
                }
            }
        });
        if (variable) {
            this.evaluating = false;
            return variable;
        }
        else {
            throw { type: 'Name',
                message: "variable " + name + " is undefined",
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }
    },
    find: function (obj, fun) {
        for (var i_1 = 0, r = void 0; i_1 < obj.length; i_1++) {
            r = fun.call(obj, obj[i_1]);
            if (r) {
                return r;
            }
        }
        return null;
    }
});

var Declaration = function (name, value, important, merge, index, currentFileInfo, inline, variable) {
    this.name = name;
    this.value = (value instanceof Node) ? value : new Value([value ? new Anonymous(value) : null]);
    this.important = important ? " " + important.trim() : '';
    this.merge = merge;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.inline = inline || false;
    this.variable = (variable !== undefined) ? variable
        : (name.charAt && (name.charAt(0) === '@'));
    this.allowRoot = true;
    this.setParent(this.value, this);
};
Declaration.prototype = Object.assign(new Node(), {
    type: 'Declaration',
    genCSS: function (context, output) {
        output.add(this.name + (context.compress ? ':' : ': '), this.fileInfo(), this.getIndex());
        try {
            this.value.genCSS(context, output);
        }
        catch (e) {
            e.index = this._index;
            e.filename = this._fileInfo.filename;
            throw e;
        }
        output.add(this.important + ((this.inline || (context.lastRule && context.compress)) ? '' : ';'), this._fileInfo, this._index);
    },
    eval: function (context) {
        var mathBypass = false, prevMath, name = this.name, evaldValue, variable = this.variable;
        if (typeof name !== 'string') {
            // expand 'primitive' name directly to get
            // things faster (~10% for benchmark.less):
            name = (name.length === 1) && (name[0] instanceof Keyword) ?
                name[0].value : evalName(context, name);
            variable = false; // never treat expanded interpolation as new variable name
        }
        // @todo remove when parens-division is default
        if (name === 'font' && context.math === MATH$1.ALWAYS) {
            mathBypass = true;
            prevMath = context.math;
            context.math = MATH$1.PARENS_DIVISION;
        }
        try {
            context.importantScope.push({});
            evaldValue = this.value.eval(context);
            if (!this.variable && evaldValue.type === 'DetachedRuleset') {
                throw { message: 'Rulesets cannot be evaluated on a property.',
                    index: this.getIndex(), filename: this.fileInfo().filename };
            }
            var important = this.important;
            var importantResult = context.importantScope.pop();
            if (!important && importantResult.important) {
                important = importantResult.important;
            }
            return new Declaration(name, evaldValue, important, this.merge, this.getIndex(), this.fileInfo(), this.inline, variable);
        }
        catch (e) {
            if (typeof e.index !== 'number') {
                e.index = this.getIndex();
                e.filename = this.fileInfo().filename;
            }
            throw e;
        }
        finally {
            if (mathBypass) {
                context.math = prevMath;
            }
        }
    },
    makeImportant: function () {
        return new Declaration(this.name, this.value, '!important', this.merge, this.getIndex(), this.fileInfo(), this.inline);
    }
});

var Property = function (name, index, currentFileInfo) {
    this.name = name;
    this._index = index;
    this._fileInfo = currentFileInfo;
};
Property.prototype = Object.assign(new Node(), {
    type: 'Property',
    eval: function (context) {
        var property;
        var name = this.name;
        // TODO: shorten this reference
        var mergeRules = context.pluginManager.less.visitors.ToCSSVisitor.prototype._mergeRules;
        if (this.evaluating) {
            throw { type: 'Name',
                message: "Recursive property reference for " + name,
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }
        this.evaluating = true;
        property = this.find(context.frames, function (frame) {
            var v;
            var vArr = frame.property(name);
            if (vArr) {
                for (var i_1 = 0; i_1 < vArr.length; i_1++) {
                    v = vArr[i_1];
                    vArr[i_1] = new Declaration(v.name, v.value, v.important, v.merge, v.index, v.currentFileInfo, v.inline, v.variable);
                }
                mergeRules(vArr);
                v = vArr[vArr.length - 1];
                if (v.important) {
                    var importantScope = context.importantScope[context.importantScope.length - 1];
                    importantScope.important = v.important;
                }
                v = v.value.eval(context);
                return v;
            }
        });
        if (property) {
            this.evaluating = false;
            return property;
        }
        else {
            throw { type: 'Name',
                message: "Property '" + name + "' is undefined",
                filename: this.currentFileInfo.filename,
                index: this.index };
        }
    },
    find: function (obj, fun) {
        for (var i_2 = 0, r = void 0; i_2 < obj.length; i_2++) {
            r = fun.call(obj, obj[i_2]);
            if (r) {
                return r;
            }
        }
        return null;
    }
});

var Quoted = function (str, content, escaped, index, currentFileInfo) {
    this.escaped = (escaped === undefined) ? true : escaped;
    this.value = content || '';
    this.quote = str.charAt(0);
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.variableRegex = /@\{([\w-]+)\}/g;
    this.propRegex = /\$\{([\w-]+)\}/g;
    this.allowRoot = escaped;
};
Quoted.prototype = Object.assign(new Node(), {
    type: 'Quoted',
    genCSS: function (context, output) {
        if (!this.escaped) {
            output.add(this.quote, this.fileInfo(), this.getIndex());
        }
        output.add(this.value);
        if (!this.escaped) {
            output.add(this.quote);
        }
    },
    containsVariables: function () {
        return this.value.match(this.variableRegex);
    },
    eval: function (context) {
        var that = this;
        var value = this.value;
        var variableReplacement = function (_, name) {
            var v = new Variable("@" + name, that.getIndex(), that.fileInfo()).eval(context, true);
            return (v instanceof Quoted) ? v.value : v.toCSS();
        };
        var propertyReplacement = function (_, name) {
            var v = new Property("$" + name, that.getIndex(), that.fileInfo()).eval(context, true);
            return (v instanceof Quoted) ? v.value : v.toCSS();
        };
        function iterativeReplace(value, regexp, replacementFnc) {
            var evaluatedValue = value;
            do {
                value = evaluatedValue.toString();
                evaluatedValue = value.replace(regexp, replacementFnc);
            } while (value !== evaluatedValue);
            return evaluatedValue;
        }
        value = iterativeReplace(value, this.variableRegex, variableReplacement);
        value = iterativeReplace(value, this.propRegex, propertyReplacement);
        return new Quoted(this.quote + value + this.quote, value, this.escaped, this.getIndex(), this.fileInfo());
    },
    compare: function (other) {
        // when comparing quoted strings allow the quote to differ
        if (other.type === 'Quoted' && !this.escaped && !other.escaped) {
            return Node.numericCompare(this.value, other.value);
        }
        else {
            return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
        }
    }
});

var Unit = function (numerator, denominator, backupUnit) {
    this.numerator = numerator ? copyArray(numerator).sort() : [];
    this.denominator = denominator ? copyArray(denominator).sort() : [];
    if (backupUnit) {
        this.backupUnit = backupUnit;
    }
    else if (numerator && numerator.length) {
        this.backupUnit = numerator[0];
    }
};
Unit.prototype = Object.assign(new Node(), {
    type: 'Unit',
    clone: function () {
        return new Unit(copyArray(this.numerator), copyArray(this.denominator), this.backupUnit);
    },
    genCSS: function (context, output) {
        // Dimension checks the unit is singular and throws an error if in strict math mode.
        var strictUnits = context && context.strictUnits;
        if (this.numerator.length === 1) {
            output.add(this.numerator[0]); // the ideal situation
        }
        else if (!strictUnits && this.backupUnit) {
            output.add(this.backupUnit);
        }
        else if (!strictUnits && this.denominator.length) {
            output.add(this.denominator[0]);
        }
    },
    toString: function () {
        var i, returnStr = this.numerator.join('*');
        for (i = 0; i < this.denominator.length; i++) {
            returnStr += "/" + this.denominator[i];
        }
        return returnStr;
    },
    compare: function (other) {
        return this.is(other.toString()) ? 0 : undefined;
    },
    is: function (unitString) {
        return this.toString().toUpperCase() === unitString.toUpperCase();
    },
    isLength: function () {
        return RegExp('^(px|em|ex|ch|rem|in|cm|mm|pc|pt|ex|vw|vh|vmin|vmax)$', 'gi').test(this.toCSS());
    },
    isEmpty: function () {
        return this.numerator.length === 0 && this.denominator.length === 0;
    },
    isSingular: function () {
        return this.numerator.length <= 1 && this.denominator.length === 0;
    },
    map: function (callback) {
        var i;
        for (i = 0; i < this.numerator.length; i++) {
            this.numerator[i] = callback(this.numerator[i], false);
        }
        for (i = 0; i < this.denominator.length; i++) {
            this.denominator[i] = callback(this.denominator[i], true);
        }
    },
    usedUnits: function () {
        var group;
        var result = {};
        var mapUnit;
        var groupName;
        mapUnit = function (atomicUnit) {
            // eslint-disable-next-line no-prototype-builtins
            if (group.hasOwnProperty(atomicUnit) && !result[groupName]) {
                result[groupName] = atomicUnit;
            }
            return atomicUnit;
        };
        for (groupName in unitConversions) {
            // eslint-disable-next-line no-prototype-builtins
            if (unitConversions.hasOwnProperty(groupName)) {
                group = unitConversions[groupName];
                this.map(mapUnit);
            }
        }
        return result;
    },
    cancel: function () {
        var counter = {};
        var atomicUnit;
        var i;
        for (i = 0; i < this.numerator.length; i++) {
            atomicUnit = this.numerator[i];
            counter[atomicUnit] = (counter[atomicUnit] || 0) + 1;
        }
        for (i = 0; i < this.denominator.length; i++) {
            atomicUnit = this.denominator[i];
            counter[atomicUnit] = (counter[atomicUnit] || 0) - 1;
        }
        this.numerator = [];
        this.denominator = [];
        for (atomicUnit in counter) {
            // eslint-disable-next-line no-prototype-builtins
            if (counter.hasOwnProperty(atomicUnit)) {
                var count = counter[atomicUnit];
                if (count > 0) {
                    for (i = 0; i < count; i++) {
                        this.numerator.push(atomicUnit);
                    }
                }
                else if (count < 0) {
                    for (i = 0; i < -count; i++) {
                        this.denominator.push(atomicUnit);
                    }
                }
            }
        }
        this.numerator.sort();
        this.denominator.sort();
    }
});

var Dimension = function (value, unit) {
    this.value = parseFloat(value);
    if (isNaN(this.value)) {
        throw new Error('Dimension is not a number.');
    }
    this.unit = (unit && unit instanceof Unit) ? unit :
        new Unit(unit ? [unit] : undefined);
    this.setParent(this.unit, this);
};

Dimension.prototype = Object.assign(new Node(), {
    type: 'Dimension',
    accept: function (visitor) {
        this.unit = visitor.visit(this.unit);
    },
    // remove when Nodes have JSDoc types
    // eslint-disable-next-line no-unused-vars
    eval: function (context) {
        return this;
    },
    toColor: function () {
        return new Color([this.value, this.value, this.value]);
    },
    genCSS: function (context, output) {
        if ((context && context.strictUnits) && !this.unit.isSingular()) {
            throw new Error("Multiple units in dimension. Correct the units or use the unit function. Bad unit: " + this.unit.toString());
        }
        var value = this.fround(context, this.value);
        var strValue = String(value);
        if (value !== 0 && value < 0.000001 && value > -0.000001) {
            // would be output 1e-6 etc.
            strValue = value.toFixed(20).replace(/0+$/, '');
        }
        if (context && context.compress) {
            // Zero values doesn't need a unit
            if (value === 0 && this.unit.isLength()) {
                output.add(strValue);
                return;
            }
            // Float values doesn't need a leading zero
            if (value > 0 && value < 1) {
                strValue = (strValue).substr(1);
            }
        }
        output.add(strValue);
        this.unit.genCSS(context, output);
    },
    // In an operation between two Dimensions,
    // we default to the first Dimension's unit,
    // so `1px + 2` will yield `3px`.
    operate: function (context, op, other) {
        /* jshint noempty:false */
        var value = this._operate(context, op, this.value, other.value);
        var unit = this.unit.clone();
        if (op === '+' || op === '-') {
            if (unit.numerator.length === 0 && unit.denominator.length === 0) {
                unit = other.unit.clone();
                if (this.unit.backupUnit) {
                    unit.backupUnit = this.unit.backupUnit;
                }
            }
            else if (other.unit.numerator.length === 0 && unit.denominator.length === 0);
            else {
                other = other.convertTo(this.unit.usedUnits());
                if (context.strictUnits && other.unit.toString() !== unit.toString()) {
                    throw new Error('Incompatible units. Change the units or use the unit function. '
                        + ("Bad units: '" + unit.toString() + "' and '" + other.unit.toString() + "'."));
                }
                value = this._operate(context, op, this.value, other.value);
            }
        }
        else if (op === '*') {
            unit.numerator = unit.numerator.concat(other.unit.numerator).sort();
            unit.denominator = unit.denominator.concat(other.unit.denominator).sort();
            unit.cancel();
        }
        else if (op === '/') {
            unit.numerator = unit.numerator.concat(other.unit.denominator).sort();
            unit.denominator = unit.denominator.concat(other.unit.numerator).sort();
            unit.cancel();
        }
        return new Dimension(value, unit);
    },
    compare: function (other) {
        var a, b;
        if (!(other instanceof Dimension)) {
            return undefined;
        }
        if (this.unit.isEmpty() || other.unit.isEmpty()) {
            a = this;
            b = other;
        }
        else {
            a = this.unify();
            b = other.unify();
            if (a.unit.compare(b.unit) !== 0) {
                return undefined;
            }
        }
        return Node.numericCompare(a.value, b.value);
    },
    unify: function () {
        return this.convertTo({ length: 'px', duration: 's', angle: 'rad' });
    },
    convertTo: function (conversions) {
        var value = this.value;
        var unit = this.unit.clone();
        var i;
        var groupName;
        var group;
        var targetUnit;
        var derivedConversions = {};
        var applyUnit;
        if (typeof conversions === 'string') {
            for (i in unitConversions) {
                if (unitConversions[i].hasOwnProperty(conversions)) {
                    derivedConversions = {};
                    derivedConversions[i] = conversions;
                }
            }
            conversions = derivedConversions;
        }
        applyUnit = function (atomicUnit, denominator) {
            if (group.hasOwnProperty(atomicUnit)) {
                if (denominator) {
                    value = value / (group[atomicUnit] / group[targetUnit]);
                }
                else {
                    value = value * (group[atomicUnit] / group[targetUnit]);
                }
                return targetUnit;
            }
            return atomicUnit;
        };
        for (groupName in conversions) {
            if (conversions.hasOwnProperty(groupName)) {
                targetUnit = conversions[groupName];
                group = unitConversions[groupName];
                unit.map(applyUnit);
            }
        }
        unit.cancel();
        return new Dimension(value, unit);
    }
});

var Paren = function (node) {
    this.value = node;
};
Paren.prototype = Object.assign(new Node(), {
    type: 'Paren',
    genCSS: function (context, output) {
        output.add('(');
        this.value.genCSS(context, output);
        output.add(')');
    },
    eval: function (context) {
        return new Paren(this.value.eval(context));
    }
});


var Color = function (rgb, a, originalForm) {
    var self = this;
    //
    // The end goal here, is to parse the arguments
    // into an integer triplet, such as `128, 255, 0`
    //
    // This facilitates operations and conversions.
    //
    if (Array.isArray(rgb)) {
        this.rgb = rgb;
    }
    else if (rgb.length >= 6) {
        this.rgb = [];
        rgb.match(/.{2}/g).map(function (c, i) {
            if (i < 3) {
                self.rgb.push(parseInt(c, 16));
            }
            else {
                self.alpha = (parseInt(c, 16)) / 255;
            }
        });
    }
    else {
        this.rgb = [];
        rgb.split('').map(function (c, i) {
            if (i < 3) {
                self.rgb.push(parseInt(c + c, 16));
            }
            else {
                self.alpha = (parseInt(c + c, 16)) / 255;
            }
        });
    }
    this.alpha = this.alpha || (typeof a === 'number' ? a : 1);
    if (typeof originalForm !== 'undefined') {
        this.value = originalForm;
    }
};
Color.prototype = Object.assign(new Node(), {
    type: 'Color',
    luma: function () {
        var r = this.rgb[0] / 255, g = this.rgb[1] / 255, b = this.rgb[2] / 255;
        r = (r <= 0.03928) ? r / 12.92 : Math.pow(((r + 0.055) / 1.055), 2.4);
        g = (g <= 0.03928) ? g / 12.92 : Math.pow(((g + 0.055) / 1.055), 2.4);
        b = (b <= 0.03928) ? b / 12.92 : Math.pow(((b + 0.055) / 1.055), 2.4);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },
    genCSS: function (context, output) {
        output.add(this.toCSS(context));
    },
    toCSS: function (context, doNotCompress) {
        var compress = context && context.compress && !doNotCompress;
        var color;
        var alpha;
        var colorFunction;
        var args = [];
        // `value` is set if this color was originally
        // converted from a named color string so we need
        // to respect this and try to output named color too.
        alpha = this.fround(context, this.alpha);
        if (this.value) {
            if (this.value.indexOf('rgb') === 0) {
                if (alpha < 1) {
                    colorFunction = 'rgba';
                }
            }
            else if (this.value.indexOf('hsl') === 0) {
                if (alpha < 1) {
                    colorFunction = 'hsla';
                }
                else {
                    colorFunction = 'hsl';
                }
            }
            else {
                return this.value;
            }
        }
        else {
            if (alpha < 1) {
                colorFunction = 'rgba';
            }
        }
        switch (colorFunction) {
            case 'rgba':
                args = this.rgb.map(function (c) {
                    return clamp$1(Math.round(c), 255);
                }).concat(clamp$1(alpha, 1));
                break;
            case 'hsla':
                args.push(clamp$1(alpha, 1));
            // eslint-disable-next-line no-fallthrough
            case 'hsl':
                color = this.toHSL();
                args = [
                    this.fround(context, color.h),
                    this.fround(context, color.s * 100) + "%",
                    this.fround(context, color.l * 100) + "%"
                ].concat(args);
        }
        if (colorFunction) {
            // Values are capped between `0` and `255`, rounded and zero-padded.
            return colorFunction + "(" + args.join("," + (compress ? '' : ' ')) + ")";
        }
        color = this.toRGB();
        if (compress) {
            var splitcolor = color.split('');
            // Convert color to short format
            if (splitcolor[1] === splitcolor[2] && splitcolor[3] === splitcolor[4] && splitcolor[5] === splitcolor[6]) {
                color = "#" + splitcolor[1] + splitcolor[3] + splitcolor[5];
            }
        }
        return color;
    },
    //
    // Operations have to be done per-channel, if not,
    // channels will spill onto each other. Once we have
    // our result, in the form of an integer triplet,
    // we create a new Color node to hold the result.
    //
    operate: function (context, op, other) {
        var rgb = new Array(3);
        var alpha = this.alpha * (1 - other.alpha) + other.alpha;
        for (var c = 0; c < 3; c++) {
            rgb[c] = this._operate(context, op, this.rgb[c], other.rgb[c]);
        }
        return new Color(rgb, alpha);
    },
    toRGB: function () {
        return toHex(this.rgb);
    },
    toHSL: function () {
        var r = this.rgb[0] / 255, g = this.rgb[1] / 255, b = this.rgb[2] / 255, a = this.alpha;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h;
        var s;
        var l = (max + min) / 2;
        var d = max - min;
        if (max === min) {
            h = s = 0;
        }
        else {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s, l: l, a: a };
    },
    // Adapted from http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    toHSV: function () {
        var r = this.rgb[0] / 255, g = this.rgb[1] / 255, b = this.rgb[2] / 255, a = this.alpha;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h;
        var s;
        var v = max;
        var d = max - min;
        if (max === 0) {
            s = 0;
        }
        else {
            s = d / max;
        }
        if (max === min) {
            h = 0;
        }
        else {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s, v: v, a: a };
    },
    toARGB: function () {
        return toHex([this.alpha * 255].concat(this.rgb));
    },
    compare: function (x) {
        return (x.rgb &&
            x.rgb[0] === this.rgb[0] &&
            x.rgb[1] === this.rgb[1] &&
            x.rgb[2] === this.rgb[2] &&
            x.alpha === this.alpha) ? 0 : undefined;
    }
});
Color.fromKeyword = function (keyword) {
    var c;
    var key = keyword.toLowerCase();
    // eslint-disable-next-line no-prototype-builtins
    if (colors.hasOwnProperty(key)) {
        c = new Color(colors[key].slice(1));
    }
    else if (key === 'transparent') {
        c = new Color([0, 0, 0], 0);
    }
    if (c) {
        c.value = keyword;
        return c;
    }
};

var MATH = Math$1;

var Operation = function (op, operands, isSpaced) {
    this.op = op.trim();
    this.operands = operands;
    this.isSpaced = isSpaced;
};
Operation.prototype = Object.assign(new Node(), {
    type: 'Operation',
    accept: function (visitor) {
        this.operands = visitor.visitArray(this.operands);
    },
    eval: function (context) {
        var a = this.operands[0].eval(context), b = this.operands[1].eval(context), op;
        if (context.isMathOn(this.op)) {
            op = this.op === './' ? '/' : this.op;
            if (a instanceof Dimension && b instanceof Color) {
                a = a.toColor();
            }
            if (b instanceof Dimension && a instanceof Color) {
                b = b.toColor();
            }
            if (!a.operate || !b.operate) {
                if ((a instanceof Operation || b instanceof Operation)
                    && a.op === '/' && context.math === MATH.PARENS_DIVISION) {
                    return new Operation(this.op, [a, b], this.isSpaced);
                }
                throw {
                    type: 'Operation',
                    message: 'Operation on an invalid type'
                };
            }
            return a.operate(context, op, b);
        }
        else {
            return new Operation(this.op, [a, b], this.isSpaced);
        }
    },
    genCSS: function (context, output) {
        this.operands[0].genCSS(context, output);
        if (this.isSpaced) {
            output.add(' ');
        }
        output.add(this.op);
        if (this.isSpaced) {
            output.add(' ');
        }
        this.operands[1].genCSS(context, output);
    }
});

var Expression = function (value, noSpacing) {
    this.value = value;
    this.noSpacing = noSpacing;
    if (!value) {
        throw new Error('Expression requires an array parameter');
    }
};
Expression.prototype = Object.assign(new Node(), {
    type: 'Expression',
    accept: function (visitor) {
        this.value = visitor.visitArray(this.value);
    },
    eval: function (context) {
        var returnValue;
        var mathOn = context.isMathOn();
        var inParenthesis = this.parens;
        var doubleParen = false;
        if (inParenthesis) {
            context.inParenthesis();
        }
        if (this.value.length > 1) {
            returnValue = new Expression(this.value.map(function (e) {
                if (!e.eval) {
                    return e;
                }
                return e.eval(context);
            }), this.noSpacing);
        }
        else if (this.value.length === 1) {
            if (this.value[0].parens && !this.value[0].parensInOp && !context.inCalc) {
                doubleParen = true;
            }
            returnValue = this.value[0].eval(context);
        }
        else {
            returnValue = this;
        }
        if (inParenthesis) {
            context.outOfParenthesis();
        }
        if (this.parens && this.parensInOp && !mathOn && !doubleParen
            && (!(returnValue instanceof Dimension))) {
            returnValue = new Paren(returnValue);
        }
        return returnValue;
    },
    genCSS: function (context, output) {
        for (var i_1 = 0; i_1 < this.value.length; i_1++) {
            this.value[i_1].genCSS(context, output);
            if (!this.noSpacing && i_1 + 1 < this.value.length) {
                output.add(' ');
            }
        }
    },
    throwAwayComments: function () {
        this.value = this.value.filter(function (v) {
            return !(v instanceof Comment);
        });
    }
});

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2)
        for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar)
                    ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
    return to.concat(ar || from);
}

function toHex(v) {
    return "#" + v.map(function (c) {
        c = clamp$1(Math.round(c), 255);
        return (c < 16 ? '0' : '') + c.toString(16);
    }).join('');
}

function clamp$1(v, max) {
    return Math.min(Math.max(v, 0), max);
}

function toHSL(color) {
    if (color.toHSL) {
        return color.toHSL(color);
    }
    else {
        throw new Error('Argument cannot be evaluated to a color');
    }
}

function number$1(n) {
    if (n instanceof Dimension) {
        return parseFloat(n.unit.is('%') ? n.value / 100 : n.value);
    }
    else if (typeof n === 'number') {
        return n;
    }
    else {
        throw {
            type: 'Argument',
            message: 'color functions take numbers as parameters'
        };
    }
}

var unitConversions = {
    length: {
        'm': 1,
        'cm': 0.01,
        'mm': 0.001,
        'in': 0.0254,
        'px': 0.0254 / 96,
        'pt': 0.0254 / 72,
        'pc': 0.0254 / 72 * 12
    },
    duration: {
        's': 1,
        'ms': 0.001
    },
    angle: {
        'rad': 1 / (2 * Math.PI),
        'deg': 1 / 360,
        'grad': 1 / 400,
        'turn': 1
    }
};


function scaled(n, size) {
    if (n instanceof Dimension && n.unit.is('%')) {
        return parseFloat(n.value * size / 100);
    }
    else {
        return number$1(n);
    }
}

function clamp(val) {
    return Math.min(1, Math.max(0, val));
}

function hsla(origColor, hsl) {
    var color = colorFunctions.hsla(hsl.h, hsl.s, hsl.l, hsl.a);
    if (color) {
        if (origColor.value &&
            /^(rgb|hsl)/.test(origColor.value)) {
            color.value = origColor.value;
        }
        else {
            color.value = 'rgb';
        }
        return color;
    }
}

function copyArray(arr) {
    var i;
    var length = arr.length;
    var copy = new Array(length);
    for (i = 0; i < length; i++) {
        copy[i] = arr[i];
    }
    return copy;
}

const colorFunctions = {
    rgb: function (r, g, b) {
        var a = 1;
        /**
         * Comma-less syntax
         *   e.g. rgb(0 128 255 / 50%)
         */
        if (r instanceof Expression) {
            var val = r.value;
            r = val[0];
            g = val[1];
            b = val[2];
            /**
             * @todo - should this be normalized in
             *   function caller? Or parsed differently?
             */
            if (b instanceof Operation) {
                var op = b;
                b = op.operands[0];
                a = op.operands[1];
            }
        }
        var color = colorFunctions.rgba(r, g, b, a);
        if (color) {
            color.value = 'rgb';
            return color;
        }
    },
    rgba: function (r, g, b, a) {
        try {
            if (r instanceof Color) {
                if (g) {
                    a = number$1(g);
                }
                else {
                    a = r.alpha;
                }
                return new Color(r.rgb, a, 'rgba');
            }
            var rgb = [r, g, b].map(function (c) { return scaled(c, 255); });
            a = number$1(a);
            return new Color(rgb, a, 'rgba');
        }
        catch (e) { }
    },
    mix: function (color1, color2, weight) {
        if (!weight) {
            weight = new Dimension(50);
        }
        var p = weight.value / 100.0;
        var w = p * 2 - 1;
        var a = toHSL(color1).a - toHSL(color2).a;
        var w1 = (((w * a == -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
        var w2 = 1 - w1;
        var rgb = [color1.rgb[0] * w1 + color2.rgb[0] * w2,
        color1.rgb[1] * w1 + color2.rgb[1] * w2,
        color1.rgb[2] * w1 + color2.rgb[2] * w2];
        var alpha = color1.alpha * p + color2.alpha * (1 - p);
        return new Color(rgb, alpha);
    },
    color: function (c) {
        if ((c instanceof Quoted) &&
            (/^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})$/i.test(c.value))) {
            var val = c.value.slice(1);
            return new Color(val, undefined, "#" + val);
        }
        if ((c instanceof Color) || (c = Color.fromKeyword(c.value))) {
            c.value = undefined;
            return c;
        }
        throw {
            type: 'Argument',
            message: 'argument must be a color keyword or 3|4|6|8 digit hex e.g. #FFF'
        };
    },
    hsla: function (h, s, l, a) {
        var m1;
        var m2;
        function hue(h) {
            h = h < 0 ? h + 1 : (h > 1 ? h - 1 : h);
            if (h * 6 < 1) {
                return m1 + (m2 - m1) * h * 6;
            }
            else if (h * 2 < 1) {
                return m2;
            }
            else if (h * 3 < 2) {
                return m1 + (m2 - m1) * (2 / 3 - h) * 6;
            }
            else {
                return m1;
            }
        }
        try {
            if (h instanceof Color) {
                if (s) {
                    a = number$1(s);
                }
                else {
                    a = h.alpha;
                }
                return new Color(h.rgb, a, 'hsla');
            }
            h = (number$1(h) % 360) / 360;
            s = clamp(number$1(s));
            l = clamp(number$1(l));
            a = clamp(number$1(a));
            m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
            m1 = l * 2 - m2;
            var rgb = [
                hue(h + 1 / 3) * 255,
                hue(h) * 255,
                hue(h - 1 / 3) * 255
            ];
            a = number$1(a);
            return new Color(rgb, a, 'hsla');
        }
        catch (e) { }
    },
    tint: function (color, amount) {
        return colorFunctions.mix(colorFunctions.rgb(255, 255, 255), color, amount)
    },
    fade: function (color, amount) {
        var hsl = toHSL(color);
        hsl.a = amount.value / 100;
        hsl.a = clamp(hsl.a);

        return hsla(color, hsl);
    },
    shade: function (color, amount) {
        return colorFunctions.mix(colorFunctions.rgb(0, 0, 0), color, amount);
    },
    darken: function (color, amount, method) {
        var hsl = toHSL(color);
        if (typeof method !== 'undefined' && method.value === 'relative') {
            hsl.l -= hsl.l * amount.value / 100;
        }
        else {
            hsl.l -= amount.value / 100;
        }
        hsl.l = clamp(hsl.l);

        return hsla(color, hsl);
    }
};

module.exports = {
    tint: colorFunctions.tint,
    fade: colorFunctions.fade,
    shade: colorFunctions.shade,
    darken: colorFunctions.darken,
    Color,
    Dimension
}

