
/**
 * @license RequireJS text 2.0.3 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require: false, XMLHttpRequest: false, ActiveXObject: false,
  define: false, window: false, process: false, Packages: false,
  java: false, location: false */

define('text',['module'], function (module) {
    

    var text, fs,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = [],
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.3',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var strip = false, index = name.indexOf("."),
                modName = name.substring(0, index),
                ext = name.substring(index + 1, name.length);

            index = ext.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = ext.substring(index + 1, ext.length);
                strip = strip === "strip";
                ext = ext.substring(0, index);
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName + '.' + parsed.ext,
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                nonStripName = parsed.moduleName + '.' + parsed.ext,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + '.' +
                                     parsed.ext) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node)) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback) {
            var file = fs.readFileSync(url, 'utf8');
            //Remove BOM (Byte Mark Order) from utf8 files if it is there.
            if (file.indexOf('\uFEFF') === 0) {
                file = file.substring(1);
            }
            callback(file);
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback) {
            var xhr = text.createXhr();
            xhr.open('GET', url, true);

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        errback(err);
                    } else {
                        callback(xhr.responseText);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                stringBuffer.append(line);

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    }

    return text;
});
define('text!templates/app.html',[],function () { return '\r\n<div class="span4">\r\n  <h2>Goals By Year</h2>\r\n  <table cellpadding="0" cellspacing="0" class="table table-bordered table-striped table-hover scores">\r\n    <thead><tr><th colspan="2">Goal</th><th>Last Year</th><th>This Year</th><th>Year Diff</th><th>Goal</th><th>Goal Diff</th></tr></thead>\r\n    <tbody id="goallist"></tbody>\r\n  </table>\r\n</div>\r\n\r\n<div class="span4">\r\n  <h2>Handicap</h2>\r\n  <table cellpadding="0" cellspacing="0" class="table table-bordered table-striped table-hover scores"></table>\r\n</div>\r\n<div id="graphLayer" class="span12 row-fluid">\r\n    <div class="span4">\r\n        <h2>Report List</h2>\r\n        <ul class="courselist unstyled">\r\n            <li><a href="#" class="scoreVsGIR">Score vs GIR</a></li>\r\n            <li><a href="#" class="scoreVsPutts">Score vs Putts</a></li>\r\n            <li><a href="#" class="scoreVsFairways">Score vs Fairway %</a></li>\r\n            <li><a href="#" class="scoreVsPlayable">Score vs Playable %</a></li>\r\n            <li><a href="#" class="scoreVsDrPenPoints">Score vs Dr Pen Points</a></li>\r\n            <li><a href="#" class="scoreVsScramble">Score vs Scramble %</a></li>\r\n            <li><a href="#" class="girVsFw">GIR vs Fairway %</a></li>\r\n            <li><a href="#" class="holeVsPar">Hole vs Par</a></li>\r\n        </ul>\r\n    </div>\r\n    <div class="span8">\r\n        <h2 id="graphTitle"></h2>\r\n        <div id="graphHolder"></div>\r\n    </div>\r\n</div>\r\n<div id="courseLayer" class="span12 row-fluid">\r\n    <div class="span4">\r\n        <h2>Course List</h2>\r\n        <ul id="courselist" class="courselist unstyled"></ul>\r\n    </div>\r\n    <div class="span8">\r\n        <div class="tabbable">\r\n        <ul class="nav nav-pills" id="courseNav">\r\n            <li class="active"><a href="#tab1" data-toggle="tab">Hole by Hole</a></li>\r\n        </ul>\r\n        <div class="tab-content" id="teeContent">\r\n            <div class="tab-pane active" id="tab1">\r\n                 <div id="courseStats"></div>   \r\n            </div>\r\n        </div>\r\n        </div>\r\n    </div>\r\n    \r\n</div>\r\n<div class="span12 scoreTableWrapper">\r\n    scores\r\n</div>';});

define('views/app',['text!templates/app.html'],function(template){
    var AppView = Backbone.View.extend({
        id:'main',
        tagName:'div',
        className:'container-fluid',
        el:'#score-app',
        template: Handlebars.compile(template),
        events:{
            
        },
        initialize: function(){
            
        },
        render: function(){
            this.$el.html(this.template());
            return this;
        }
    });
    return AppView;
});
/**
 * @preserve XDate v@VERSION
 * Docs & Licensing: http://arshaw.com/xdate/
 */

/*
 * Internal Architecture
 * ---------------------
 * An XDate wraps a native Date. The native Date is stored in the '0' property of the object.
 * UTC-mode is determined by whether the internal native Date's toString method is set to
 * Date.prototype.toUTCString (see getUTCMode).
 *
 */

var XDate = (function(Date, Math, Array, undefined) {


/** @const */ var FULLYEAR     = 0;
/** @const */ var MONTH        = 1;
/** @const */ var DATE         = 2;
/** @const */ var HOURS        = 3;
/** @const */ var MINUTES      = 4;
/** @const */ var SECONDS      = 5;
/** @const */ var MILLISECONDS = 6;
/** @const */ var DAY          = 7;
/** @const */ var YEAR         = 8;
/** @const */ var WEEK         = 9;
/** @const */ var DAY_MS = 86400000;
var ISO_FORMAT_STRING = "yyyy-MM-dd'T'HH:mm:ss(.fff)";
var ISO_FORMAT_STRING_TZ = ISO_FORMAT_STRING + "zzz";


var methodSubjects = [
	'FullYear',     // 0
	'Month',        // 1
	'Date',         // 2
	'Hours',        // 3
	'Minutes',      // 4
	'Seconds',      // 5
	'Milliseconds', // 6
	'Day',          // 7
	'Year'          // 8
];
var subjectPlurals = [
	'Years',        // 0
	'Months',       // 1
	'Days'          // 2
];
var unitsWithin = [
	12,   // months in year
	31,   // days in month (sort of)
	24,   // hours in day
	60,   // minutes in hour
	60,   // seconds in minute
	1000, // milliseconds in second
	1     //
];
var formatStringRE = new RegExp(
	"(([a-zA-Z])\\2*)|" + // 1, 2
	"(\\(" + "(('.*?'|\\(.*?\\)|.)*?)" + "\\))|" + // 3, 4, 5 (allows for 1 level of inner quotes or parens)
	"('(.*?)')" // 6, 7
);
var UTC = Date.UTC;
var toUTCString = Date.prototype.toUTCString;
var proto = XDate.prototype;



// This makes an XDate look pretty in Firebug and Web Inspector.
// It makes an XDate seem array-like, and displays [ <internal-date>.toString() ]
proto.length = 1;
proto.splice = Array.prototype.splice;




/* Constructor
---------------------------------------------------------------------------------*/

// TODO: in future, I'd change signature for the constructor regarding the `true` utc-mode param. ~ashaw
//   I'd move the boolean to be the *first* argument. Still optional. Seems cleaner.
//   I'd remove it from the `xdate`, `nativeDate`, and `milliseconds` constructors.
//      (because you can simply call .setUTCMode(true) after)
//   And I'd only leave it for the y/m/d/h/m/s/m and `dateString` constructors
//      (because those are the only constructors that need it for DST-gap data-loss reasons)
//   Should do this for 1.0

function XDate() {
	return init(
		(this instanceof XDate) ? this : new XDate(),
		arguments
	);
}


function init(xdate, args) {
	var len = args.length;
	var utcMode;
	if (isBoolean(args[len-1])) {
		utcMode = args[--len];
		args = slice(args, 0, len);
	}
	if (!len) {
		xdate[0] = new Date();
	}
	else if (len == 1) {
		var arg = args[0];
		if (arg instanceof Date || isNumber(arg)) {
			xdate[0] = new Date(+arg);
		}
		else if (arg instanceof XDate) {
			xdate[0] = _clone(arg);
		}
		else if (isString(arg)) {
			xdate[0] = new Date(0);
			xdate = parse(arg, utcMode || false, xdate);
		}
	}
	else {
		xdate[0] = new Date(UTC.apply(Date, args));
		if (!utcMode) {
			xdate[0] = coerceToLocal(xdate[0]);
		}
	}
	if (isBoolean(utcMode)) {
		setUTCMode(xdate, utcMode);
	}
	return xdate;
}



/* UTC Mode Methods
---------------------------------------------------------------------------------*/


proto.getUTCMode = methodize(getUTCMode);
function getUTCMode(xdate) {
	return xdate[0].toString === toUTCString;
};


proto.setUTCMode = methodize(setUTCMode);
function setUTCMode(xdate, utcMode, doCoercion) {
	if (utcMode) {
		if (!getUTCMode(xdate)) {
			if (doCoercion) {
				xdate[0] = coerceToUTC(xdate[0]);
			}
			xdate[0].toString = toUTCString;
		}
	}else{
		if (getUTCMode(xdate)) {
			if (doCoercion) {
				xdate[0] = coerceToLocal(xdate[0]);
			}else{
				xdate[0] = new Date(+xdate[0]);
			}
			// toString will have been cleared
		}
	}
	return xdate; // for chaining
}


proto.getTimezoneOffset = function() {
	if (getUTCMode(this)) {
		return 0;
	}else{
		return this[0].getTimezoneOffset();
	}
};



/* get / set / add / diff Methods (except for week-related)
---------------------------------------------------------------------------------*/


each(methodSubjects, function(subject, fieldIndex) {

	proto['get' + subject] = function() {
		return _getField(this[0], getUTCMode(this), fieldIndex);
	};
	
	if (fieldIndex != YEAR) { // because there is no getUTCYear
	
		proto['getUTC' + subject] = function() {
			return _getField(this[0], true, fieldIndex);
		};
		
	}

	if (fieldIndex != DAY) { // because there is no setDay or setUTCDay
	                         // and the add* and diff* methods use DATE instead
		
		proto['set' + subject] = function(value) {
			_set(this, fieldIndex, value, arguments, getUTCMode(this));
			return this; // for chaining
		};
		
		if (fieldIndex != YEAR) { // because there is no setUTCYear
		                          // and the add* and diff* methods use FULLYEAR instead
			
			proto['setUTC' + subject] = function(value) {
				_set(this, fieldIndex, value, arguments, true);
				return this; // for chaining
			};
			
			proto['add' + (subjectPlurals[fieldIndex] || subject)] = function(delta, preventOverflow) {
				_add(this, fieldIndex, delta, preventOverflow);
				return this; // for chaining
			};
			
			proto['diff' + (subjectPlurals[fieldIndex] || subject)] = function(otherDate) {
				return _diff(this, otherDate, fieldIndex);
			};
			
		}
		
	}

});


function _set(xdate, fieldIndex, value, args, useUTC) {
	var getField = curry(_getField, xdate[0], useUTC);
	var setField = curry(_setField, xdate[0], useUTC);
	var expectedMonth;
	var preventOverflow = false;
	if (args.length == 2 && isBoolean(args[1])) {
		preventOverflow = args[1];
		args = [ value ];
	}
	if (fieldIndex == MONTH) {
		expectedMonth = (value % 12 + 12) % 12;
	}else{
		expectedMonth = getField(MONTH);
	}
	setField(fieldIndex, args);
	if (preventOverflow && getField(MONTH) != expectedMonth) {
		setField(MONTH, [ getField(MONTH) - 1 ]);
		setField(DATE, [ getDaysInMonth(getField(FULLYEAR), getField(MONTH)) ]);
	}
}


function _add(xdate, fieldIndex, delta, preventOverflow) {
	delta = Number(delta);
	var intDelta = Math.floor(delta);
	xdate['set' + methodSubjects[fieldIndex]](
		xdate['get' + methodSubjects[fieldIndex]]() + intDelta,
		preventOverflow || false
	);
	if (intDelta != delta && fieldIndex < MILLISECONDS) {
		_add(xdate, fieldIndex+1, (delta-intDelta)*unitsWithin[fieldIndex], preventOverflow);
	}
}


function _diff(xdate1, xdate2, fieldIndex) { // fieldIndex=FULLYEAR is for years, fieldIndex=DATE is for days
	xdate1 = xdate1.clone().setUTCMode(true, true);
	xdate2 = XDate(xdate2).setUTCMode(true, true);
	var v = 0;
	if (fieldIndex == FULLYEAR || fieldIndex == MONTH) {
		for (var i=MILLISECONDS, methodName; i>=fieldIndex; i--) {
			v /= unitsWithin[i];
			v += _getField(xdate2, false, i) - _getField(xdate1, false, i);
		}
		if (fieldIndex == MONTH) {
			v += (xdate2.getFullYear() - xdate1.getFullYear()) * 12;
		}
	}
	else if (fieldIndex == DATE) {
		var clear1 = xdate1.toDate().setUTCHours(0, 0, 0, 0); // returns an ms value
		var clear2 = xdate2.toDate().setUTCHours(0, 0, 0, 0); // returns an ms value
		v = Math.round((clear2 - clear1) / DAY_MS) + ((xdate2 - clear2) - (xdate1 - clear1)) / DAY_MS;
	}
	else {
		v = (xdate2 - xdate1) / [
			3600000, // milliseconds in hour
			60000,   // milliseconds in minute
			1000,    // milliseconds in second
			1        //
			][fieldIndex - 3];
	}
	return v;
}



/* Week Methods
---------------------------------------------------------------------------------*/


proto.getWeek = function() {
	return _getWeek(curry(_getField, this, false));
};


proto.getUTCWeek = function() {
	return _getWeek(curry(_getField, this, true));
};


proto.setWeek = function(n, year) {
	_setWeek(this, n, year, false);
	return this; // for chaining
};


proto.setUTCWeek = function(n, year) {
	_setWeek(this, n, year, true);
	return this; // for chaining
};


proto.addWeeks = function(delta) {
	return this.addDays(Number(delta) * 7);
};


proto.diffWeeks = function(otherDate) {
	return _diff(this, otherDate, DATE) / 7;
};


function _getWeek(getField) {
	return getWeek(getField(FULLYEAR), getField(MONTH), getField(DATE));
}


function getWeek(year, month, date) {
	var d = new Date(UTC(year, month, date));
	var week1 = getWeek1(
		getWeekYear(year, month, date)
	);
	return Math.floor(Math.round((d - week1) / DAY_MS) / 7) + 1;
}


function getWeekYear(year, month, date) { // get the year that the date's week # belongs to
	var d = new Date(UTC(year, month, date));
	if (d < getWeek1(year)) {
		return year - 1;
	}
	else if (d >= getWeek1(year + 1)) {
		return year + 1;
	}
	return year;
}


function getWeek1(year) { // returns Date of first week of year, in UTC
	var d = new Date(UTC(year, 0, 4));
	d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); // make it Monday of the week
	return d;
}


function _setWeek(xdate, n, year, useUTC) {
	var getField = curry(_getField, xdate, useUTC);
	var setField = curry(_setField, xdate, useUTC);

	if (year === undefined) {
		year = getWeekYear(
			getField(FULLYEAR),
			getField(MONTH),
			getField(DATE)
		);
	}

	var week1 = getWeek1(year);
	if (!useUTC) {
		week1 = coerceToLocal(week1);
	}

	xdate.setTime(+week1);
	setField(DATE, [ getField(DATE) + (n-1) * 7 ]); // would have used xdate.addUTCWeeks :(
		// n-1 because n is 1-based
}



/* Parsing
---------------------------------------------------------------------------------*/


XDate.parsers = [
	parseISO
];


XDate.parse = function(str) {
	return +XDate(''+str);
};


function parse(str, utcMode, xdate) {
	var parsers = XDate.parsers;
	var i = 0;
	var res;
	for (; i<parsers.length; i++) {
		res = parsers[i](str, utcMode, xdate);
		if (res) {
			return res;
		}
	}
	xdate[0] = new Date(str);
	return xdate;
}


function parseISO(str, utcMode, xdate) {
	var m = str.match(/^(\d{4})(-(\d{2})(-(\d{2})([T ](\d{2}):(\d{2})(:(\d{2})(\.(\d+))?)?(Z|(([-+])(\d{2})(:?(\d{2}))?))?)?)?)?$/);
	if (m) {
		var d = new Date(UTC(
			m[1],
			m[3] ? m[3] - 1 : 0,
			m[5] || 1,
			m[7] || 0,
			m[8] || 0,
			m[10] || 0,
			m[12] ? Number('0.' + m[12]) * 1000 : 0
		));
		if (m[13]) { // has gmt offset or Z
			if (m[14]) { // has gmt offset
				d.setUTCMinutes(
					d.getUTCMinutes() +
					(m[15] == '-' ? 1 : -1) * (Number(m[16]) * 60 + (m[18] ? Number(m[18]) : 0))
				);
			}
		}else{ // no specified timezone
			if (!utcMode) {
				d = coerceToLocal(d);
			}
		}
		return xdate.setTime(+d);
	}
}



/* Formatting
---------------------------------------------------------------------------------*/


proto.toString = function(formatString, settings, uniqueness) {
	if (formatString === undefined || !valid(this)) {
		return this[0].toString(); // already accounts for utc-mode (might be toUTCString)
	}else{
		return format(this, formatString, settings, uniqueness, getUTCMode(this));
	}
};


proto.toUTCString = proto.toGMTString = function(formatString, settings, uniqueness) {
	if (formatString === undefined || !valid(this)) {
		return this[0].toUTCString();
	}else{
		return format(this, formatString, settings, uniqueness, true);
	}
};


proto.toISOString = function() {
	return this.toUTCString(ISO_FORMAT_STRING_TZ);
};


XDate.defaultLocale = '';
XDate.locales = {
	'': {
		monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
		monthNamesShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
		dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
		dayNamesShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
		amDesignator: 'AM',
		pmDesignator: 'PM'
	}
};
XDate.formatters = {
	i: ISO_FORMAT_STRING,
	u: ISO_FORMAT_STRING_TZ
};


function format(xdate, formatString, settings, uniqueness, useUTC) {

	var locales = XDate.locales;
	var defaultLocaleSettings = locales[XDate.defaultLocale] || {};
	var getField = curry(_getField, xdate, useUTC);
	
	settings = (isString(settings) ? locales[settings] : settings) || {};
	
	function getSetting(name) {
		return settings[name] || defaultLocaleSettings[name];
	}
	
	function getFieldAndTrace(fieldIndex) {
		if (uniqueness) {
			var i = (fieldIndex == DAY ? DATE : fieldIndex) - 1;
			for (; i>=0; i--) {
				uniqueness.push(getField(i));
			}
		}
		return getField(fieldIndex);
	}
	
	return _format(xdate, formatString, getFieldAndTrace, getSetting, useUTC);
}


function _format(xdate, formatString, getField, getSetting, useUTC) {
	var m;
	var subout;
	var out = '';
	while (m = formatString.match(formatStringRE)) {
		out += formatString.substr(0, m.index);
		if (m[1]) { // consecutive alphabetic characters
			out += processTokenString(xdate, m[1], getField, getSetting, useUTC);
		}
		else if (m[3]) { // parenthesis
			subout = _format(xdate, m[4], getField, getSetting, useUTC);
			if (parseInt(subout.replace(/\D/g, ''), 10)) { // if any of the numbers are non-zero. or no numbers at all
				out += subout;
			}
		}
		else { // else if (m[6]) { // single quotes
			out += m[7] || "'"; // if inner is blank, meaning 2 consecutive quotes = literal single quote
		}
		formatString = formatString.substr(m.index + m[0].length);
	}
	return out + formatString;
}


function processTokenString(xdate, tokenString, getField, getSetting, useUTC) {
	var end = tokenString.length;
	var replacement;
	var out = '';
	while (end > 0) {
		replacement = getTokenReplacement(xdate, tokenString.substr(0, end), getField, getSetting, useUTC);
		if (replacement !== undefined) {
			out += replacement;
			tokenString = tokenString.substr(end);
			end = tokenString.length;
		}else{
			end--;
		}
	}
	return out + tokenString;
}


function getTokenReplacement(xdate, token, getField, getSetting, useUTC) {
	var formatter = XDate.formatters[token];
	if (isString(formatter)) {
		return _format(xdate, formatter, getField, getSetting, useUTC);
	}
	else if (isFunction(formatter)) {
		return formatter(xdate, useUTC || false, getSetting);
	}
	switch (token) {
		case 'fff'  : return zeroPad(getField(MILLISECONDS), 3);
		case 's'    : return getField(SECONDS);
		case 'ss'   : return zeroPad(getField(SECONDS));
		case 'm'    : return getField(MINUTES);
		case 'mm'   : return zeroPad(getField(MINUTES));
		case 'h'    : return getField(HOURS) % 12 || 12;
		case 'hh'   : return zeroPad(getField(HOURS) % 12 || 12);
		case 'H'    : return getField(HOURS);
		case 'HH'   : return zeroPad(getField(HOURS));
		case 'd'    : return getField(DATE);
		case 'dd'   : return zeroPad(getField(DATE));
		case 'ddd'  : return getSetting('dayNamesShort')[getField(DAY)] || '';
		case 'dddd' : return getSetting('dayNames')[getField(DAY)] || '';
		case 'M'    : return getField(MONTH) + 1;
		case 'MM'   : return zeroPad(getField(MONTH) + 1);
		case 'MMM'  : return getSetting('monthNamesShort')[getField(MONTH)] || '';
		case 'MMMM' : return getSetting('monthNames')[getField(MONTH)] || '';
		case 'yy'   : return (getField(FULLYEAR)+'').substring(2);
		case 'yyyy' : return getField(FULLYEAR);
		case 't'    : return _getDesignator(getField, getSetting).substr(0, 1).toLowerCase();
		case 'tt'   : return _getDesignator(getField, getSetting).toLowerCase();
		case 'T'    : return _getDesignator(getField, getSetting).substr(0, 1);
		case 'TT'   : return _getDesignator(getField, getSetting);
		case 'z'    :
		case 'zz'   :
		case 'zzz'  : return useUTC ? 'Z' : _getTZString(xdate, token);
		case 'w'    : return _getWeek(getField);
		case 'ww'   : return zeroPad(_getWeek(getField));
		case 'S'    :
			var d = getField(DATE);
			if (d > 10 && d < 20) return 'th';
			return ['st', 'nd', 'rd'][d % 10 - 1] || 'th';
	}
}


function _getTZString(xdate, token) {
	var tzo = xdate.getTimezoneOffset();
	var sign = tzo < 0 ? '+' : '-';
	var hours = Math.floor(Math.abs(tzo) / 60);
	var minutes = Math.abs(tzo) % 60;
	var out = hours;
	if (token == 'zz') {
		out = zeroPad(hours);
	}
	else if (token == 'zzz') {
		out = zeroPad(hours) + ':' + zeroPad(minutes);
	}
	return sign + out;
}


function _getDesignator(getField, getSetting) {
	return getField(HOURS) < 12 ? getSetting('amDesignator') : getSetting('pmDesignator');
}



/* Misc Methods
---------------------------------------------------------------------------------*/


each(
	[ // other getters
		'getTime',
		'valueOf',
		'toDateString',
		'toTimeString',
		'toLocaleString',
		'toLocaleDateString',
		'toLocaleTimeString',
		'toJSON'
	],
	function(methodName) {
		proto[methodName] = function() {
			return this[0][methodName]();
		};
	}
);


proto.setTime = function(t) {
	this[0].setTime(t);
	return this; // for chaining
};


proto.valid = methodize(valid);
function valid(xdate) {
	return !isNaN(+xdate[0]);
}


proto.clone = function() {
	return new XDate(this);
};


proto.clearTime = function() {
	return this.setHours(0, 0, 0, 0); // will return an XDate for chaining
};


proto.toDate = function() {
	return new Date(+this[0]);
};



/* Misc Class Methods
---------------------------------------------------------------------------------*/


XDate.now = function() {
	return +new Date();
};


XDate.today = function() {
	return new XDate().clearTime();
};


XDate.UTC = UTC;


XDate.getDaysInMonth = getDaysInMonth;



/* Internal Utilities
---------------------------------------------------------------------------------*/


function _clone(xdate) { // returns the internal Date object that should be used
	var d = new Date(+xdate[0]);
	if (getUTCMode(xdate)) {
		d.toString = toUTCString;
	}
	return d;
}


function _getField(d, useUTC, fieldIndex) {
	return d['get' + (useUTC ? 'UTC' : '') + methodSubjects[fieldIndex]]();
}


function _setField(d, useUTC, fieldIndex, args) {
	d['set' + (useUTC ? 'UTC' : '') + methodSubjects[fieldIndex]].apply(d, args);
}



/* Date Math Utilities
---------------------------------------------------------------------------------*/


function coerceToUTC(date) {
	return new Date(UTC(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		date.getHours(),
		date.getMinutes(),
		date.getSeconds(),
		date.getMilliseconds()
	));
}


function coerceToLocal(date) {
	return new Date(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
		date.getUTCHours(),
		date.getUTCMinutes(),
		date.getUTCSeconds(),
		date.getUTCMilliseconds()
	);
}


function getDaysInMonth(year, month) {
	return 32 - new Date(UTC(year, month, 32)).getUTCDate();
}



/* General Utilities
---------------------------------------------------------------------------------*/


function methodize(f) {
	return function() {
		return f.apply(undefined, [this].concat(slice(arguments)));
	};
}


function curry(f) {
	var firstArgs = slice(arguments, 1);
	return function() {
		return f.apply(undefined, firstArgs.concat(slice(arguments)));
	};
}


function slice(a, start, end) {
	return Array.prototype.slice.call(
		a,
		start || 0, // start and end cannot be undefined for IE
		end===undefined ? a.length : end
	);
}


function each(a, f) {
	for (var i=0; i<a.length; i++) {
		f(a[i], i);
	};
}


function isString(arg) {
	return typeof arg == 'string';
}


function isNumber(arg) {
	return typeof arg == 'number';
}


function isBoolean(arg) {
	return typeof arg == 'boolean';
}


function isFunction(arg) {
	return typeof arg == 'function';
}


function zeroPad(n, len) {
	len = len || 2;
	n += '';
	while (n.length < len) {
		n = '0' + n;
	}
	return n;
}



// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
	module.exports = XDate;
}

// AMD
if (typeof define === 'function' && define.amd) {
	define('xdate',[], function() {
		return XDate;
	});
}


return XDate;

})(Date, Math, Array);

var ScoreCalculator = (function(){
    var proto = ScoreCalculator.prototype;
    function ScoreCalculator() {
        return init(
            (this instanceof ScoreCalculator) ? this : new ScoreCalculator(),arguments
        );
    }
    function init(scoreCalculator, args) {
        return scoreCalculator;
    }
    var sumScoreAndESCByHoles = proto.sumScoreAndESCByHoles = function(_score){
        var score = 0;
        var ESC = 0;
        if(_score.holes)
        _score.holes.forEach(function(h,i){
            console.log(i,h,h.score);
           if(h.score){
                score += h.score;
                ESC += h.score > 7?7:h.score;
           }
        });
        else
            console.log("sumScoreAndESCByHoles NO HOLES!!!");
        var result = {"score":score,"ESC":ESC};
        console.log("sumScoreAndESCByHoles",result)
        return {"score":score,"ESC":ESC};
    }
    proto.calcScore = function(score,tee){
        var r = sumScoreAndESCByHoles(score);
        score.score = r.score;
        score.ESC = r.ESC;
        
        return calc(score.score,score.ESC, score.holes, null,tee);
    }
    var calc = proto.calc = function (score,ESC,holes,course,tee){
           // if(course === null) throw "Course cannot be null";
            var result = {onePutts:0,threePutts:0,chipIn:0,putts:0, handicap:0,birdies:0,eagles:0,pars:0,bogies:0,others:0,doubles:0};
            
            result.ESC = ESC;
            result.score = score;
            result.handicap = Handicap(score,ESC,tee.rating,tee.slope);
            result = processHoles(result,holes,tee);
            result.shortGamePercent = Math.round(result.shortGame / score *1000)/10;
            result.fairwayPercent = Math.round(result.fairways / result.totalFairways * 1000) / 10;
            result.playablePercent = Math.round(result.playable / result.totalFairways * 1000) /10;  
            
            return result;
        };
    var isGIR = function (par,score,putts){
            return ((par - 2) >= (score - putts));
        };
    proto.calculateHole = function(hole,par){
        var stats = {};
        if(par === undefined)
            throw "error par is required parameter";
        stats.hasFairway = (par > 3);
        if(stats.hasFairway)
            stats.fairwayHit = (/[Hh]it/.test(hole.fairway));
        stats.GIR = isGIR(par, hole.score,hole.putts); //stats.fairw
        stats.overPar = hole.score - par;
        //stats.chipIn = 
        //if(par)
        return stats;  
    };
    var processHoles= function (total,holes,tee){
            total.GIR = 0;
            total.ch15 =0;
            total.chips=0;
            total.chipIn =0;
            total.extraChips = 0;
            total.eagles=0;
            total.totalFairways=0
            total.fairways=0;
            total.playable=0;
            total.drivePoints=0;
            total.penalties=0;             
            total.holesWChip=0;
            total.holesNoChip=0;
            total.puttsAfterChip=0;
            total.puttsAfterNoChip=0;
            total.scrambleChances=0;
            total.scrambles=0;
            total.extra = 0;
            
       
        	for(var i = 0;i<holes.length;i++){
                var h = processHole(holes[i],tee.holes[i]);
                if(h.GIR){
        			total.GIR++;
        		}
        		if(h.Ch15) total.ch15++;
        		
        		total.chips += h.chips;
                if(h.chips > 1){
                    h.extraChips = h.chips - 1;
                    total.extraChips += h.extraChips;
                }
        		total.penalties += h.penalties;
                total.extra += h.extra;
        		if(h.par == h.score){
        			total.pars ++;
        		}else if(h.par + 1 == h.score){
        			total.bogies ++;
        		}else if(h.par + 2 == h.score){
        			total.doubles ++;
        		}else if(h.par + 2 < h.score){
        			total.others ++;
        		}else if(h.par -2 >= h.score){
            		total.eagles ++;
        		}else{
        			total.birdies ++;
        		}
                if(h.par > 3){
                    total.totalFairways++;
                    if(/[Hh]it/.test(h.fairway)){
                        total.fairways++;
                    }
                    if(h.drivePoints)
                        total.drivePoints += h.drivePoints;
                    if(h.playable)
                        total.playable++;
                }
                if(h.putts){
                    total.putts += h.putts;
                    if(h.putts ===0){
            
            		}else if(h.putts === 1){
            			total.onePutts++;
            		}else if(h.putts >=3){
            			total.threePutts++;
            		}
                }
                if(h.chipIn)
                    total.chipIn++;
        		if(h.chips > 0){
        			total.holesWChip++;
        			total.puttsAfterChip += h.putts?h.putts:0;
        		//	total.chipIn += h.chipIn;
        		}else{
        			total.holesNoChip ++;
        			total.puttsAfterNoChip += h.putts?h.putts:0;
        		} 
                if(h.scramble != null){
        		  total.scrambleChances ++;
        		}
        		if(h.scramble){
        			total.scrambles++;
        		}
    
            }
            
            total.shortGame = total.chips+total.putts;
            if(total.scrambleChances > 0){
                total.scramblePercent = Math.round(total.scrambles/total.scrambleChances*100);
            }else{
                total.scramblePercnet = 'N/A';
            }
            if(total.holesWChip  > 0)
                total.avgPuttsWithChip = total.puttsAfterChip / total.holesWChip;	
            if(total.holesNoChip < 18)
                total.avgPuttsWithoutChip = (total.putts - total.puttsAfterChip) / (18 - total.holesWChip);
            total.avgPuttsWithChip = Math.round(total.avgPuttsWithChip * 10 )/10;
            total.avgPuttsWithoutChip = Math.round(total.avgPuttsWithoutChip * 10)/10;
            total.puttsPerHole = Math.round(total.putts / 18 * 10)/10;
            
            return total;
        };
    var getExtra = proto.getExtra = function(scoreHole, teeHolePar){
            return scoreHole.score - (scoreHole.chips+scoreHole.putts) - (teeHolePar -2);// - (scoreHole.penalties?scoreHole.penalties:0);
        };
    var Handicap= proto.Handicap =  function (score,ESC,rating,slope){
      var useScore;
      if(ESC && ESC < score){
        useScore = ESC;
      }else{
        useScore = score;
      }
      return Math.round(
        (
           (useScore - rating)/ slope*113
        )*100) /100;
    };
    var processHole = function (scoreHole,teeHole){
        var result = scoreHole;
        result.GIR = false;
        if(scoreHole.putts && teeHole.par && scoreHole.score){
            result.GIR = isGIR(teeHole.par,scoreHole.score,scoreHole.putts);
        }
        
        result.Ch15 = (result.GIR && result.putts>2);
        result.shortGame = result.chips+result.putts;	
        if(scoreHole.penalties)
            result.penalties = scoreHole.penalties;
        else
            result.penalties = 0;
        result.extra = getExtra(result,teeHole.par);
        result.par = teeHole.par;
        result.yards = teeHole.yards;
        result.fairway = scoreHole.fairway;
        result.chipin =false;
        if(result.chips && result.chips > 0){
            result.scramble = result.chips == 1 && result.putts <= 1;
            if(result.putts === 0){
                result.chipIn = true;
            }
        }else{
            result.scramble = null;
        }
        if(scoreHole.penalties)
            result.penalties = scoreHole.penalties;
        else
            result.penalties = 0;
        if(scoreHole.playable){
            result.playable = true;
        }else
            result.playable = false;
        return result;
    };
    
     // Export for Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ScoreCalculator;
    }
    
    // AMD
    if (typeof define === 'function' && define.amd) {  
      define('scoreCalculator',[], function() {
        return ScoreCalculator;
      });
    }
    
    

return ScoreCalculator;

})();
 
 
define('models/score',['xdate','scoreCalculator'],function(xdate,scoreCalculator){
    var Score = Backbone.Model.extend({
        url:'scores',
        initialize:function(){
            var pretty,shortName,className,scrambleText;
           
            if(this.get("isGoal")){
                pretty="Gaol";
                shortName="Goal";
                className="goalFoot";
              
            }else{
                className="";
                pretty = (new xdate(this.get("date"),true)).toString('yyyy-MM-dd');     
                shortName = this.get("course")._id.substring(0,10) + "<span class=\"slash\">-</span>" + this.get("tee").name.substring(0,10);      
                
            }
            var stats =  this.get("stats");
            var fairwayText;
            var playableText;
            
            if(stats){
            scrambleText = stats.scrambles + "/" + stats.scrambleChances;
                fairwayText = stats.fairways + "/" + stats.totalFairways;
                playableText = stats.playable + "/" + stats.totalFairways;
            }else{
                fairwayText="";
                playableText="";
            }
            var eagles = this.get("eagles");
            var eagleAstrix = (eagles && eagles > 0)?"*":"";
            
            this.set({"scrambleText":scrambleText,"fairwayText":fairwayText,"playableText":playableText,"prettyDate":pretty,"eagleAstrix":eagleAstrix,'shortName':shortName,"className":className});
            
            
      }
    });
    return Score;
});
define('collections/scorelist',['models/score','xdate'],function(Score,xdate){
   var ScoreList = Backbone.Collection.extend({
       model: Score,
       url:'scores',
       lastN : function(n){
           var result = this.sortBy(function(i){
               return i.get("prettyDate");
           }).reverse();
           if(result.length > n){
                result = result.slice(0,n);
           }
           return result;
       },
       setFilter:function(fType,fValue){
           this.fType = fType;
           this.fValue = fValue;
       },
       filter : function(){
           console.log('filtering',this.fType, this.fValue,this)
           var self = this;
           switch(this.fType){
               case "year":
                    return _.filter(this.models,function(a){ 
                        return self.fValue == (new xdate(a.get("date"))).getFullYear();});
                case "last":
                    return this.lastN(this.fValue);
                    
           }
           return this;
       }
     
   });
   return ScoreList;
});
define('models/goal',[],function(){
    var Score = Backbone.Model.extend({
        url:'goals',
        initialize:function(){
            var goalDiffClass = "", yearDiffClass="";
            var higher = "";
            var lower = "";
            if(this.get("isHigherBetter")){
                higher = "better";
                lower ="worse";
            }else{
                lower = "better";
                higher ="worse";
            }
            
            
            if(this.get("yearDiff") > 0){
                yearDiffClass = higher;
            }else if(this.get("yearDiff") < 0){
                yearDiffClass = lower;
            }
            if(this.get("goalDiff") > 0){
                goalDiffClass = higher;
            }else if(this.get("goalDiff") < 0){
                goalDiffClass = lower;
            }
            this.set({"yearDiffClass":yearDiffClass,"goalDiffClass":goalDiffClass});
        }
        
    });
    return Score;
});
define('collections/goallist',['models/goal'],function(Goal){
   var GoalList = Backbone.Collection.extend({
       model: Goal,
       url:'goals'
     
   });
   return GoalList;
});
define('text!templates/goal.html',[],function () { return '<td>{{index}}</td>\n<td><span class="text" title="{{text}}">{{id}}</span></td>\n<td>{{lastYear}}</td>\n<td>{{thisYear}}</td>\n<td class="{{yearDiffClass}}">{{yearDiff}}</td>\n<td>{{goal}}</td>\n<td class="{{goalDiffClass}}">{{goalDiff}}</td>';});

define('views/goal',['text!templates/goal.html'],function(template){
    var GoalView = Backbone.View.extend({
        tagName:'tr',
        template: Handlebars.compile(template),
        events:{
            "touchstart span.text":"showTitleSleepy",
            "mouseover span.text":"showTitle",
            "span.text mouseout":"hideTitle"
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
        },
        render: function(){
            var $el = $(this.el);
         //   $el.data('scoreId', this.model.get('_id'));
            var html =this.template(this.model.toJSON());
            $el.html(html);
            return this;
        },
        showTitle:function(e){
            var firstTd = this.$el.find('span.text').first();
            $(firstTd).tooltip('show');
            //setTimeout(function(){ $(firstTd).tooltip('hide');},5000);
        },
        hideTitle:function(e){
          //  var firstTd = this.$el.find('span.text').first();
          //  firstTd.tooltip('hide');
        },
        showTitleSleepy:function(e){
            var firstTd = this.$el.find('span.text').first();
            firstTd.tooltip('show');
            setTimeout(function(){ $(firstTd).tooltip('hide');},5000);
        }
        
    });
    return GoalView;
});
define('views/goals',['views/goal'],function(GoalItemView){
    var GoalsView = Backbone.View.extend({
        el: '#goallist',
        tagName:'tbody',        
        events:{
        
        },
        initialize: function(){
             //this.collection.on('add', this.render, this);
        },
        render:function(){
            var self = this;
            self.$el.empty();
            this.collection.forEach(function(goal){
              var item = new GoalItemView({model:goal});
               self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return GoalsView;
});
define('config',['xdate'], function(xdate){
   var config = {};
   /* _.templateSettings= {//{interpolate: /\{\{(.+?)\}\}/g};
        evaluate : /\{\[([\s\S]+?)\]\}/g,
        interpolate : /\{\{([\s\S]+?)\}\}/g
    };*/
    _.templateSettings.interpolate= /\{\{(.+?)\}\}/g;
    Handlebars.registerHelper('prettydate', function(indate) {
        if(indate)
            return (new xdate(indate,true)).toString('yyyy-MM-dd');
        else
            return "";
    });
    Handlebars.registerHelper('indexclass', function(index) {
        if(index && index >= 19)
            return "counts";
        else
            return "";
    });
    Handlebars.registerHelper('predictCellClass', function(counts,keepsOrImprovesHandicap,isTop5,isSingleDigit) {
        if(isSingleDigit)
            return "singleDigit";
        if(isTop5)
            return "top5";
        if(keepsOrImprovesHandicap)
            return "improves";
        if(counts)
            return "counts";
        return "doesNotCount";
    });
    
    console.log('template settings set');
   return config;
});
define('models/course',[],function(){
    var Course = Backbone.Model.extend({
        url:'courses',
        initialize:function(){   
        }
    });
    return Course;
});
define('collections/courselist',['models/course'],function(Course){
   var CourseList = Backbone.Collection.extend({
       model: Course,
       url:'courses'
   });
   return CourseList;
});
define('models/courseStats',[],function(){
    var CourseStats = Backbone.Model.extend({
        url:'course/stats',
        initialize:function(){   
        }
    });
    return CourseStats;
});
define('text!templates/courseStats.html',[],function () { return '\n\n    \n<table cellpadding="0" cellspacing="0" class="table table-bordered table-striped table-hover scores">\n    <thead>\n    <tr>\n        <th>#</th>\n        <th>Fairway %</th>\n        <th>Playable %</th>\n        <th>GIR %</th>\n        <th>Avg Putts</th>\n        <th>Avg Score to Par</th>\n        <th>Total Penalties</th>\n    </tr>\n    </thead>\n    <tbody>\n    {{#holes}}\n    <tr>\n        <td>{{_id}}</td>\n        <td title="{{value.fairway}} of {{value.count}}">{{value.fairwayPercent}}</td>\n        <td title="{{value.playable}} of {{value.count}}">{{value.playablePercent}}</td>\n        <td title="{{value.GIR}} of {{value.count}}">{{value.GIRPercent}}</td>\n        <td title="">{{value.avgPutts}}</td>\n        <td title="">{{value.avgScoreToPar}}</td>\n        <td>{{value.penalties}}</td>\n    </tr>\n    {{/holes}}\n    </tbody>\n</table>\n';});

define('views/courseStats',['text!templates/courseStats.html'],function(template){
    var CourseStatsView = Backbone.View.extend({
        tagName:'div',
        el:'#courseStats',
        template: Handlebars.compile(template),
        events:{
            
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
        },
        render: function(){
            console.log("rendering coures stats view",this.model.toJSON());
            var $el = $(this.el);
         //   $el.data('scoreId', this.model.get('_id'));
            var html =this.template(this.model.toJSON());
            $el.html(html);
            return this;
        }
    });
    return CourseStatsView;
});
define('text!templates/course.html',[],function () { return '<a href="#Coures/{{_id}}" class="showStats"><span>{{name}}</span></a>\n';});

define('models/tee',[],function(){
    var Tee = Backbone.Model.extend({
        url:'teePredictions',
        initialize:function(){   
        }
    });
    return Tee;
});
define('collections/tees',['models/tee'],function(Tee){
   var TeeList = Backbone.Collection.extend({
       model: Tee,
       url:'teePredictions'
   });
   return TeeList;
});
define('text!templates/tee.html',[],function () { return '<a href="#Tee{{_id}}" data-toggle="tab">{{name}}</a>\n';});

define('views/tee',['text!templates/tee.html'],function(template){
    var TeeView = Backbone.View.extend({
        tagName:'li',
        className:'tee' ,
        template: Handlebars.compile(template),
        events:{
           // "click a.showStats":"showStats"
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
        },
        render: function(){
            var $el = $(this.el);
         //   $el.data('scoreId', this.model.get('_id'));
            var html =this.template(this.model.toJSON());
            $el.html(html);
            return this;
        },
        showPrediction:function(e){
            e.preventDefault();
            /*//set this course as active after clearing all other active ones
            this.$el.parent().find("a.active").removeClass('active');
            this.$el.find("a").addClass('active');
            
            var courseId = this.model.get("_id");
            var courseName = this.model.get("name");
            //fetch the course stats data
            var model = new CourseStats();
            model.fetch({data:{"courseId":courseId},success: function(res){ 
                res.set({"courseName":courseName});
                var courseStatsView = new CourseStatsView({model:res});
                courseStatsView.render();
            
            }});
            //fetch the tee List
            
            this.collections.tees = new TeeList();
            this.views.teeList = new TeeListView({collection:this.collections.tees});
            this.collections.tees.fetch({data:{"courseId":courseId},success: function(res){ 
                this.views.teeList.render();
            }});
            
            //fetch prediction stats for first tee
            
           // var teeId = this.model.
            */
            
            
        }
        
    });
    return TeeView;
});
define('views/tees',['views/tee'],function(TeeView){
    var TeesView = Backbone.View.extend({
        el: '#courseNav',
        events:{
        },
        initialize: function(){
        },
        render:function(){
            var self = this;
            var firstListElementLink = self.$el.children().first().children().first();
            firstListElementLink.click(); // click on the first tab to reset active content
            self.$el.find("li.tee").remove();
            this.collection.forEach(function(tee){
                var item = new TeeView({model:tee});
                self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return TeesView;
});
define('text!templates/teeContent.html',[],function () { return ' <div class="row-fluid">\n    <div class="span6">\n        <table cellpadding="0" cellspacing="0" class="predictions table table-bordered table-striped table-hover scores ">\n            <thead>\n                <th>Score</th>\n                <th>Round Handicap</th>\n                <th>New Handicap</th>\n            </thead>\n            <tbody>\n                {{#predictions}}\n                    <tr class="{{predictCellClass counts keepsOrImprovesHandicap isTop5 isSingleDigit}}" >\n                        <td>{{score}}</td>\n                        <td>{{handicap}}</td>\n                        <td>{{newHandicap}}</td>\n                    </tr>\n                {{/predictions}}\n            </tbody>\n        </table>\n    </div>\n    <div class="span6">\n        <div class="row-fluid">\n            <div class="span12">\n                <dl class="dl-horizontal">\n                    <dt>Rating</dt><dd>{{rating}}</dd>\n                   <dt>Slope</dt><dd>{{slope}}</dd>\n                   <dt>Current HC</dt><dd>{{currentHandicap}}</dd>\n                   <dt>nextBest</dt><dd>{{nextBest}}</dd>\n                   <dt>Getting Bumped</dt><dd>{{#if isScoreBeingBumped}}Yes{{else}}No{{/if}}</dd>\n               </dl>\n            </div>\n        </div>\n        <div class="row-fluid">\n            <div class="span12">\n            <table cellpadding="0" cellspacing="0" class="predictions table table-bordered table-striped table-hover scores">\n                <thead>\n                    <th>Index</th>\n                    <th>Date</th>\n                    <th>Score</th>\n                    <th>Handicap</th>\n                </thead>\n                <tbody>\n                    {{#scores}}\n                        <tr class="{{indexclass index}}" >\n                            <td>{{index}}</td>  \n                            <td>{{prettydate date}}</td>\n                            <td>{{score}}</td>\n                            <td>{{handicap}}</td>\n                        </tr>\n                    {{/scores}}\n                </tbody>\n            </table>\n            </div>\n        </div>\n    </div>\n </div>\n        \n\n';});

define('views/teeContent',['text!templates/teeContent.html'],function(template){
    var TeeView = Backbone.View.extend({
        tagName:'div',
        className:'tab-pane tee',
        //el:'tttt' /function(){ return "Tee" + this.model.get("_id"); },
        template: Handlebars.compile(template),
        events:{
           // "click a.showStats":"showStats"
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
        },
        render: function(){
            var $el = $(this.el);
            var html =this.template(this.model.toJSON());
            $el.html(html);
            $el.attr("id","Tee" + this.model.get("_id"));
            return this;
        }
    });
    return TeeView;
});
define('views/teesContent',['views/teeContent'],function(TeeContentView){
    var TeesView = Backbone.View.extend({
        el: '#teeContent',
        events:{
        },
        initialize: function(){
        },
        render:function(){
            var self = this;
            self.$el.find("div.tee").remove();
            this.collection.forEach(function(tee){
                var item = new TeeContentView({model:tee});
                self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return TeesView;
});
define('views/course',['models/courseStats','views/courseStats','text!templates/course.html','collections/tees','views/tees','views/teesContent'],function(CourseStats,CourseStatsView,template,TeeList,TeeListView,TeesContentView){
    var CourseView = Backbone.View.extend({
        tagName:'li',
        template: Handlebars.compile(template),
        collections:{},
        views :{},
        events:{
            "click a.showStats":"showStats"
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
        },
        render: function(){
            var $el = $(this.el);
         //   $el.data('scoreId', this.model.get('_id'));
            var html =this.template(this.model.toJSON());
            $el.html(html);
            return this;
        },
        showStats:function(e){
            e.preventDefault();
            var self = this;
            //set this course as active after clearing all other active ones
            this.$el.parent().find("a.active").removeClass('active');
            this.$el.find("a").addClass('active');
            
            var courseId = this.model.get("_id");
            var courseName = this.model.get("name");
            //fetch the course stats data
            var model = new CourseStats();
            model.fetch({data:{"courseId":courseId},success: function(res){ 
                res.set({"courseName":courseName});
                var courseStatsView = new CourseStatsView({model:res});
                courseStatsView.render();
            
            }});
            //fetch the tee List
            
            this.collections.tees = new TeeList();
            this.views.teeList = new TeeListView({collection:this.collections.tees});
            this.views.teesContent = new TeesContentView({collection:this.collections.tees});
            this.collections.tees.fetch({data:{"courseId":courseId},success: function(res){ 
                self.views.teeList.render();
                self.views.teesContent.render();
            }});
            
            //fetch prediction stats for first tee
            
           // var teeId = this.model.
            
            
            
        }
        
    });
    return CourseView;
});
define('views/courses',['views/course'],function(CourseView){
    var CoursesView = Backbone.View.extend({
        el: '#courselist',
        subEl:null,
        events:{
        
        },
        initialize: function(){
             //this.collection.on('add', this.render, this);
        },
        render:function(){
            var self = this;
            self.$el.empty();
            this.collection.forEach(function(course){
                var item = new CourseView({model:course});
                self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return CoursesView;
});
define('views/courseLayer',['collections/courselist','views/courses'],function(CourseList,CourseListView){
    var CourseLayer = Backbone.View.extend({
        el: '#courseLayer',
        tagName:'div',
        events:{
        
        },
        hide:function(){
            $(this.el).hide();
        },
        show:function(){
            var self = this;
            this.collections.courses.fetch({
                data:{},
                success: function(res){
                    self.views.courses.render(); 
                    $(self.el).show();
                }
            });
        },
        collections:[],
        views:[],
        initialize: function(){
             //this.collection.on('add', this.render, this);
            this.collections.courses = new CourseList();
            this.views.courses = new CourseListView({collection:this.collections.courses});
        },
        render:function(){  
            
            
            return this;
        }
    });
    return CourseLayer;
});
d3=function(){function n(n){return null!=n&&!isNaN(n)}function t(n){return n.length}function e(n){for(var t=1;n*t%1;)t*=10;return t}function r(n,t){try{for(var e in t)Object.defineProperty(n.prototype,e,{value:t[e],enumerable:!1})}catch(r){n.prototype=t}}function i(){}function u(){}function a(n,t,e){return function(){var r=e.apply(t,arguments);return r===t?n:r}}function o(){}function c(n){function t(){for(var t,r=e,i=-1,u=r.length;++i<u;)(t=r[i].on)&&t.apply(this,arguments);return n}var e=[],r=new i;return t.on=function(t,i){var u,a=r.get(t);return arguments.length<2?a&&a.on:(a&&(a.on=null,e=e.slice(0,u=e.indexOf(a)).concat(e.slice(u+1)),r.remove(t)),i&&e.push(r.set(t,{on:i})),n)},t}function l(){ua.event.stopPropagation(),ua.event.preventDefault()}function f(){for(var n,t=ua.event;n=t.sourceEvent;)t=n;return t}function s(n,t){function e(){n.on(t,null)}n.on(t,function(){l(),e()},!0),setTimeout(e,0)}function h(n){for(var t=new o,e=0,r=arguments.length;++e<r;)t[arguments[e]]=c(t);return t.of=function(e,r){return function(i){try{var u=i.sourceEvent=ua.event;i.target=n,ua.event=i,t[i.type].apply(e,r)}finally{ua.event=u}}},t}function g(n,t){var e=n.ownerSVGElement||n;if(e.createSVGPoint){var r=e.createSVGPoint();if(0>pa&&(oa.scrollX||oa.scrollY)){e=ua.select(aa.body).append("svg").style("position","absolute").style("top",0).style("left",0);var i=e[0][0].getScreenCTM();pa=!(i.f||i.e),e.remove()}return pa?(r.x=t.pageX,r.y=t.pageY):(r.x=t.clientX,r.y=t.clientY),r=r.matrixTransform(n.getScreenCTM().inverse()),[r.x,r.y]}var u=n.getBoundingClientRect();return[t.clientX-u.left-n.clientLeft,t.clientY-u.top-n.clientTop]}function p(n){for(var t=-1,e=n.length,r=[];++t<e;)r.push(n[t]);return r}function d(n){return Array.prototype.slice.call(n)}function m(n){return va(n,wa),n}function v(n){return function(){return ya(n,this)}}function y(n){return function(){return Ma(n,this)}}function M(n,t){function e(){this.removeAttribute(n)}function r(){this.removeAttributeNS(n.space,n.local)}function i(){this.setAttribute(n,t)}function u(){this.setAttributeNS(n.space,n.local,t)}function a(){var e=t.apply(this,arguments);null==e?this.removeAttribute(n):this.setAttribute(n,e)}function o(){var e=t.apply(this,arguments);null==e?this.removeAttributeNS(n.space,n.local):this.setAttributeNS(n.space,n.local,e)}return n=ua.ns.qualify(n),null==t?n.local?r:e:"function"==typeof t?n.local?o:a:n.local?u:i}function x(n){return n.trim().replace(/\s+/g," ")}function b(n){return RegExp("(?:^|\\s+)"+ua.requote(n)+"(?:\\s+|$)","g")}function _(n,t){function e(){for(var e=-1;++e<i;)n[e](this,t)}function r(){for(var e=-1,r=t.apply(this,arguments);++e<i;)n[e](this,r)}n=n.trim().split(/\s+/).map(w);var i=n.length;return"function"==typeof t?r:e}function w(n){var t=b(n);return function(e,r){if(i=e.classList)return r?i.add(n):i.remove(n);var i=e.getAttribute("class")||"";r?(t.lastIndex=0,t.test(i)||e.setAttribute("class",x(i+" "+n))):e.setAttribute("class",x(i.replace(t," ")))}}function S(n,t,e){function r(){this.style.removeProperty(n)}function i(){this.style.setProperty(n,t,e)}function u(){var r=t.apply(this,arguments);null==r?this.style.removeProperty(n):this.style.setProperty(n,r,e)}return null==t?r:"function"==typeof t?u:i}function E(n,t){function e(){delete this[n]}function r(){this[n]=t}function i(){var e=t.apply(this,arguments);null==e?delete this[n]:this[n]=e}return null==t?e:"function"==typeof t?i:r}function k(n){return{__data__:n}}function A(n){return function(){return _a(this,n)}}function N(n){return arguments.length||(n=ua.ascending),function(t,e){return!t-!e||n(t.__data__,e.__data__)}}function q(){}function T(n,t,e){function r(){var t=this[a];t&&(this.removeEventListener(n,t,t.$),delete this[a])}function i(){var i=c(t,da(arguments));r.call(this),this.addEventListener(n,this[a]=i,i.$=e),i._=t}function u(){var t,e=RegExp("^__on([^.]+)"+ua.requote(n)+"$");for(var r in this)if(t=r.match(e)){var i=this[r];this.removeEventListener(t[1],i,i.$),delete this[r]}}var a="__on"+n,o=n.indexOf("."),c=C;o>0&&(n=n.substring(0,o));var l=ka.get(n);return l&&(n=l,c=z),o?t?i:r:t?q:u}function C(n,t){return function(e){var r=ua.event;ua.event=e,t[0]=this.__data__;try{n.apply(this,t)}finally{ua.event=r}}}function z(n,t){var e=C(n,t);return function(n){var t=this,r=n.relatedTarget;r&&(r===t||r.compareDocumentPosition(t)&8)||e.call(t,n)}}function D(n,t){for(var e=0,r=n.length;r>e;e++)for(var i,u=n[e],a=0,o=u.length;o>a;a++)(i=u[a])&&t(i,a,e);return n}function j(n){return va(n,Aa),n}function L(){}function F(n,t,e){return new H(n,t,e)}function H(n,t,e){this.h=n,this.s=t,this.l=e}function P(n,t,e){function r(n){return n>360?n-=360:0>n&&(n+=360),60>n?u+(a-u)*n/60:180>n?a:240>n?u+(a-u)*(240-n)/60:u}function i(n){return Math.round(r(n)*255)}var u,a;return n=isNaN(n)?0:(n%=360)<0?n+360:n,t=isNaN(t)?0:0>t?0:t>1?1:t,e=0>e?0:e>1?1:e,a=.5>=e?e*(1+t):e+t-e*t,u=2*e-a,tt(i(n+120),i(n),i(n-120))}function R(n){return n>0?1:0>n?-1:0}function O(n){return Math.acos(Math.max(-1,Math.min(1,n)))}function Y(n){return n>1?Da/2:-1>n?-Da/2:Math.asin(n)}function U(n){return(Math.exp(n)-Math.exp(-n))/2}function I(n){return(Math.exp(n)+Math.exp(-n))/2}function V(n){return(n=Math.sin(n/2))*n}function X(n,t,e){return new Z(n,t,e)}function Z(n,t,e){this.h=n,this.c=t,this.l=e}function B(n,t,e){return isNaN(n)&&(n=0),isNaN(t)&&(t=0),$(e,Math.cos(n*=La)*t,Math.sin(n)*t)}function $(n,t,e){return new J(n,t,e)}function J(n,t,e){this.l=n,this.a=t,this.b=e}function G(n,t,e){var r=(n+16)/116,i=r+t/500,u=r-e/200;return i=W(i)*Ra,r=W(r)*Oa,u=W(u)*Ya,tt(nt(3.2404542*i-1.5371385*r-.4985314*u),nt(-.969266*i+1.8760108*r+.041556*u),nt(.0556434*i-.2040259*r+1.0572252*u))}function K(n,t,e){return n>0?X(Math.atan2(e,t)*Fa,Math.sqrt(t*t+e*e),n):X(0/0,0/0,n)}function W(n){return n>.206893034?n*n*n:(n-4/29)/7.787037}function Q(n){return n>.008856?Math.pow(n,1/3):7.787037*n+4/29}function nt(n){return Math.round(255*(.00304>=n?12.92*n:1.055*Math.pow(n,1/2.4)-.055))}function tt(n,t,e){return new et(n,t,e)}function et(n,t,e){this.r=n,this.g=t,this.b=e}function rt(n){return 16>n?"0"+Math.max(0,n).toString(16):Math.min(255,n).toString(16)}function it(n,t,e){var r,i,u,a=0,o=0,c=0;if(r=/([a-z]+)\((.*)\)/i.exec(n))switch(i=r[2].split(","),r[1]){case"hsl":return e(parseFloat(i[0]),parseFloat(i[1])/100,parseFloat(i[2])/100);case"rgb":return t(ct(i[0]),ct(i[1]),ct(i[2]))}return(u=Va.get(n))?t(u.r,u.g,u.b):(null!=n&&n.charAt(0)==="#"&&(n.length===4?(a=n.charAt(1),a+=a,o=n.charAt(2),o+=o,c=n.charAt(3),c+=c):n.length===7&&(a=n.substring(1,3),o=n.substring(3,5),c=n.substring(5,7)),a=parseInt(a,16),o=parseInt(o,16),c=parseInt(c,16)),t(a,o,c))}function ut(n,t,e){var r,i,u=Math.min(n/=255,t/=255,e/=255),a=Math.max(n,t,e),o=a-u,c=(a+u)/2;return o?(i=.5>c?o/(a+u):o/(2-a-u),r=n==a?(t-e)/o+(e>t?6:0):t==a?(e-n)/o+2:(n-t)/o+4,r*=60):(r=0/0,i=c>0&&1>c?0:r),F(r,i,c)}function at(n,t,e){n=ot(n),t=ot(t),e=ot(e);var r=Q((.4124564*n+.3575761*t+.1804375*e)/Ra),i=Q((.2126729*n+.7151522*t+.072175*e)/Oa),u=Q((.0193339*n+.119192*t+.9503041*e)/Ya);return $(116*i-16,500*(r-i),200*(i-u))}function ot(n){return(n/=255)<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)}function ct(n){var t=parseFloat(n);return n.charAt(n.length-1)==="%"?Math.round(2.55*t):t}function lt(n){return"function"==typeof n?n:function(){return n}}function ft(n){return n}function st(n){return function(t,e,r){return arguments.length===2&&"function"==typeof e&&(r=e,e=null),ht(t,e,n,r)}}function ht(n,t,e,r){function i(){var n,t=c.status;if(!t&&c.responseText||t>=200&&300>t||304===t){try{n=e.call(u,c)}catch(r){return a.error.call(u,r),void 0}a.load.call(u,n)}else a.error.call(u,c)}var u={},a=ua.dispatch("progress","load","error"),o={},c=new(oa.XDomainRequest&&/^(http(s)?:)?\/\//.test(n)?XDomainRequest:XMLHttpRequest);return"onload"in c?c.onload=c.onerror=i:c.onreadystatechange=function(){c.readyState>3&&i()},c.onprogress=function(n){var t=ua.event;ua.event=n;try{a.progress.call(u,c)}finally{ua.event=t}},u.header=function(n,t){return n=(n+"").toLowerCase(),arguments.length<2?o[n]:(null==t?delete o[n]:o[n]=t+"",u)},u.mimeType=function(n){return arguments.length?(t=null==n?null:n+"",u):t},u.response=function(n){return e=n,u},["get","post"].forEach(function(n){u[n]=function(){return u.send.apply(u,[n].concat(da(arguments)))}}),u.send=function(e,r,i){if(arguments.length===2&&"function"==typeof r&&(i=r,r=null),c.open(e,n,!0),null==t||"accept"in o||(o.accept=t+",*/*"),c.setRequestHeader)for(var a in o)c.setRequestHeader(a,o[a]);return null!=t&&c.overrideMimeType&&c.overrideMimeType(t),null!=i&&u.on("error",i).on("load",function(n){i(null,n)}),c.send(null==r?null:r),u},u.abort=function(){return c.abort(),u},ua.rebind(u,a,"on"),null==r?u:u.get(gt(r))}function gt(n){return n.length===1?function(t,e){n(null==t?e:null)}:n}function pt(n,t){function e(n,e,u){arguments.length<3&&(u=e,e=null);var a=ua.xhr(n,t,u);return a.row=function(n){return arguments.length?a.response((e=n)==null?r:i(n)):e},a.row(e)}function r(n){return e.parse(n.responseText)}function i(n){return function(t){return e.parse(t.responseText,n)}}function a(t){return t.map(o).join(n)}function o(n){return c.test(n)?'"'+n.replace(/\"/g,'""')+'"':n}var c=RegExp('["'+n+"\n]"),l=n.charCodeAt(0);return e.parse=function(n,t){var r;return e.parseRows(n,function(n,e){if(r)return r(n,e-1);var i=Function("d","return {"+n.map(function(n,t){return JSON.stringify(n)+": d["+t+"]"}).join(",")+"}");r=t?function(n,e){return t(i(n),e)}:i})},e.parseRows=function(n,t){function e(){if(f>=c)return a;if(i)return i=!1,u;var t=f;if(n.charCodeAt(t)===34){for(var e=t;e++<c;)if(n.charCodeAt(e)===34){if(n.charCodeAt(e+1)!==34)break;++e}f=e+2;var r=n.charCodeAt(e+1);return 13===r?(i=!0,n.charCodeAt(e+2)===10&&++f):10===r&&(i=!0),n.substring(t+1,e).replace(/""/g,'"')}for(;c>f;){var r=n.charCodeAt(f++),o=1;if(10===r)i=!0;else if(13===r)i=!0,n.charCodeAt(f)===10&&(++f,++o);else if(r!==l)continue;return n.substring(t,f-o)}return n.substring(t)}for(var r,i,u={},a={},o=[],c=n.length,f=0,s=0;(r=e())!==a;){for(var h=[];r!==u&&r!==a;)h.push(r),r=e();(!t||(h=t(h,s++)))&&o.push(h)}return o},e.format=function(t){if(Array.isArray(t[0]))return e.formatRows(t);var r=new u,i=[];return t.forEach(function(n){for(var t in n)r.has(t)||i.push(r.add(t))}),[i.map(o).join(n)].concat(t.map(function(t){return i.map(function(n){return o(t[n])}).join(n)})).join("\n")},e.formatRows=function(n){return n.map(a).join("\n")},e}function dt(){var n=mt(),t=vt()-n;t>24?(isFinite(t)&&(clearTimeout($a),$a=setTimeout(dt,t)),Ba=0):(Ba=1,Ja(dt))}function mt(){for(var n=Date.now(),t=Xa;t;)n>=t.time&&(t.flush=t.callback(n-t.time)),t=t.next;return n}function vt(){for(var n,t=Xa,e=1/0;t;)t.flush?t=n?n.next=t.next:Xa=t.next:(t.time<e&&(e=t.time),t=(n=t).next);return Za=n,e}function yt(n,t){var e=Math.pow(10,Math.abs(8-t)*3);return{scale:t>8?function(n){return n/e}:function(n){return n*e},symbol:n}}function Mt(n,t){return t-(n?Math.ceil(Math.log(n)/Math.LN10):1)}function xt(n){return n+""}function bt(n,t){n&&uo.hasOwnProperty(n.type)&&uo[n.type](n,t)}function _t(n,t,e){var r,i=-1,u=n.length-e;for(t.lineStart();++i<u;)r=n[i],t.point(r[0],r[1]);t.lineEnd()}function wt(n,t){var e=-1,r=n.length;for(t.polygonStart();++e<r;)_t(n[e],t,1);t.polygonEnd()}function St(){function n(n,t){n*=La,t=t*La/2+Da/4;var e=n-r,a=Math.cos(t),o=Math.sin(t),c=u*o,l=i*a+c*Math.cos(e),f=c*Math.sin(e);oo+=Math.atan2(f,l),r=n,i=a,u=o}var t,e,r,i,u;co.point=function(a,o){co.point=n,r=(t=a)*La,i=Math.cos(o=(e=o)*La/2+Da/4),u=Math.sin(o)},co.lineEnd=function(){n(t,e)}}function Et(n){var t=n[0],e=n[1],r=Math.cos(e);return[r*Math.cos(t),r*Math.sin(t),Math.sin(e)]}function kt(n,t){return n[0]*t[0]+n[1]*t[1]+n[2]*t[2]}function At(n,t){return[n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]]}function Nt(n,t){n[0]+=t[0],n[1]+=t[1],n[2]+=t[2]}function qt(n,t){return[n[0]*t,n[1]*t,n[2]*t]}function Tt(n){var t=Math.sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);n[0]/=t,n[1]/=t,n[2]/=t}function Ct(n){return[Math.atan2(n[1],n[0]),Math.asin(Math.max(-1,Math.min(1,n[2])))]}function zt(n,t){return Math.abs(n[0]-t[0])<ja&&Math.abs(n[1]-t[1])<ja}function Dt(n,t){if(!lo){++fo,n*=La;var e=Math.cos(t*=La);so+=(e*Math.cos(n)-so)/fo,ho+=(e*Math.sin(n)-ho)/fo,go+=(Math.sin(t)-go)/fo}}function jt(){var n,t;lo=1,Lt(),lo=2;var e=po.point;po.point=function(r,i){e(n=r,t=i)},po.lineEnd=function(){po.point(n,t),Ft(),po.lineEnd=Ft}}function Lt(){function n(n,i){n*=La;var u=Math.cos(i*=La),a=u*Math.cos(n),o=u*Math.sin(n),c=Math.sin(i),l=Math.atan2(Math.sqrt((l=e*c-r*o)*l+(l=r*a-t*c)*l+(l=t*o-e*a)*l),t*a+e*o+r*c);fo+=l,so+=l*(t+(t=a)),ho+=l*(e+(e=o)),go+=l*(r+(r=c))}var t,e,r;lo>1||(1>lo&&(lo=1,fo=so=ho=go=0),po.point=function(i,u){i*=La;var a=Math.cos(u*=La);t=a*Math.cos(i),e=a*Math.sin(i),r=Math.sin(u),po.point=n})}function Ft(){po.point=Dt}function Ht(){return!0}function Pt(n,t,e,r,i){var u=[],a=[];if(n.forEach(function(n){if(!((t=n.length-1)<=0)){var t,e=n[0],r=n[t];if(zt(e,r)){i.lineStart();for(var o=0;t>o;++o)i.point((e=n[o])[0],e[1]);return i.lineEnd(),void 0}var c={point:e,points:n,other:null,visited:!1,entry:!0,subject:!0},l={point:e,points:[e],other:c,visited:!1,entry:!1,subject:!1};c.other=l,u.push(c),a.push(l),c={point:r,points:[r],other:null,visited:!1,entry:!1,subject:!0},l={point:r,points:[r],other:c,visited:!1,entry:!0,subject:!1},c.other=l,u.push(c),a.push(l)}}),a.sort(t),Rt(u),Rt(a),u.length){if(e)for(var o=1,c=!e(a[0].point),l=a.length;l>o;++o)a[o].entry=c=!c;for(var f,s,h,g=u[0];;){for(f=g;f.visited;)if((f=f.next)===g)return;s=f.points,i.lineStart();do{if(f.visited=f.other.visited=!0,f.entry){if(f.subject)for(var o=0;o<s.length;o++)i.point((h=s[o])[0],h[1]);else r(f.point,f.next.point,1,i);f=f.next}else{if(f.subject){s=f.prev.points;for(var o=s.length;--o>=0;)i.point((h=s[o])[0],h[1])}else r(f.point,f.prev.point,-1,i);f=f.prev}f=f.other,s=f.points}while(!f.visited);i.lineEnd()}}}function Rt(n){if(t=n.length){for(var t,e,r=0,i=n[0];++r<t;)i.next=e=n[r],e.prev=i,i=e;i.next=e=n[0],e.prev=i}}function Ot(n,t,e){return function(r){function i(t,e){n(t,e)&&r.point(t,e)}function u(n,t){m.point(n,t)}function a(){v.point=u,m.lineStart()}function o(){v.point=i,m.lineEnd()}function c(n,t){M.point(n,t),d.push([n,t])}function l(){M.lineStart(),d=[]}function f(){c(d[0][0],d[0][1]),M.lineEnd();var n,t=M.clean(),e=y.buffer(),i=e.length;if(!i)return p=!0,g+=It(d,-1),d=null,void 0;if(d=null,1&t){n=e[0],h+=It(n,1);var u,i=n.length-1,a=-1;for(r.lineStart();++a<i;)r.point((u=n[a])[0],u[1]);return r.lineEnd(),void 0}i>1&&2&t&&e.push(e.pop().concat(e.shift())),s.push(e.filter(Yt))}var s,h,g,p,d,m=t(r),v={point:i,lineStart:a,lineEnd:o,polygonStart:function(){v.point=c,v.lineStart=l,v.lineEnd=f,p=!1,g=h=0,s=[],r.polygonStart()},polygonEnd:function(){v.point=i,v.lineStart=a,v.lineEnd=o,s=ua.merge(s),s.length?Pt(s,Vt,null,e,r):(-ja>h||p&&-ja>g)&&(r.lineStart(),e(null,null,1,r),r.lineEnd()),r.polygonEnd(),s=null},sphere:function(){r.polygonStart(),r.lineStart(),e(null,null,1,r),r.lineEnd(),r.polygonEnd()}},y=Ut(),M=t(y);return v}}function Yt(n){return n.length>1}function Ut(){var n,t=[];return{lineStart:function(){t.push(n=[])},point:function(t,e){n.push([t,e])},lineEnd:q,buffer:function(){var e=t;return t=[],n=null,e},rejoin:function(){t.length>1&&t.push(t.pop().concat(t.shift()))}}}function It(n,t){if(!(e=n.length))return 0;for(var e,r,i,u=0,a=0,o=n[0],c=o[0],l=o[1],f=Math.cos(l),s=Math.atan2(t*Math.sin(c)*f,Math.sin(l)),h=1-t*Math.cos(c)*f,g=s;++u<e;)o=n[u],f=Math.cos(l=o[1]),r=Math.atan2(t*Math.sin(c=o[0])*f,Math.sin(l)),i=1-t*Math.cos(c)*f,Math.abs(h-2)<ja&&Math.abs(i-2)<ja||(Math.abs(i)<ja||Math.abs(h)<ja||(Math.abs(Math.abs(r-s)-Da)<ja?i+h>2&&(a+=4*(r-s)):a+=Math.abs(h-2)<ja?4*(r-g):((3*Da+r-s)%(2*Da)-Da)*(h+i)),g=s,s=r,h=i);return a}function Vt(n,t){return((n=n.point)[0]<0?n[1]-Da/2-ja:Da/2-n[1])-((t=t.point)[0]<0?t[1]-Da/2-ja:Da/2-t[1])}function Xt(n){var t,e=0/0,r=0/0,i=0/0;return{lineStart:function(){n.lineStart(),t=1},point:function(u,a){var o=u>0?Da:-Da,c=Math.abs(u-e);Math.abs(c-Da)<ja?(n.point(e,r=(r+a)/2>0?Da/2:-Da/2),n.point(i,r),n.lineEnd(),n.lineStart(),n.point(o,r),n.point(u,r),t=0):i!==o&&c>=Da&&(Math.abs(e-i)<ja&&(e-=i*ja),Math.abs(u-o)<ja&&(u-=o*ja),r=Zt(e,r,u,a),n.point(i,r),n.lineEnd(),n.lineStart(),n.point(o,r),t=0),n.point(e=u,r=a),i=o},lineEnd:function(){n.lineEnd(),e=r=0/0},clean:function(){return 2-t}}}function Zt(n,t,e,r){var i,u,a=Math.sin(n-e);return Math.abs(a)>ja?Math.atan((Math.sin(t)*(u=Math.cos(r))*Math.sin(e)-Math.sin(r)*(i=Math.cos(t))*Math.sin(n))/(i*u*a)):(t+r)/2}function Bt(n,t,e,r){var i;if(null==n)i=e*Da/2,r.point(-Da,i),r.point(0,i),r.point(Da,i),r.point(Da,0),r.point(Da,-i),r.point(0,-i),r.point(-Da,-i),r.point(-Da,0),r.point(-Da,i);else if(Math.abs(n[0]-t[0])>ja){var u=(n[0]<t[0]?1:-1)*Da;i=e*u/2,r.point(-u,i),r.point(0,i),r.point(u,i)}else r.point(t[0],t[1])}function $t(n){function t(n,t){return Math.cos(n)*Math.cos(t)>u}function e(n){var e,u,c,l,f;return{lineStart:function(){l=c=!1,f=1},point:function(s,h){var g,p=[s,h],d=t(s,h),m=a?d?0:i(s,h):d?i(s+(0>s?Da:-Da),h):0;if(!e&&(l=c=d)&&n.lineStart(),d!==c&&(g=r(e,p),(zt(e,g)||zt(p,g))&&(p[0]+=ja,p[1]+=ja,d=t(p[0],p[1]))),d!==c)f=0,d?(n.lineStart(),g=r(p,e),n.point(g[0],g[1])):(g=r(e,p),n.point(g[0],g[1]),n.lineEnd()),e=g;else if(o&&e&&a^d){var v;m&u||!(v=r(p,e,!0))||(f=0,a?(n.lineStart(),n.point(v[0][0],v[0][1]),n.point(v[1][0],v[1][1]),n.lineEnd()):(n.point(v[1][0],v[1][1]),n.lineEnd(),n.lineStart(),n.point(v[0][0],v[0][1])))}!d||e&&zt(e,p)||n.point(p[0],p[1]),e=p,c=d,u=m},lineEnd:function(){c&&n.lineEnd(),e=null},clean:function(){return f|(l&&c)<<1}}}function r(n,t,e){var r=Et(n),i=Et(t),a=[1,0,0],o=At(r,i),c=kt(o,o),l=o[0],f=c-l*l;if(!f)return!e&&n;var s=u*c/f,h=-u*l/f,g=At(a,o),p=qt(a,s),d=qt(o,h);Nt(p,d);var m=g,v=kt(p,m),y=kt(m,m),M=v*v-y*(kt(p,p)-1);if(!(0>M)){var x=Math.sqrt(M),b=qt(m,(-v-x)/y);if(Nt(b,p),b=Ct(b),!e)return b;var _,w=n[0],S=t[0],E=n[1],k=t[1];w>S&&(_=w,w=S,S=_);var A=S-w,N=Math.abs(A-Da)<ja,q=N||ja>A;if(!N&&E>k&&(_=E,E=k,k=_),q?N?E+k>0^b[1]<(Math.abs(b[0]-w)<ja?E:k):E<=b[1]&&b[1]<=k:A>Da^(w<=b[0]&&b[0]<=S)){var T=qt(m,(-v+x)/y);return Nt(T,p),[b,Ct(T)]}}}function i(t,e){var r=a?n:Da-n,i=0;return-r>t?i|=1:t>r&&(i|=2),-r>e?i|=4:e>r&&(i|=8),i}var u=Math.cos(n),a=u>0,o=Math.abs(u)>ja,c=oe(n,6*La);return Ot(t,e,c)}function Jt(n,t,e,r){function i(r,i){return Math.abs(r[0]-n)<ja?i>0?0:3:Math.abs(r[0]-e)<ja?i>0?2:1:Math.abs(r[1]-t)<ja?i>0?1:0:i>0?3:2}function u(n,t){return a(n.point,t.point)}function a(n,t){var e=i(n,1),r=i(t,1);return e!==r?e-r:0===e?t[1]-n[1]:1===e?n[0]-t[0]:2===e?n[1]-t[1]:t[0]-n[0]}function o(i,u){var a=u[0]-i[0],o=u[1]-i[1],c=[0,1];return Math.abs(a)<ja&&Math.abs(o)<ja?n<=i[0]&&i[0]<=e&&t<=i[1]&&i[1]<=r:Gt(n-i[0],a,c)&&Gt(i[0]-e,-a,c)&&Gt(t-i[1],o,c)&&Gt(i[1]-r,-o,c)?(c[1]<1&&(u[0]=i[0]+c[1]*a,u[1]=i[1]+c[1]*o),c[0]>0&&(i[0]+=c[0]*a,i[1]+=c[0]*o),!0):!1}return function(c){function l(u){var a=i(u,-1),o=f([0===a||3===a?n:e,a>1?r:t]);return o}function f(n){for(var t=0,e=M.length,r=n[1],i=0;e>i;++i)for(var u,a=1,o=M[i],c=o.length,l=o[0];c>a;++a)u=o[a],l[1]<=r?u[1]>r&&s(l,u,n)>0&&++t:u[1]<=r&&s(l,u,n)<0&&--t,l=u;return 0!==t}function s(n,t,e){return(t[0]-n[0])*(e[1]-n[1])-(e[0]-n[0])*(t[1]-n[1])}function h(u,o,c,l){var f=0,s=0;if(null==u||(f=i(u,c))!==(s=i(o,c))||a(u,o)<0^c>0){do l.point(0===f||3===f?n:e,f>1?r:t);while((f=(f+c+4)%4)!==s)}else l.point(o[0],o[1])}function g(i,u){return i>=n&&e>=i&&u>=t&&r>=u}function p(n,t){g(n,t)&&c.point(n,t)}function d(){T.point=v,M&&M.push(x=[]),A=!0,k=!1,S=E=0/0}function m(){y&&(v(b,_),w&&k&&q.rejoin(),y.push(q.buffer())),T.point=p,k&&c.lineEnd()}function v(n,t){n=Math.max(-vo,Math.min(vo,n)),t=Math.max(-vo,Math.min(vo,t));var e=g(n,t);if(M&&x.push([n,t]),A)b=n,_=t,w=e,A=!1,e&&(c.lineStart(),c.point(n,t));else if(e&&k)c.point(n,t);else{var r=[S,E],i=[n,t];o(r,i)?(k||(c.lineStart(),c.point(r[0],r[1])),c.point(i[0],i[1]),e||c.lineEnd()):e&&(c.lineStart(),c.point(n,t))}S=n,E=t,k=e}var y,M,x,b,_,w,S,E,k,A,N=c,q=Ut(),T={point:p,lineStart:d,lineEnd:m,polygonStart:function(){c=q,y=[],M=[]},polygonEnd:function(){c=N,(y=ua.merge(y)).length?(c.polygonStart(),Pt(y,u,l,h,c),c.polygonEnd()):f([n,t])&&(c.polygonStart(),c.lineStart(),h(null,null,1,c),c.lineEnd(),c.polygonEnd()),y=M=x=null}};return T}}function Gt(n,t,e){if(Math.abs(t)<ja)return 0>=n;var r=n/t;if(t>0){if(r>e[1])return!1;r>e[0]&&(e[0]=r)}else{if(r<e[0])return!1;r<e[1]&&(e[1]=r)}return!0}function Kt(n,t){function e(e,r){return e=n(e,r),t(e[0],e[1])}return n.invert&&t.invert&&(e.invert=function(e,r){return e=t.invert(e,r),e&&n.invert(e[0],e[1])}),e}function Wt(n){function t(t){function r(e,r){e=n(e,r),t.point(e[0],e[1])}function u(){f=0/0,d.point=a,t.lineStart()}function a(r,u){var a=Et([r,u]),o=n(r,u);e(f,s,l,h,g,p,f=o[0],s=o[1],l=r,h=a[0],g=a[1],p=a[2],i,t),t.point(f,s)}function o(){d.point=r,t.lineEnd()}function c(){var n,r,c,m,v,y,M;u(),d.point=function(t,e){a(n=t,r=e),c=f,m=s,v=h,y=g,M=p,d.point=a},d.lineEnd=function(){e(f,s,l,h,g,p,c,m,n,v,y,M,i,t),d.lineEnd=o,o()}}var l,f,s,h,g,p,d={point:r,lineStart:u,lineEnd:o,polygonStart:function(){t.polygonStart(),d.lineStart=c},polygonEnd:function(){t.polygonEnd(),d.lineStart=u}};return d}function e(t,i,u,a,o,c,l,f,s,h,g,p,d,m){var v=l-t,y=f-i,M=v*v+y*y;if(M>4*r&&d--){var x=a+h,b=o+g,_=c+p,w=Math.sqrt(x*x+b*b+_*_),S=Math.asin(_/=w),E=Math.abs(Math.abs(_)-1)<ja?(u+s)/2:Math.atan2(b,x),k=n(E,S),A=k[0],N=k[1],q=A-t,T=N-i,C=y*q-v*T;(C*C/M>r||Math.abs((v*q+y*T)/M-.5)>.3)&&(e(t,i,u,a,o,c,A,N,E,x/=w,b/=w,_,d,m),m.point(A,N),e(A,N,E,x,b,_,l,f,s,h,g,p,d,m))}}var r=.5,i=16;return t.precision=function(n){return arguments.length?(i=(r=n*n)>0&&16,t):Math.sqrt(r)},t}function Qt(n){return ne(function(){return n})()}function ne(n){function t(n){return n=a(n[0]*La,n[1]*La),[n[0]*f+o,c-n[1]*f]}function e(n){return n=a.invert((n[0]-o)/f,(c-n[1])/f),n&&[n[0]*Fa,n[1]*Fa]}function r(){a=Kt(u=re(d,m,v),i);var n=i(g,p);return o=s-n[0]*f,c=h+n[1]*f,t}var i,u,a,o,c,l=Wt(function(n,t){return n=i(n,t),[n[0]*f+o,c-n[1]*f]}),f=150,s=480,h=250,g=0,p=0,d=0,m=0,v=0,y=mo,M=ft,x=null,b=null;return t.stream=function(n){return te(u,y(l(M(n))))},t.clipAngle=function(n){return arguments.length?(y=null==n?(x=n,mo):$t((x=+n)*La),t):x},t.clipExtent=function(n){return arguments.length?(b=n,M=null==n?ft:Jt(n[0][0],n[0][1],n[1][0],n[1][1]),t):b},t.scale=function(n){return arguments.length?(f=+n,r()):f},t.translate=function(n){return arguments.length?(s=+n[0],h=+n[1],r()):[s,h]},t.center=function(n){return arguments.length?(g=n[0]%360*La,p=n[1]%360*La,r()):[g*Fa,p*Fa]},t.rotate=function(n){return arguments.length?(d=n[0]%360*La,m=n[1]%360*La,v=n.length>2?n[2]%360*La:0,r()):[d*Fa,m*Fa,v*Fa]},ua.rebind(t,l,"precision"),function(){return i=n.apply(this,arguments),t.invert=i.invert&&e,r()}}function te(n,t){return{point:function(e,r){r=n(e*La,r*La),e=r[0],t.point(e>Da?e-2*Da:-Da>e?e+2*Da:e,r[1])},sphere:function(){t.sphere()},lineStart:function(){t.lineStart()},lineEnd:function(){t.lineEnd()},polygonStart:function(){t.polygonStart()},polygonEnd:function(){t.polygonEnd()}}}function ee(n,t){return[n,t]}function re(n,t,e){return n?t||e?Kt(ue(n),ae(t,e)):ue(n):t||e?ae(t,e):ee}function ie(n){return function(t,e){return t+=n,[t>Da?t-2*Da:-Da>t?t+2*Da:t,e]}}function ue(n){var t=ie(n);return t.invert=ie(-n),t}function ae(n,t){function e(n,t){var e=Math.cos(t),o=Math.cos(n)*e,c=Math.sin(n)*e,l=Math.sin(t),f=l*r+o*i;return[Math.atan2(c*u-f*a,o*r-l*i),Math.asin(Math.max(-1,Math.min(1,f*u+c*a)))]}var r=Math.cos(n),i=Math.sin(n),u=Math.cos(t),a=Math.sin(t);return e.invert=function(n,t){var e=Math.cos(t),o=Math.cos(n)*e,c=Math.sin(n)*e,l=Math.sin(t),f=l*u-c*a;return[Math.atan2(c*u+l*a,o*r+f*i),Math.asin(Math.max(-1,Math.min(1,f*r-o*i)))]},e}function oe(n,t){var e=Math.cos(n),r=Math.sin(n);return function(i,u,a,o){null!=i?(i=ce(e,i),u=ce(e,u),(a>0?u>i:i>u)&&(i+=2*a*Da)):(i=n+2*a*Da,u=n);for(var c,l=a*t,f=i;a>0?f>u:u>f;f-=l)o.point((c=Ct([e,-r*Math.cos(f),-r*Math.sin(f)]))[0],c[1])}}function ce(n,t){var e=Et(t);e[0]-=n,Tt(e);var r=O(-e[1]);return((-e[2]<0?-r:r)+2*Math.PI-ja)%(2*Math.PI)}function le(n,t,e){var r=ua.range(n,t-ja,e).concat(t);return function(n){return r.map(function(t){return[n,t]})}}function fe(n,t,e){var r=ua.range(n,t-ja,e).concat(t);return function(n){return r.map(function(t){return[t,n]})}}function se(n){return n.source}function he(n){return n.target}function ge(n,t,e,r){var i=Math.cos(t),u=Math.sin(t),a=Math.cos(r),o=Math.sin(r),c=i*Math.cos(n),l=i*Math.sin(n),f=a*Math.cos(e),s=a*Math.sin(e),h=2*Math.asin(Math.sqrt(V(r-t)+i*a*V(e-n))),g=1/Math.sin(h),p=h?function(n){var t=Math.sin(n*=h)*g,e=Math.sin(h-n)*g,r=e*c+t*f,i=e*l+t*s,a=e*u+t*o;return[Math.atan2(i,r)*Fa,Math.atan2(a,Math.sqrt(r*r+i*i))*Fa]}:function(){return[n*Fa,t*Fa]};return p.distance=h,p}function pe(){function n(n,i){var u=Math.sin(i*=La),a=Math.cos(i),o=Math.abs((n*=La)-t),c=Math.cos(o);yo+=Math.atan2(Math.sqrt((o=a*Math.sin(o))*o+(o=r*u-e*a*c)*o),e*u+r*a*c),t=n,e=u,r=a}var t,e,r;Mo.point=function(i,u){t=i*La,e=Math.sin(u*=La),r=Math.cos(u),Mo.point=n},Mo.lineEnd=function(){Mo.point=Mo.lineEnd=q}}function de(n){var t=0,e=Da/3,r=ne(n),i=r(t,e);return i.parallels=function(n){return arguments.length?r(t=n[0]*Da/180,e=n[1]*Da/180):[180*(t/Da),180*(e/Da)]},i}function me(n,t){function e(n,t){var e=Math.sqrt(u-2*i*Math.sin(t))/i;return[e*Math.sin(n*=i),a-e*Math.cos(n)]}var r=Math.sin(n),i=(r+Math.sin(t))/2,u=1+r*(2*i-r),a=Math.sqrt(u)/i;return e.invert=function(n,t){var e=a-t;return[Math.atan2(n,e)/i,Y((u-(n*n+e*e)*i*i)/(2*i))]},e}function ve(){function n(n,t){bo+=i*n-r*t,r=n,i=t}var t,e,r,i;ko.point=function(u,a){ko.point=n,t=r=u,e=i=a},ko.lineEnd=function(){n(t,e)}}function ye(n,t){_o>n&&(_o=n),n>So&&(So=n),wo>t&&(wo=t),t>Eo&&(Eo=t)}function Me(){function n(n,t){a.push("M",n,",",t,u)}function t(n,t){a.push("M",n,",",t),o.point=e}function e(n,t){a.push("L",n,",",t)}function r(){o.point=n}function i(){a.push("Z")}var u=xe(4.5),a=[],o={point:n,lineStart:function(){o.point=t},lineEnd:r,polygonStart:function(){o.lineEnd=i},polygonEnd:function(){o.lineEnd=r,o.point=n},pointRadius:function(n){return u=xe(n),o},result:function(){if(a.length){var n=a.join("");return a=[],n}}};return o}function xe(n){return"m0,"+n+"a"+n+","+n+" 0 1,1 0,"+-2*n+"a"+n+","+n+" 0 1,1 0,"+2*n+"z"}function be(n,t){lo||(so+=n,ho+=t,++go)}function _e(){function n(n,r){var i=n-t,u=r-e,a=Math.sqrt(i*i+u*u);so+=a*(t+n)/2,ho+=a*(e+r)/2,go+=a,t=n,e=r}var t,e;if(1!==lo){if(!(1>lo))return;lo=1,so=ho=go=0}No.point=function(r,i){No.point=n,t=r,e=i}}function we(){No.point=be}function Se(){function n(n,t){var e=i*n-r*t;so+=e*(r+n),ho+=e*(i+t),go+=3*e,r=n,i=t}var t,e,r,i;2>lo&&(lo=2,so=ho=go=0),No.point=function(u,a){No.point=n,t=r=u,e=i=a},No.lineEnd=function(){n(t,e)}}function Ee(n){function t(t,e){n.moveTo(t,e),n.arc(t,e,a,0,2*Da)}function e(t,e){n.moveTo(t,e),o.point=r}function r(t,e){n.lineTo(t,e)}function i(){o.point=t}function u(){n.closePath()}var a=4.5,o={point:t,lineStart:function(){o.point=e},lineEnd:i,polygonStart:function(){o.lineEnd=u},polygonEnd:function(){o.lineEnd=i,o.point=t},pointRadius:function(n){return a=n,o},result:q};return o}function ke(n){var t=Wt(function(t,e){return n([t*Fa,e*Fa])});return function(n){return n=t(n),{point:function(t,e){n.point(t*La,e*La)},sphere:function(){n.sphere()},lineStart:function(){n.lineStart()},lineEnd:function(){n.lineEnd()},polygonStart:function(){n.polygonStart()},polygonEnd:function(){n.polygonEnd()}}}}function Ae(n,t){function e(t,e){var r=Math.cos(t),i=Math.cos(e),u=n(r*i);return[u*i*Math.sin(t),u*Math.sin(e)]}return e.invert=function(n,e){var r=Math.sqrt(n*n+e*e),i=t(r),u=Math.sin(i),a=Math.cos(i);return[Math.atan2(n*u,r*a),Math.asin(r&&e*u/r)]},e}function Ne(n,t){function e(n,t){var e=Math.abs(Math.abs(t)-Da/2)<ja?0:a/Math.pow(i(t),u);return[e*Math.sin(u*n),a-e*Math.cos(u*n)]}var r=Math.cos(n),i=function(n){return Math.tan(Da/4+n/2)},u=n===t?Math.sin(n):Math.log(r/Math.cos(t))/Math.log(i(t)/i(n)),a=r*Math.pow(i(n),u)/u;return u?(e.invert=function(n,t){var e=a-t,r=R(u)*Math.sqrt(n*n+e*e);return[Math.atan2(n,e)/u,2*Math.atan(Math.pow(a/r,1/u))-Da/2]},e):Te}function qe(n,t){function e(n,t){var e=u-t;return[e*Math.sin(i*n),u-e*Math.cos(i*n)]}var r=Math.cos(n),i=n===t?Math.sin(n):(r-Math.cos(t))/(t-n),u=r/i+n;return Math.abs(i)<ja?ee:(e.invert=function(n,t){var e=u-t;return[Math.atan2(n,e)/i,u-R(i)*Math.sqrt(n*n+e*e)]},e)}function Te(n,t){return[n,Math.log(Math.tan(Da/4+t/2))]}function Ce(n){var t,e=Qt(n),r=e.scale,i=e.translate,u=e.clipExtent;return e.scale=function(){var n=r.apply(e,arguments);return n===e?t?e.clipExtent(null):e:n},e.translate=function(){var n=i.apply(e,arguments);return n===e?t?e.clipExtent(null):e:n},e.clipExtent=function(n){var a=u.apply(e,arguments);if(a===e){if(t=null==n){var o=Da*r(),c=i();u([[c[0]-o,c[1]-o],[c[0]+o,c[1]+o]])}}else t&&(a=null);return a},e.clipExtent(null)}function ze(n,t){var e=Math.cos(t)*Math.sin(n);return[Math.log((1+e)/(1-e))/2,Math.atan2(Math.tan(t),Math.cos(n))]}function De(n){function t(t){function a(){l.push("M",u(n(f),o))}for(var c,l=[],f=[],s=-1,h=t.length,g=lt(e),p=lt(r);++s<h;)i.call(this,c=t[s],s)?f.push([+g.call(this,c,s),+p.call(this,c,s)]):f.length&&(a(),f=[]);return f.length&&a(),l.length?l.join(""):null}var e=je,r=Le,i=Ht,u=Fe,a=u.key,o=.7;return t.x=function(n){return arguments.length?(e=n,t):e},t.y=function(n){return arguments.length?(r=n,t):r},t.defined=function(n){return arguments.length?(i=n,t):i},t.interpolate=function(n){return arguments.length?(a="function"==typeof n?u=n:(u=jo.get(n)||Fe).key,t):a},t.tension=function(n){return arguments.length?(o=n,t):o},t}function je(n){return n[0]}function Le(n){return n[1]}function Fe(n){return n.join("L")}function He(n){return Fe(n)+"Z"}function Pe(n){for(var t=0,e=n.length,r=n[0],i=[r[0],",",r[1]];++t<e;)i.push("V",(r=n[t])[1],"H",r[0]);return i.join("")}function Re(n){for(var t=0,e=n.length,r=n[0],i=[r[0],",",r[1]];++t<e;)i.push("H",(r=n[t])[0],"V",r[1]);return i.join("")}function Oe(n,t){return n.length<4?Fe(n):n[1]+Ie(n.slice(1,n.length-1),Ve(n,t))}function Ye(n,t){return n.length<3?Fe(n):n[0]+Ie((n.push(n[0]),n),Ve([n[n.length-2]].concat(n,[n[1]]),t))}function Ue(n,t){return n.length<3?Fe(n):n[0]+Ie(n,Ve(n,t))}function Ie(n,t){if(t.length<1||n.length!=t.length&&n.length!=t.length+2)return Fe(n);var e=n.length!=t.length,r="",i=n[0],u=n[1],a=t[0],o=a,c=1;if(e&&(r+="Q"+(u[0]-a[0]*2/3)+","+(u[1]-a[1]*2/3)+","+u[0]+","+u[1],i=n[1],c=2),t.length>1){o=t[1],u=n[c],c++,r+="C"+(i[0]+a[0])+","+(i[1]+a[1])+","+(u[0]-o[0])+","+(u[1]-o[1])+","+u[0]+","+u[1];for(var l=2;l<t.length;l++,c++)u=n[c],o=t[l],r+="S"+(u[0]-o[0])+","+(u[1]-o[1])+","+u[0]+","+u[1]}if(e){var f=n[c];r+="Q"+(u[0]+o[0]*2/3)+","+(u[1]+o[1]*2/3)+","+f[0]+","+f[1]}return r}function Ve(n,t){for(var e,r=[],i=(1-t)/2,u=n[0],a=n[1],o=1,c=n.length;++o<c;)e=u,u=a,a=n[o],r.push([i*(a[0]-e[0]),i*(a[1]-e[1])]);return r}function Xe(n){if(n.length<3)return Fe(n);var t=1,e=n.length,r=n[0],i=r[0],u=r[1],a=[i,i,i,(r=n[1])[0]],o=[u,u,u,r[1]],c=[i,",",u];for(Ge(c,a,o);++t<e;)r=n[t],a.shift(),a.push(r[0]),o.shift(),o.push(r[1]),Ge(c,a,o);for(t=-1;++t<2;)a.shift(),a.push(r[0]),o.shift(),o.push(r[1]),Ge(c,a,o);return c.join("")}function Ze(n){if(n.length<4)return Fe(n);for(var t,e=[],r=-1,i=n.length,u=[0],a=[0];++r<3;)t=n[r],u.push(t[0]),a.push(t[1]);for(e.push(Je(Ho,u)+","+Je(Ho,a)),--r;++r<i;)t=n[r],u.shift(),u.push(t[0]),a.shift(),a.push(t[1]),Ge(e,u,a);return e.join("")}function Be(n){for(var t,e,r=-1,i=n.length,u=i+4,a=[],o=[];++r<4;)e=n[r%i],a.push(e[0]),o.push(e[1]);for(t=[Je(Ho,a),",",Je(Ho,o)],--r;++r<u;)e=n[r%i],a.shift(),a.push(e[0]),o.shift(),o.push(e[1]),Ge(t,a,o);return t.join("")}function $e(n,t){var e=n.length-1;if(e)for(var r,i,u=n[0][0],a=n[0][1],o=n[e][0]-u,c=n[e][1]-a,l=-1;++l<=e;)r=n[l],i=l/e,r[0]=t*r[0]+(1-t)*(u+i*o),r[1]=t*r[1]+(1-t)*(a+i*c);return Xe(n)}function Je(n,t){return n[0]*t[0]+n[1]*t[1]+n[2]*t[2]+n[3]*t[3]}function Ge(n,t,e){n.push("C",Je(Lo,t),",",Je(Lo,e),",",Je(Fo,t),",",Je(Fo,e),",",Je(Ho,t),",",Je(Ho,e))}function Ke(n,t){return(t[1]-n[1])/(t[0]-n[0])
}function We(n){for(var t=0,e=n.length-1,r=[],i=n[0],u=n[1],a=r[0]=Ke(i,u);++t<e;)r[t]=(a+(a=Ke(i=u,u=n[t+1])))/2;return r[t]=a,r}function Qe(n){for(var t,e,r,i,u=[],a=We(n),o=-1,c=n.length-1;++o<c;)t=Ke(n[o],n[o+1]),Math.abs(t)<1e-6?a[o]=a[o+1]=0:(e=a[o]/t,r=a[o+1]/t,i=e*e+r*r,i>9&&(i=3*t/Math.sqrt(i),a[o]=i*e,a[o+1]=i*r));for(o=-1;++o<=c;)i=(n[Math.min(c,o+1)][0]-n[Math.max(0,o-1)][0])/(6*(1+a[o]*a[o])),u.push([i||0,a[o]*i||0]);return u}function nr(n){return n.length<3?Fe(n):n[0]+Ie(n,Qe(n))}function tr(n,t,e,r){var i,u,a,o,c,l,f;return i=r[n],u=i[0],a=i[1],i=r[t],o=i[0],c=i[1],i=r[e],l=i[0],f=i[1],(f-a)*(o-u)-(c-a)*(l-u)>0}function er(n,t,e){return(e[0]-t[0])*(n[1]-t[1])<(e[1]-t[1])*(n[0]-t[0])}function rr(n,t,e,r){var i=n[0],u=e[0],a=t[0]-i,o=r[0]-u,c=n[1],l=e[1],f=t[1]-c,s=r[1]-l,h=(o*(c-l)-s*(i-u))/(s*a-o*f);return[i+h*a,c+h*f]}function ir(n,t){var e={list:n.map(function(n,t){return{index:t,x:n[0],y:n[1]}}).sort(function(n,t){return n.y<t.y?-1:n.y>t.y?1:n.x<t.x?-1:n.x>t.x?1:0}),bottomSite:null},r={list:[],leftEnd:null,rightEnd:null,init:function(){r.leftEnd=r.createHalfEdge(null,"l"),r.rightEnd=r.createHalfEdge(null,"l"),r.leftEnd.r=r.rightEnd,r.rightEnd.l=r.leftEnd,r.list.unshift(r.leftEnd,r.rightEnd)},createHalfEdge:function(n,t){return{edge:n,side:t,vertex:null,l:null,r:null}},insert:function(n,t){t.l=n,t.r=n.r,n.r.l=t,n.r=t},leftBound:function(n){var t=r.leftEnd;do t=t.r;while(t!=r.rightEnd&&i.rightOf(t,n));return t=t.l},del:function(n){n.l.r=n.r,n.r.l=n.l,n.edge=null},right:function(n){return n.r},left:function(n){return n.l},leftRegion:function(n){return n.edge==null?e.bottomSite:n.edge.region[n.side]},rightRegion:function(n){return n.edge==null?e.bottomSite:n.edge.region[Po[n.side]]}},i={bisect:function(n,t){var e={region:{l:n,r:t},ep:{l:null,r:null}},r=t.x-n.x,i=t.y-n.y,u=r>0?r:-r,a=i>0?i:-i;return e.c=n.x*r+n.y*i+.5*(r*r+i*i),u>a?(e.a=1,e.b=i/r,e.c/=r):(e.b=1,e.a=r/i,e.c/=i),e},intersect:function(n,t){var e=n.edge,r=t.edge;if(!e||!r||e.region.r==r.region.r)return null;var i=e.a*r.b-e.b*r.a;if(Math.abs(i)<1e-10)return null;var u,a,o=(e.c*r.b-r.c*e.b)/i,c=(r.c*e.a-e.c*r.a)/i,l=e.region.r,f=r.region.r;l.y<f.y||l.y==f.y&&l.x<f.x?(u=n,a=e):(u=t,a=r);var s=o>=a.region.r.x;return s&&u.side==="l"||!s&&u.side==="r"?null:{x:o,y:c}},rightOf:function(n,t){var e=n.edge,r=e.region.r,i=t.x>r.x;if(i&&n.side==="l")return 1;if(!i&&n.side==="r")return 0;if(e.a===1){var u=t.y-r.y,a=t.x-r.x,o=0,c=0;if(!i&&e.b<0||i&&e.b>=0?c=o=u>=e.b*a:(c=t.x+t.y*e.b>e.c,e.b<0&&(c=!c),c||(o=1)),!o){var l=r.x-e.region.l.x;c=e.b*(a*a-u*u)<l*u*(1+2*a/l+e.b*e.b),e.b<0&&(c=!c)}}else{var f=e.c-e.a*t.x,s=t.y-f,h=t.x-r.x,g=f-r.y;c=s*s>h*h+g*g}return n.side==="l"?c:!c},endPoint:function(n,e,r){n.ep[e]=r,n.ep[Po[e]]&&t(n)},distance:function(n,t){var e=n.x-t.x,r=n.y-t.y;return Math.sqrt(e*e+r*r)}},u={list:[],insert:function(n,t,e){n.vertex=t,n.ystar=t.y+e;for(var r=0,i=u.list,a=i.length;a>r;r++){var o=i[r];if(!(n.ystar>o.ystar||n.ystar==o.ystar&&t.x>o.vertex.x))break}i.splice(r,0,n)},del:function(n){for(var t=0,e=u.list,r=e.length;r>t&&e[t]!=n;++t);e.splice(t,1)},empty:function(){return u.list.length===0},nextEvent:function(n){for(var t=0,e=u.list,r=e.length;r>t;++t)if(e[t]==n)return e[t+1];return null},min:function(){var n=u.list[0];return{x:n.vertex.x,y:n.ystar}},extractMin:function(){return u.list.shift()}};r.init(),e.bottomSite=e.list.shift();for(var a,o,c,l,f,s,h,g,p,d,m,v,y,M=e.list.shift();;)if(u.empty()||(a=u.min()),M&&(u.empty()||M.y<a.y||M.y==a.y&&M.x<a.x))o=r.leftBound(M),c=r.right(o),h=r.rightRegion(o),v=i.bisect(h,M),s=r.createHalfEdge(v,"l"),r.insert(o,s),d=i.intersect(o,s),d&&(u.del(o),u.insert(o,d,i.distance(d,M))),o=s,s=r.createHalfEdge(v,"r"),r.insert(o,s),d=i.intersect(s,c),d&&u.insert(s,d,i.distance(d,M)),M=e.list.shift();else{if(u.empty())break;o=u.extractMin(),l=r.left(o),c=r.right(o),f=r.right(c),h=r.leftRegion(o),g=r.rightRegion(c),m=o.vertex,i.endPoint(o.edge,o.side,m),i.endPoint(c.edge,c.side,m),r.del(o),u.del(c),r.del(c),y="l",h.y>g.y&&(p=h,h=g,g=p,y="r"),v=i.bisect(h,g),s=r.createHalfEdge(v,y),r.insert(l,s),i.endPoint(v,Po[y],m),d=i.intersect(l,s),d&&(u.del(l),u.insert(l,d,i.distance(d,h))),d=i.intersect(s,f),d&&u.insert(s,d,i.distance(d,h))}for(o=r.right(r.leftEnd);o!=r.rightEnd;o=r.right(o))t(o.edge)}function ur(n){return n.x}function ar(n){return n.y}function or(){return{leaf:!0,nodes:[],point:null,x:null,y:null}}function cr(n,t,e,r,i,u){if(!n(t,e,r,i,u)){var a=.5*(e+i),o=.5*(r+u),c=t.nodes;c[0]&&cr(n,c[0],e,r,a,o),c[1]&&cr(n,c[1],a,r,i,o),c[2]&&cr(n,c[2],e,o,a,u),c[3]&&cr(n,c[3],a,o,i,u)}}function lr(n,t){n=ua.rgb(n),t=ua.rgb(t);var e=n.r,r=n.g,i=n.b,u=t.r-e,a=t.g-r,o=t.b-i;return function(n){return"#"+rt(Math.round(e+u*n))+rt(Math.round(r+a*n))+rt(Math.round(i+o*n))}}function fr(n){var t=[n.a,n.b],e=[n.c,n.d],r=hr(t),i=sr(t,e),u=hr(gr(e,t,-i))||0;t[0]*e[1]<e[0]*t[1]&&(t[0]*=-1,t[1]*=-1,r*=-1,i*=-1),this.rotate=(r?Math.atan2(t[1],t[0]):Math.atan2(-e[0],e[1]))*Fa,this.translate=[n.e,n.f],this.scale=[r,u],this.skew=u?Math.atan2(i,u)*Fa:0}function sr(n,t){return n[0]*t[0]+n[1]*t[1]}function hr(n){var t=Math.sqrt(sr(n,n));return t&&(n[0]/=t,n[1]/=t),t}function gr(n,t,e){return n[0]+=e*t[0],n[1]+=e*t[1],n}function pr(n,t){return t-=n=+n,function(e){return n+t*e}}function dr(n,t){var e,r=[],i=[],u=ua.transform(n),a=ua.transform(t),o=u.translate,c=a.translate,l=u.rotate,f=a.rotate,s=u.skew,h=a.skew,g=u.scale,p=a.scale;return o[0]!=c[0]||o[1]!=c[1]?(r.push("translate(",null,",",null,")"),i.push({i:1,x:pr(o[0],c[0])},{i:3,x:pr(o[1],c[1])})):c[0]||c[1]?r.push("translate("+c+")"):r.push(""),l!=f?(l-f>180?f+=360:f-l>180&&(l+=360),i.push({i:r.push(r.pop()+"rotate(",null,")")-2,x:pr(l,f)})):f&&r.push(r.pop()+"rotate("+f+")"),s!=h?i.push({i:r.push(r.pop()+"skewX(",null,")")-2,x:pr(s,h)}):h&&r.push(r.pop()+"skewX("+h+")"),g[0]!=p[0]||g[1]!=p[1]?(e=r.push(r.pop()+"scale(",null,",",null,")"),i.push({i:e-4,x:pr(g[0],p[0])},{i:e-2,x:pr(g[1],p[1])})):(p[0]!=1||p[1]!=1)&&r.push(r.pop()+"scale("+p+")"),e=i.length,function(n){for(var t,u=-1;++u<e;)r[(t=i[u]).i]=t.x(n);return r.join("")}}function mr(n,t){var e,r={},i={};for(e in n)e in t?r[e]=Mr(e)(n[e],t[e]):i[e]=n[e];for(e in t)e in n||(i[e]=t[e]);return function(n){for(e in r)i[e]=r[e](n);return i}}function vr(n,t){var e,r,i,u,a,o=0,c=0,l=[],f=[];for(n+="",t+="",Oo.lastIndex=0,r=0;e=Oo.exec(t);++r)e.index&&l.push(t.substring(o,c=e.index)),f.push({i:l.length,x:e[0]}),l.push(null),o=Oo.lastIndex;for(o<t.length&&l.push(t.substring(o)),r=0,u=f.length;(e=Oo.exec(n))&&u>r;++r)if(a=f[r],a.x==e[0]){if(a.i)if(l[a.i+1]==null)for(l[a.i-1]+=a.x,l.splice(a.i,1),i=r+1;u>i;++i)f[i].i--;else for(l[a.i-1]+=a.x+l[a.i+1],l.splice(a.i,2),i=r+1;u>i;++i)f[i].i-=2;else if(l[a.i+1]==null)l[a.i]=a.x;else for(l[a.i]=a.x+l[a.i+1],l.splice(a.i+1,1),i=r+1;u>i;++i)f[i].i--;f.splice(r,1),u--,r--}else a.x=pr(parseFloat(e[0]),parseFloat(a.x));for(;u>r;)a=f.pop(),l[a.i+1]==null?l[a.i]=a.x:(l[a.i]=a.x+l[a.i+1],l.splice(a.i+1,1)),u--;return l.length===1?l[0]==null?(a=f[0].x,function(n){return a(n)+""}):function(){return t}:function(n){for(r=0;u>r;++r)l[(a=f[r]).i]=a.x(n);return l.join("")}}function yr(n,t){for(var e,r=ua.interpolators.length;--r>=0&&!(e=ua.interpolators[r](n,t)););return e}function Mr(n){return"transform"==n?dr:yr}function xr(n,t){var e,r=[],i=[],u=n.length,a=t.length,o=Math.min(n.length,t.length);for(e=0;o>e;++e)r.push(yr(n[e],t[e]));for(;u>e;++e)i[e]=n[e];for(;a>e;++e)i[e]=t[e];return function(n){for(e=0;o>e;++e)i[e]=r[e](n);return i}}function br(n){return function(t){return 0>=t?0:t>=1?1:n(t)}}function _r(n){return function(t){return 1-n(1-t)}}function wr(n){return function(t){return.5*(.5>t?n(2*t):2-n(2-2*t))}}function Sr(n){return n*n}function Er(n){return n*n*n}function kr(n){if(0>=n)return 0;if(n>=1)return 1;var t=n*n,e=t*n;return 4*(.5>n?e:3*(n-t)+e-.75)}function Ar(n){return function(t){return Math.pow(t,n)}}function Nr(n){return 1-Math.cos(n*Da/2)}function qr(n){return Math.pow(2,10*(n-1))}function Tr(n){return 1-Math.sqrt(1-n*n)}function Cr(n,t){var e;return arguments.length<2&&(t=.45),arguments.length?e=t/(2*Da)*Math.asin(1/n):(n=1,e=t/4),function(r){return 1+n*Math.pow(2,10*-r)*Math.sin(2*(r-e)*Da/t)}}function zr(n){return n||(n=1.70158),function(t){return t*t*((n+1)*t-n)}}function Dr(n){return 1/2.75>n?7.5625*n*n:2/2.75>n?7.5625*(n-=1.5/2.75)*n+.75:2.5/2.75>n?7.5625*(n-=2.25/2.75)*n+.9375:7.5625*(n-=2.625/2.75)*n+.984375}function jr(n,t){n=ua.hcl(n),t=ua.hcl(t);var e=n.h,r=n.c,i=n.l,u=t.h-e,a=t.c-r,o=t.l-i;return isNaN(a)&&(a=0,r=isNaN(r)?t.c:r),isNaN(u)?(u=0,e=isNaN(e)?t.h:e):u>180?u-=360:-180>u&&(u+=360),function(n){return B(e+u*n,r+a*n,i+o*n)+""}}function Lr(n,t){n=ua.hsl(n),t=ua.hsl(t);var e=n.h,r=n.s,i=n.l,u=t.h-e,a=t.s-r,o=t.l-i;return isNaN(a)&&(a=0,r=isNaN(r)?t.s:r),isNaN(u)?(u=0,e=isNaN(e)?t.h:e):u>180?u-=360:-180>u&&(u+=360),function(n){return P(e+u*n,r+a*n,i+o*n)+""}}function Fr(n,t){n=ua.lab(n),t=ua.lab(t);var e=n.l,r=n.a,i=n.b,u=t.l-e,a=t.a-r,o=t.b-i;return function(n){return G(e+u*n,r+a*n,i+o*n)+""}}function Hr(n,t){return t-=n,function(e){return Math.round(n+t*e)}}function Pr(n,t){return t=t-(n=+n)?1/(t-n):0,function(e){return(e-n)*t}}function Rr(n,t){return t=t-(n=+n)?1/(t-n):0,function(e){return Math.max(0,Math.min(1,(e-n)*t))}}function Or(n){for(var t=n.source,e=n.target,r=Ur(t,e),i=[t];t!==r;)t=t.parent,i.push(t);for(var u=i.length;e!==r;)i.splice(u,0,e),e=e.parent;return i}function Yr(n){for(var t=[],e=n.parent;null!=e;)t.push(n),n=e,e=e.parent;return t.push(n),t}function Ur(n,t){if(n===t)return n;for(var e=Yr(n),r=Yr(t),i=e.pop(),u=r.pop(),a=null;i===u;)a=i,i=e.pop(),u=r.pop();return a}function Ir(n){n.fixed|=2}function Vr(n){n.fixed&=-7}function Xr(n){n.fixed|=4,n.px=n.x,n.py=n.y}function Zr(n){n.fixed&=-5}function Br(n,t,e){var r=0,i=0;if(n.charge=0,!n.leaf)for(var u,a=n.nodes,o=a.length,c=-1;++c<o;)u=a[c],null!=u&&(Br(u,t,e),n.charge+=u.charge,r+=u.charge*u.cx,i+=u.charge*u.cy);if(n.point){n.leaf||(n.point.x+=Math.random()-.5,n.point.y+=Math.random()-.5);var l=t*e[n.point.index];n.charge+=n.pointCharge=l,r+=l*n.point.x,i+=l*n.point.y}n.cx=r/n.charge,n.cy=i/n.charge}function $r(n,t){return ua.rebind(n,t,"sort","children","value"),n.nodes=n,n.links=Wr,n}function Jr(n){return n.children}function Gr(n){return n.value}function Kr(n,t){return t.value-n.value}function Wr(n){return ua.merge(n.map(function(n){return(n.children||[]).map(function(t){return{source:n,target:t}})}))}function Qr(n){return n.x}function ni(n){return n.y}function ti(n,t,e){n.y0=t,n.y=e}function ei(n){return ua.range(n.length)}function ri(n){for(var t=-1,e=n[0].length,r=[];++t<e;)r[t]=0;return r}function ii(n){for(var t,e=1,r=0,i=n[0][1],u=n.length;u>e;++e)(t=n[e][1])>i&&(r=e,i=t);return r}function ui(n){return n.reduce(ai,0)}function ai(n,t){return n+t[1]}function oi(n,t){return ci(n,Math.ceil(Math.log(t.length)/Math.LN2+1))}function ci(n,t){for(var e=-1,r=+n[0],i=(n[1]-r)/t,u=[];++e<=t;)u[e]=i*e+r;return u}function li(n){return[ua.min(n),ua.max(n)]}function fi(n,t){return n.parent==t.parent?1:2}function si(n){var t=n.children;return t&&t.length?t[0]:n._tree.thread}function hi(n){var t,e=n.children;return e&&(t=e.length)?e[t-1]:n._tree.thread}function gi(n,t){var e=n.children;if(e&&(i=e.length))for(var r,i,u=-1;++u<i;)t(r=gi(e[u],t),n)>0&&(n=r);return n}function pi(n,t){return n.x-t.x}function di(n,t){return t.x-n.x}function mi(n,t){return n.depth-t.depth}function vi(n,t){function e(n,r){var i=n.children;if(i&&(a=i.length))for(var u,a,o=null,c=-1;++c<a;)u=i[c],e(u,o),o=u;t(n,r)}e(n,null)}function yi(n){for(var t,e=0,r=0,i=n.children,u=i.length;--u>=0;)t=i[u]._tree,t.prelim+=e,t.mod+=e,e+=t.shift+(r+=t.change)}function Mi(n,t,e){n=n._tree,t=t._tree;var r=e/(t.number-n.number);n.change+=r,t.change-=r,t.shift+=e,t.prelim+=e,t.mod+=e}function xi(n,t,e){return n._tree.ancestor.parent==t.parent?n._tree.ancestor:e}function bi(n,t){return n.value-t.value}function _i(n,t){var e=n._pack_next;n._pack_next=t,t._pack_prev=n,t._pack_next=e,e._pack_prev=t}function wi(n,t){n._pack_next=t,t._pack_prev=n}function Si(n,t){var e=t.x-n.x,r=t.y-n.y,i=n.r+t.r;return i*i-e*e-r*r>.001}function Ei(n){function t(n){f=Math.min(n.x-n.r,f),s=Math.max(n.x+n.r,s),h=Math.min(n.y-n.r,h),g=Math.max(n.y+n.r,g)}if((e=n.children)&&(l=e.length)){var e,r,i,u,a,o,c,l,f=1/0,s=-1/0,h=1/0,g=-1/0;if(e.forEach(ki),r=e[0],r.x=-r.r,r.y=0,t(r),l>1&&(i=e[1],i.x=i.r,i.y=0,t(i),l>2))for(u=e[2],qi(r,i,u),t(u),_i(r,u),r._pack_prev=u,_i(u,i),i=r._pack_next,a=3;l>a;a++){qi(r,i,u=e[a]);var p=0,d=1,m=1;for(o=i._pack_next;o!==i;o=o._pack_next,d++)if(Si(o,u)){p=1;break}if(1==p)for(c=r._pack_prev;c!==o._pack_prev&&!Si(c,u);c=c._pack_prev,m++);p?(m>d||d==m&&i.r<r.r?wi(r,i=o):wi(r=c,i),a--):(_i(r,u),i=u,t(u))}var v=(f+s)/2,y=(h+g)/2,M=0;for(a=0;l>a;a++)u=e[a],u.x-=v,u.y-=y,M=Math.max(M,u.r+Math.sqrt(u.x*u.x+u.y*u.y));n.r=M,e.forEach(Ai)}}function ki(n){n._pack_next=n._pack_prev=n}function Ai(n){delete n._pack_next,delete n._pack_prev}function Ni(n,t,e,r){var i=n.children;if(n.x=t+=r*n.x,n.y=e+=r*n.y,n.r*=r,i)for(var u=-1,a=i.length;++u<a;)Ni(i[u],t,e,r)}function qi(n,t,e){var r=n.r+e.r,i=t.x-n.x,u=t.y-n.y;if(r&&(i||u)){var a=t.r+e.r,o=i*i+u*u;a*=a,r*=r;var c=.5+(r-a)/(2*o),l=Math.sqrt(Math.max(0,2*a*(r+o)-(r-=o)*r-a*a))/(2*o);e.x=n.x+c*i+l*u,e.y=n.y+c*u-l*i}else e.x=n.x+r,e.y=n.y}function Ti(n){return 1+ua.max(n,function(n){return n.y})}function Ci(n){return n.reduce(function(n,t){return n+t.x},0)/n.length}function zi(n){var t=n.children;return t&&t.length?zi(t[0]):n}function Di(n){var t,e=n.children;return e&&(t=e.length)?Di(e[t-1]):n}function ji(n){return{x:n.x,y:n.y,dx:n.dx,dy:n.dy}}function Li(n,t){var e=n.x+t[3],r=n.y+t[0],i=n.dx-t[1]-t[3],u=n.dy-t[0]-t[2];return 0>i&&(e+=i/2,i=0),0>u&&(r+=u/2,u=0),{x:e,y:r,dx:i,dy:u}}function Fi(n){var t=n[0],e=n[n.length-1];return e>t?[t,e]:[e,t]}function Hi(n){return n.rangeExtent?n.rangeExtent():Fi(n.range())}function Pi(n,t,e,r){var i=e(n[0],n[1]),u=r(t[0],t[1]);return function(n){return u(i(n))}}function Ri(n,t){var e,r=0,i=n.length-1,u=n[r],a=n[i];return u>a&&(e=r,r=i,i=e,e=u,u=a,a=e),(t=t(a-u))&&(n[r]=t.floor(u),n[i]=t.ceil(a)),n}function Oi(n,t,e,r){var i=[],u=[],a=0,o=Math.min(n.length,t.length)-1;for(n[o]<n[0]&&(n=n.slice().reverse(),t=t.slice().reverse());++a<=o;)i.push(e(n[a-1],n[a])),u.push(r(t[a-1],t[a]));return function(t){var e=ua.bisect(n,t,1,o)-1;return u[e](i[e](t))}}function Yi(n,t,e,r){function i(){var i=Math.min(n.length,t.length)>2?Oi:Pi,c=r?Rr:Pr;return a=i(n,t,c,e),o=i(t,n,c,yr),u}function u(n){return a(n)}var a,o;return u.invert=function(n){return o(n)},u.domain=function(t){return arguments.length?(n=t.map(Number),i()):n},u.range=function(n){return arguments.length?(t=n,i()):t},u.rangeRound=function(n){return u.range(n).interpolate(Hr)},u.clamp=function(n){return arguments.length?(r=n,i()):r},u.interpolate=function(n){return arguments.length?(e=n,i()):e},u.ticks=function(t){return Xi(n,t)},u.tickFormat=function(t,e){return Zi(n,t,e)},u.nice=function(){return Ri(n,Ii),i()},u.copy=function(){return Yi(n,t,e,r)},i()}function Ui(n,t){return ua.rebind(n,t,"range","rangeRound","interpolate","clamp")}function Ii(n){return n=Math.pow(10,Math.round(Math.log(n)/Math.LN10)-1),n&&{floor:function(t){return Math.floor(t/n)*n},ceil:function(t){return Math.ceil(t/n)*n}}}function Vi(n,t){var e=Fi(n),r=e[1]-e[0],i=Math.pow(10,Math.floor(Math.log(r/t)/Math.LN10)),u=t/r*i;return.15>=u?i*=10:.35>=u?i*=5:.75>=u&&(i*=2),e[0]=Math.ceil(e[0]/i)*i,e[1]=Math.floor(e[1]/i)*i+.5*i,e[2]=i,e}function Xi(n,t){return ua.range.apply(ua,Vi(n,t))}function Zi(n,t,e){var r=-Math.floor(Math.log(Vi(n,t)[2])/Math.LN10+.01);return ua.format(e?e.replace(no,function(n,t,e,i,u,a,o,c,l,f){return[t,e,i,u,a,o,c,l||"."+(r-2*("%"===f)),f].join("")}):",."+r+"f")}function Bi(n,t,e,r,i){function u(t){return n(e(t))}function a(){return e===$i?{floor:o,ceil:c}:{floor:function(n){return-c(-n)},ceil:function(n){return-o(-n)}}}function o(n){return Math.pow(t,Math.floor(Math.log(n)/Math.log(t)))}function c(n){return Math.pow(t,Math.ceil(Math.log(n)/Math.log(t)))}return u.invert=function(t){return r(n.invert(t))},u.domain=function(t){return arguments.length?(t[0]<0?(e=Gi,r=Ki):(e=$i,r=Ji),n.domain((i=t.map(Number)).map(e)),u):i},u.base=function(n){return arguments.length?(t=+n,u):t},u.nice=function(){return n.domain(Ri(i,a).map(e)),u},u.ticks=function(){var i=Fi(n.domain()),u=[];if(i.every(isFinite)){var a=Math.log(t),o=Math.floor(i[0]/a),c=Math.ceil(i[1]/a),l=r(i[0]),f=r(i[1]),s=t%1?2:t;if(e===Gi)for(u.push(-Math.pow(t,-o));o++<c;)for(var h=s-1;h>0;h--)u.push(-Math.pow(t,-o)*h);else{for(;c>o;o++)for(var h=1;s>h;h++)u.push(Math.pow(t,o)*h);u.push(Math.pow(t,o))}for(o=0;u[o]<l;o++);for(c=u.length;u[c-1]>f;c--);u=u.slice(o,c)}return u},u.tickFormat=function(n,i){if(arguments.length<2&&(i=Jo),!arguments.length)return i;var a,o=Math.log(t),c=Math.max(.1,n/u.ticks().length),l=e===Gi?(a=-1e-12,Math.floor):(a=1e-12,Math.ceil);return function(n){return n/r(o*l(e(n)/o+a))<=c?i(n):""}},u.copy=function(){return Bi(n.copy(),t,e,r,i)},Ui(u,n)}function $i(n){return Math.log(0>n?0:n)}function Ji(n){return Math.exp(n)}function Gi(n){return-Math.log(n>0?0:-n)}function Ki(n){return-Math.exp(-n)}function Wi(n,t,e){function r(t){return n(i(t))}var i=Qi(t),u=Qi(1/t);return r.invert=function(t){return u(n.invert(t))},r.domain=function(t){return arguments.length?(n.domain((e=t.map(Number)).map(i)),r):e},r.ticks=function(n){return Xi(e,n)},r.tickFormat=function(n,t){return Zi(e,n,t)},r.nice=function(){return r.domain(Ri(e,Ii))},r.exponent=function(a){return arguments.length?(i=Qi(t=a),u=Qi(1/t),n.domain(e.map(i)),r):t},r.copy=function(){return Wi(n.copy(),t,e)},Ui(r,n)}function Qi(n){return function(t){return 0>t?-Math.pow(-t,n):Math.pow(t,n)}}function nu(n,t){function e(t){return a[((u.get(t)||u.set(t,n.push(t)))-1)%a.length]}function r(t,e){return ua.range(n.length).map(function(n){return t+e*n})}var u,a,o;return e.domain=function(r){if(!arguments.length)return n;n=[],u=new i;for(var a,o=-1,c=r.length;++o<c;)u.has(a=r[o])||u.set(a,n.push(a));return e[t.t].apply(e,t.a)},e.range=function(n){return arguments.length?(a=n,o=0,t={t:"range",a:arguments},e):a},e.rangePoints=function(i,u){arguments.length<2&&(u=0);var c=i[0],l=i[1],f=(l-c)/(Math.max(1,n.length-1)+u);return a=r(n.length<2?(c+l)/2:c+f*u/2,f),o=0,t={t:"rangePoints",a:arguments},e},e.rangeBands=function(i,u,c){arguments.length<2&&(u=0),arguments.length<3&&(c=u);var l=i[1]<i[0],f=i[l-0],s=i[1-l],h=(s-f)/(n.length-u+2*c);return a=r(f+h*c,h),l&&a.reverse(),o=h*(1-u),t={t:"rangeBands",a:arguments},e},e.rangeRoundBands=function(i,u,c){arguments.length<2&&(u=0),arguments.length<3&&(c=u);var l=i[1]<i[0],f=i[l-0],s=i[1-l],h=Math.floor((s-f)/(n.length-u+2*c)),g=s-f-(n.length-u)*h;return a=r(f+Math.round(g/2),h),l&&a.reverse(),o=Math.round(h*(1-u)),t={t:"rangeRoundBands",a:arguments},e},e.rangeBand=function(){return o},e.rangeExtent=function(){return Fi(t.a[0])},e.copy=function(){return nu(n,t)},e.domain(n)}function tu(n,t){function e(){var e=0,u=t.length;for(i=[];++e<u;)i[e-1]=ua.quantile(n,e/u);return r}function r(n){return isNaN(n=+n)?0/0:t[ua.bisect(i,n)]}var i;return r.domain=function(t){return arguments.length?(n=t.filter(function(n){return!isNaN(n)}).sort(ua.ascending),e()):n},r.range=function(n){return arguments.length?(t=n,e()):t},r.quantiles=function(){return i},r.copy=function(){return tu(n,t)},e()}function eu(n,t,e){function r(t){return e[Math.max(0,Math.min(a,Math.floor(u*(t-n))))]}function i(){return u=e.length/(t-n),a=e.length-1,r}var u,a;return r.domain=function(e){return arguments.length?(n=+e[0],t=+e[e.length-1],i()):[n,t]},r.range=function(n){return arguments.length?(e=n,i()):e},r.copy=function(){return eu(n,t,e)},i()}function ru(n,t){function e(e){return t[ua.bisect(n,e)]}return e.domain=function(t){return arguments.length?(n=t,e):n},e.range=function(n){return arguments.length?(t=n,e):t},e.copy=function(){return ru(n,t)},e}function iu(n){function t(n){return+n}return t.invert=t,t.domain=t.range=function(e){return arguments.length?(n=e.map(t),t):n},t.ticks=function(t){return Xi(n,t)},t.tickFormat=function(t,e){return Zi(n,t,e)},t.copy=function(){return iu(n)},t}function uu(n){return n.innerRadius}function au(n){return n.outerRadius}function ou(n){return n.startAngle}function cu(n){return n.endAngle}function lu(n){for(var t,e,r,i=-1,u=n.length;++i<u;)t=n[i],e=t[0],r=t[1]+nc,t[0]=e*Math.cos(r),t[1]=e*Math.sin(r);return n}function fu(n){function t(t){function c(){d.push("M",o(n(v),s),f,l(n(m.reverse()),s),"Z")}for(var h,g,p,d=[],m=[],v=[],y=-1,M=t.length,x=lt(e),b=lt(i),_=e===r?function(){return g}:lt(r),w=i===u?function(){return p}:lt(u);++y<M;)a.call(this,h=t[y],y)?(m.push([g=+x.call(this,h,y),p=+b.call(this,h,y)]),v.push([+_.call(this,h,y),+w.call(this,h,y)])):m.length&&(c(),m=[],v=[]);return m.length&&c(),d.length?d.join(""):null}var e=je,r=je,i=0,u=Le,a=Ht,o=Fe,c=o.key,l=o,f="L",s=.7;return t.x=function(n){return arguments.length?(e=r=n,t):r},t.x0=function(n){return arguments.length?(e=n,t):e},t.x1=function(n){return arguments.length?(r=n,t):r},t.y=function(n){return arguments.length?(i=u=n,t):u},t.y0=function(n){return arguments.length?(i=n,t):i},t.y1=function(n){return arguments.length?(u=n,t):u},t.defined=function(n){return arguments.length?(a=n,t):a},t.interpolate=function(n){return arguments.length?(c="function"==typeof n?o=n:(o=jo.get(n)||Fe).key,l=o.reverse||o,f=o.closed?"M":"L",t):c},t.tension=function(n){return arguments.length?(s=n,t):s},t}function su(n){return n.radius}function hu(n){return[n.x,n.y]}function gu(n){return function(){var t=n.apply(this,arguments),e=t[0],r=t[1]+nc;return[e*Math.cos(r),e*Math.sin(r)]}}function pu(){return 64}function du(){return"circle"}function mu(n){var t=Math.sqrt(n/Da);return"M0,"+t+"A"+t+","+t+" 0 1,1 0,"+-t+"A"+t+","+t+" 0 1,1 0,"+t+"Z"}function vu(n,t){return va(n,ac),n.id=t,n}function yu(n,t,e,r){var i=n.id;return D(n,"function"==typeof e?function(n,u,a){n.__transition__[i].tween.set(t,r(e.call(n,n.__data__,u,a)))}:(e=r(e),function(n){n.__transition__[i].tween.set(t,e)}))}function Mu(n){return null==n&&(n=""),function(){this.textContent=n}}function xu(n,t,e,r){var u=n.__transition__||(n.__transition__={active:0,count:0}),a=u[e];if(!a){var o=r.time;return a=u[e]={tween:new i,event:ua.dispatch("start","end"),time:o,ease:r.ease,delay:r.delay,duration:r.duration},++u.count,ua.timer(function(r){function i(r){return u.active>e?l():(u.active=e,h.start.call(n,f,t),a.tween.forEach(function(e,r){(r=r.call(n,f,t))&&d.push(r)}),c(r)||ua.timer(c,0,o),1)}function c(r){if(u.active!==e)return l();for(var i=(r-g)/p,a=s(i),o=d.length;o>0;)d[--o].call(n,a);return i>=1?(l(),h.end.call(n,f,t),1):void 0}function l(){return--u.count?delete u[e]:delete n.__transition__,1}var f=n.__data__,s=a.ease,h=a.event,g=a.delay,p=a.duration,d=[];return r>=g?i(r):ua.timer(i,g,o),1},0,o),a}}function bu(n,t){n.attr("transform",function(n){return"translate("+t(n)+",0)"})}function _u(n,t){n.attr("transform",function(n){return"translate(0,"+t(n)+")"})}function wu(n,t,e){if(r=[],e&&t.length>1){for(var r,i,u,a=Fi(n.domain()),o=-1,c=t.length,l=(t[1]-t[0])/++e;++o<c;)for(i=e;--i>0;)(u=+t[o]-i*l)>=a[0]&&r.push(u);for(--o,i=0;++i<e&&(u=+t[o]+i*l)<a[1];)r.push(u)}return r}function Su(){this._=new Date(arguments.length>1?Date.UTC.apply(this,arguments):arguments[0])}function Eu(n,t,e){function r(t){var e=n(t),r=u(e,1);return r-t>t-e?e:r}function i(e){return t(e=n(new gc(e-1)),1),e}function u(n,e){return t(n=new gc(+n),e),n}function a(n,r,u){var a=i(n),o=[];if(u>1)for(;r>a;)e(a)%u||o.push(new Date(+a)),t(a,1);else for(;r>a;)o.push(new Date(+a)),t(a,1);return o}function o(n,t,e){try{gc=Su;var r=new Su;return r._=n,a(r,t,e)}finally{gc=Date}}n.floor=n,n.round=r,n.ceil=i,n.offset=u,n.range=a;var c=n.utc=ku(n);return c.floor=c,c.round=ku(r),c.ceil=ku(i),c.offset=ku(u),c.range=o,n}function ku(n){return function(t,e){try{gc=Su;var r=new Su;return r._=t,n(r,e)._}finally{gc=Date}}}function Au(n,t,e,r){for(var i,u,a=0,o=t.length,c=e.length;o>a;){if(r>=c)return-1;if(i=t.charCodeAt(a++),37===i){if(u=Cc[t.charAt(a++)],!u||(r=u(n,e,r))<0)return-1}else if(i!=e.charCodeAt(r++))return-1}return r}function Nu(n){return RegExp("^(?:"+n.map(ua.requote).join("|")+")","i")}function qu(n){for(var t=new i,e=-1,r=n.length;++e<r;)t.set(n[e].toLowerCase(),e);return t}function Tu(n,t,e){n+="";var r=n.length;return e>r?Array(e-r+1).join(t)+n:n}function Cu(n,t,e){Sc.lastIndex=0;var r=Sc.exec(t.substring(e));return r?e+=r[0].length:-1}function zu(n,t,e){wc.lastIndex=0;var r=wc.exec(t.substring(e));return r?e+=r[0].length:-1}function Du(n,t,e){Ac.lastIndex=0;var r=Ac.exec(t.substring(e));return r?(n.m=Nc.get(r[0].toLowerCase()),e+=r[0].length):-1}function ju(n,t,e){Ec.lastIndex=0;var r=Ec.exec(t.substring(e));return r?(n.m=kc.get(r[0].toLowerCase()),e+=r[0].length):-1}function Lu(n,t,e){return Au(n,""+Tc.c,t,e)}function Fu(n,t,e){return Au(n,""+Tc.x,t,e)}function Hu(n,t,e){return Au(n,""+Tc.X,t,e)}function Pu(n,t,e){zc.lastIndex=0;var r=zc.exec(t.substring(e,e+4));return r?(n.y=+r[0],e+=r[0].length):-1}function Ru(n,t,e){zc.lastIndex=0;var r=zc.exec(t.substring(e,e+2));return r?(n.y=Ou(+r[0]),e+=r[0].length):-1}function Ou(n){return n+(n>68?1900:2e3)}function Yu(n,t,e){zc.lastIndex=0;var r=zc.exec(t.substring(e,e+2));return r?(n.m=r[0]-1,e+=r[0].length):-1}function Uu(n,t,e){zc.lastIndex=0;var r=zc.exec(t.substring(e,e+2));return r?(n.d=+r[0],e+=r[0].length):-1}function Iu(n,t,e){zc.lastIndex=0;var r=zc.exec(t.substring(e,e+2));return r?(n.H=+r[0],e+=r[0].length):-1}function Vu(n,t,e){zc.lastIndex=0;var r=zc.exec(t.substring(e,e+2));return r?(n.M=+r[0],e+=r[0].length):-1}function Xu(n,t,e){zc.lastIndex=0;var r=zc.exec(t.substring(e,e+2));return r?(n.S=+r[0],e+=r[0].length):-1}function Zu(n,t,e){zc.lastIndex=0;var r=zc.exec(t.substring(e,e+3));return r?(n.L=+r[0],e+=r[0].length):-1}function Bu(n,t,e){var r=Dc.get(t.substring(e,e+=2).toLowerCase());return null==r?-1:(n.p=r,e)}function $u(n){var t=n.getTimezoneOffset(),e=t>0?"-":"+",r=~~(Math.abs(t)/60),i=Math.abs(t)%60;return e+Tu(r,"0",2)+Tu(i,"0",2)}function Ju(n){return n.toISOString()}function Gu(n,t,e){function r(t){return n(t)}return r.invert=function(t){return Ku(n.invert(t))},r.domain=function(t){return arguments.length?(n.domain(t),r):n.domain().map(Ku)},r.nice=function(n){return r.domain(Ri(r.domain(),function(){return n}))},r.ticks=function(e,i){var u=Fi(r.domain());if("function"!=typeof e){var a=u[1]-u[0],o=a/e,c=ua.bisect(Lc,o);if(c==Lc.length)return t.year(u,e);if(!c)return n.ticks(e).map(Ku);Math.log(o/Lc[c-1])<Math.log(Lc[c]/o)&&--c,e=t[c],i=e[1],e=e[0].range}return e(u[0],new Date(+u[1]+1),i)},r.tickFormat=function(){return e},r.copy=function(){return Gu(n.copy(),t,e)},Ui(r,n)}function Ku(n){return new Date(n)}function Wu(n){return function(t){for(var e=n.length-1,r=n[e];!r[1](t);)r=n[--e];return r[0](t)}}function Qu(n){var t=new Date(n,0,1);return t.setFullYear(n),t}function na(n){var t=n.getFullYear(),e=Qu(t),r=Qu(t+1);return t+(n-e)/(r-e)}function ta(n){var t=new Date(Date.UTC(n,0,1));return t.setUTCFullYear(n),t}function ea(n){var t=n.getUTCFullYear(),e=ta(t),r=ta(t+1);return t+(n-e)/(r-e)}function ra(n){return JSON.parse(n.responseText)}function ia(n){var t=aa.createRange();return t.selectNode(aa.body),t.createContextualFragment(n.responseText)}var ua={version:"3.1.10"};Date.now||(Date.now=function(){return+new Date});var aa=document,oa=window;try{aa.createElement("div").style.setProperty("opacity",0,"")}catch(ca){var la=oa.CSSStyleDeclaration.prototype,fa=la.setProperty;la.setProperty=function(n,t,e){fa.call(this,n,t+"",e)}}ua.ascending=function(n,t){return t>n?-1:n>t?1:n>=t?0:0/0},ua.descending=function(n,t){return n>t?-1:t>n?1:t>=n?0:0/0},ua.min=function(n,t){var e,r,i=-1,u=n.length;if(arguments.length===1){for(;++i<u&&((e=n[i])==null||e!=e);)e=void 0;for(;++i<u;)(r=n[i])!=null&&e>r&&(e=r)}else{for(;++i<u&&((e=t.call(n,n[i],i))==null||e!=e);)e=void 0;for(;++i<u;)(r=t.call(n,n[i],i))!=null&&e>r&&(e=r)}return e},ua.max=function(n,t){var e,r,i=-1,u=n.length;if(arguments.length===1){for(;++i<u&&((e=n[i])==null||e!=e);)e=void 0;for(;++i<u;)(r=n[i])!=null&&r>e&&(e=r)}else{for(;++i<u&&((e=t.call(n,n[i],i))==null||e!=e);)e=void 0;for(;++i<u;)(r=t.call(n,n[i],i))!=null&&r>e&&(e=r)}return e},ua.extent=function(n,t){var e,r,i,u=-1,a=n.length;if(arguments.length===1){for(;++u<a&&((e=i=n[u])==null||e!=e);)e=i=void 0;for(;++u<a;)(r=n[u])!=null&&(e>r&&(e=r),r>i&&(i=r))}else{for(;++u<a&&((e=i=t.call(n,n[u],u))==null||e!=e);)e=void 0;for(;++u<a;)(r=t.call(n,n[u],u))!=null&&(e>r&&(e=r),r>i&&(i=r))}return[e,i]},ua.sum=function(n,t){var e,r=0,i=n.length,u=-1;if(arguments.length===1)for(;++u<i;)isNaN(e=+n[u])||(r+=e);else for(;++u<i;)isNaN(e=+t.call(n,n[u],u))||(r+=e);return r},ua.mean=function(t,e){var r,i=t.length,u=0,a=-1,o=0;if(arguments.length===1)for(;++a<i;)n(r=t[a])&&(u+=(r-u)/++o);else for(;++a<i;)n(r=e.call(t,t[a],a))&&(u+=(r-u)/++o);return o?u:void 0},ua.quantile=function(n,t){var e=(n.length-1)*t+1,r=Math.floor(e),i=+n[r-1],u=e-r;return u?i+u*(n[r]-i):i},ua.median=function(t,e){return arguments.length>1&&(t=t.map(e)),t=t.filter(n),t.length?ua.quantile(t.sort(ua.ascending),.5):void 0},ua.bisector=function(n){return{left:function(t,e,r,i){for(arguments.length<3&&(r=0),arguments.length<4&&(i=t.length);i>r;){var u=r+i>>>1;n.call(t,t[u],u)<e?r=u+1:i=u}return r},right:function(t,e,r,i){for(arguments.length<3&&(r=0),arguments.length<4&&(i=t.length);i>r;){var u=r+i>>>1;e<n.call(t,t[u],u)?i=u:r=u+1}return r}}};var sa=ua.bisector(function(n){return n});ua.bisectLeft=sa.left,ua.bisect=ua.bisectRight=sa.right,ua.shuffle=function(n){for(var t,e,r=n.length;r;)e=Math.random()*r--|0,t=n[r],n[r]=n[e],n[e]=t;return n},ua.permute=function(n,t){for(var e=[],r=-1,i=t.length;++r<i;)e[r]=n[t[r]];return e},ua.zip=function(){if(!(i=arguments.length))return[];for(var n=-1,e=ua.min(arguments,t),r=Array(e);++n<e;)for(var i,u=-1,a=r[n]=Array(i);++u<i;)a[u]=arguments[u][n];return r},ua.transpose=function(n){return ua.zip.apply(ua,n)},ua.keys=function(n){var t=[];for(var e in n)t.push(e);return t},ua.values=function(n){var t=[];for(var e in n)t.push(n[e]);return t},ua.entries=function(n){var t=[];for(var e in n)t.push({key:e,value:n[e]});return t},ua.merge=function(n){return Array.prototype.concat.apply([],n)},ua.range=function(n,t,r){if(arguments.length<3&&(r=1,arguments.length<2&&(t=n,n=0)),1/0===(t-n)/r)throw Error("infinite range");var i,u=[],a=e(Math.abs(r)),o=-1;if(n*=a,t*=a,r*=a,0>r)for(;(i=n+r*++o)>t;)u.push(i/a);else for(;(i=n+r*++o)<t;)u.push(i/a);return u},ua.map=function(n){var t=new i;for(var e in n)t.set(e,n[e]);return t},r(i,{has:function(n){return ha+n in this},get:function(n){return this[ha+n]},set:function(n,t){return this[ha+n]=t},remove:function(n){return n=ha+n,n in this&&delete this[n]},keys:function(){var n=[];return this.forEach(function(t){n.push(t)}),n},values:function(){var n=[];return this.forEach(function(t,e){n.push(e)}),n},entries:function(){var n=[];return this.forEach(function(t,e){n.push({key:t,value:e})}),n},forEach:function(n){for(var t in this)t.charCodeAt(0)===ga&&n.call(this,t.substring(1),this[t])}});var ha="\0",ga=ha.charCodeAt(0);ua.nest=function(){function n(t,o,c){if(c>=a.length)return r?r.call(u,o):e?o.sort(e):o;for(var l,f,s,h,g=-1,p=o.length,d=a[c++],m=new i;++g<p;)(h=m.get(l=d(f=o[g])))?h.push(f):m.set(l,[f]);return t?(f=t(),s=function(e,r){f.set(e,n(t,r,c))}):(f={},s=function(e,r){f[e]=n(t,r,c)}),m.forEach(s),f}function t(n,e){if(e>=a.length)return n;var r=[],i=o[e++];return n.forEach(function(n,i){r.push({key:n,values:t(i,e)})}),i?r.sort(function(n,t){return i(n.key,t.key)}):r}var e,r,u={},a=[],o=[];return u.map=function(t,e){return n(e,t,0)},u.entries=function(e){return t(n(ua.map,e,0),0)},u.key=function(n){return a.push(n),u},u.sortKeys=function(n){return o[a.length-1]=n,u},u.sortValues=function(n){return e=n,u},u.rollup=function(n){return r=n,u},u},ua.set=function(n){var t=new u;if(n)for(var e=0;e<n.length;e++)t.add(n[e]);return t},r(u,{has:function(n){return ha+n in this
},add:function(n){return this[ha+n]=!0,n},remove:function(n){return n=ha+n,n in this&&delete this[n]},values:function(){var n=[];return this.forEach(function(t){n.push(t)}),n},forEach:function(n){for(var t in this)t.charCodeAt(0)===ga&&n.call(this,t.substring(1))}}),ua.behavior={},ua.rebind=function(n,t){for(var e,r=1,i=arguments.length;++r<i;)n[e=arguments[r]]=a(n,t,t[e]);return n},ua.dispatch=function(){for(var n=new o,t=-1,e=arguments.length;++t<e;)n[arguments[t]]=c(n);return n},o.prototype.on=function(n,t){var e=n.indexOf("."),r="";if(e>=0&&(r=n.substring(e+1),n=n.substring(0,e)),n)return arguments.length<2?this[n].on(r):this[n].on(r,t);if(arguments.length===2){if(null==t)for(n in this)this.hasOwnProperty(n)&&this[n].on(r,null);return this}},ua.event=null,ua.mouse=function(n){return g(n,f())};var pa=/WebKit/.test(oa.navigator.userAgent)?-1:0,da=d;try{da(aa.documentElement.childNodes)[0].nodeType}catch(ma){da=p}var va=[].__proto__?function(n,t){n.__proto__=t}:function(n,t){for(var e in t)n[e]=t[e]};ua.touches=function(n,t){return arguments.length<2&&(t=f().touches),t?da(t).map(function(t){var e=g(n,t);return e.identifier=t.identifier,e}):[]},ua.behavior.drag=function(){function n(){this.on("mousedown.drag",t).on("touchstart.drag",t)}function t(){function n(){var n=a.parentNode;return null!=f?ua.touches(n).filter(function(n){return n.identifier===f})[0]:ua.mouse(n)}function t(){if(!a.parentNode)return i();var t=n(),e=t[0]-h[0],r=t[1]-h[1];g|=e|r,h=t,l(),o({type:"drag",x:t[0]+u[0],y:t[1]+u[1],dx:e,dy:r})}function i(){o({type:"dragend"}),g&&(l(),ua.event.target===c&&s(p,"click")),p.on(null!=f?"touchmove.drag-"+f:"mousemove.drag",null).on(null!=f?"touchend.drag-"+f:"mouseup.drag",null)}var u,a=this,o=e.of(a,arguments),c=ua.event.target,f=ua.event.touches?ua.event.changedTouches[0].identifier:null,h=n(),g=0,p=ua.select(oa).on(null!=f?"touchmove.drag-"+f:"mousemove.drag",t).on(null!=f?"touchend.drag-"+f:"mouseup.drag",i,!0);r?(u=r.apply(a,arguments),u=[u.x-h[0],u.y-h[1]]):u=[0,0],null==f&&l(),o({type:"dragstart"})}var e=h(n,"drag","dragstart","dragend"),r=null;return n.origin=function(t){return arguments.length?(r=t,n):r},ua.rebind(n,e,"on")};var ya=function(n,t){return t.querySelector(n)},Ma=function(n,t){return t.querySelectorAll(n)},xa=aa.documentElement,ba=xa.matchesSelector||xa.webkitMatchesSelector||xa.mozMatchesSelector||xa.msMatchesSelector||xa.oMatchesSelector,_a=function(n,t){return ba.call(n,t)};"function"==typeof Sizzle&&(ya=function(n,t){return Sizzle(n,t)[0]||null},Ma=function(n,t){return Sizzle.uniqueSort(Sizzle(n,t))},_a=Sizzle.matchesSelector),ua.selection=function(){return Na};var wa=ua.selection.prototype=[];wa.select=function(n){var t,e,r,i,u=[];"function"!=typeof n&&(n=v(n));for(var a=-1,o=this.length;++a<o;){u.push(t=[]),t.parentNode=(r=this[a]).parentNode;for(var c=-1,l=r.length;++c<l;)(i=r[c])?(t.push(e=n.call(i,i.__data__,c)),e&&"__data__"in i&&(e.__data__=i.__data__)):t.push(null)}return m(u)},wa.selectAll=function(n){var t,e,r=[];"function"!=typeof n&&(n=y(n));for(var i=-1,u=this.length;++i<u;)for(var a=this[i],o=-1,c=a.length;++o<c;)(e=a[o])&&(r.push(t=da(n.call(e,e.__data__,o))),t.parentNode=e);return m(r)};var Sa={svg:"http://www.w3.org/2000/svg",xhtml:"http://www.w3.org/1999/xhtml",xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};ua.ns={prefix:Sa,qualify:function(n){var t=n.indexOf(":"),e=n;return t>=0&&(e=n.substring(0,t),n=n.substring(t+1)),Sa.hasOwnProperty(e)?{space:Sa[e],local:n}:n}},wa.attr=function(n,t){if(arguments.length<2){if("string"==typeof n){var e=this.node();return n=ua.ns.qualify(n),n.local?e.getAttributeNS(n.space,n.local):e.getAttribute(n)}for(t in n)this.each(M(t,n[t]));return this}return this.each(M(n,t))},ua.requote=function(n){return n.replace(Ea,"\\$&")};var Ea=/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;wa.classed=function(n,t){if(arguments.length<2){if("string"==typeof n){var e=this.node(),r=(n=n.trim().split(/^|\s+/g)).length,i=-1;if(t=e.classList){for(;++i<r;)if(!t.contains(n[i]))return!1}else for(t=e.getAttribute("class");++i<r;)if(!b(n[i]).test(t))return!1;return!0}for(t in n)this.each(_(t,n[t]));return this}return this.each(_(n,t))},wa.style=function(n,t,e){var r=arguments.length;if(3>r){if("string"!=typeof n){2>r&&(t="");for(e in n)this.each(S(e,n[e],t));return this}if(2>r)return oa.getComputedStyle(this.node(),null).getPropertyValue(n);e=""}return this.each(S(n,t,e))},wa.property=function(n,t){if(arguments.length<2){if("string"==typeof n)return this.node()[n];for(t in n)this.each(E(t,n[t]));return this}return this.each(E(n,t))},wa.text=function(n){return arguments.length?this.each("function"==typeof n?function(){var t=n.apply(this,arguments);this.textContent=null==t?"":t}:null==n?function(){this.textContent=""}:function(){this.textContent=n}):this.node().textContent},wa.html=function(n){return arguments.length?this.each("function"==typeof n?function(){var t=n.apply(this,arguments);this.innerHTML=null==t?"":t}:null==n?function(){this.innerHTML=""}:function(){this.innerHTML=n}):this.node().innerHTML},wa.append=function(n){function t(){return this.appendChild(aa.createElementNS(this.namespaceURI,n))}function e(){return this.appendChild(aa.createElementNS(n.space,n.local))}return n=ua.ns.qualify(n),this.select(n.local?e:t)},wa.insert=function(n,t){function e(e,r){return this.insertBefore(aa.createElementNS(this.namespaceURI,n),t.call(this,e,r))}function r(e,r){return this.insertBefore(aa.createElementNS(n.space,n.local),t.call(this,e,r))}return n=ua.ns.qualify(n),"function"!=typeof t&&(t=v(t)),this.select(n.local?r:e)},wa.remove=function(){return this.each(function(){var n=this.parentNode;n&&n.removeChild(this)})},wa.data=function(n,t){function e(n,e){var r,u,a,o=n.length,s=e.length,h=Math.min(o,s),g=Array(s),p=Array(s),d=Array(o);if(t){var m,v=new i,y=new i,M=[];for(r=-1;++r<o;)m=t.call(u=n[r],u.__data__,r),v.has(m)?d[r]=u:v.set(m,u),M.push(m);for(r=-1;++r<s;)m=t.call(e,a=e[r],r),(u=v.get(m))?(g[r]=u,u.__data__=a):y.has(m)||(p[r]=k(a)),y.set(m,a),v.remove(m);for(r=-1;++r<o;)v.has(M[r])&&(d[r]=n[r])}else{for(r=-1;++r<h;)u=n[r],a=e[r],u?(u.__data__=a,g[r]=u):p[r]=k(a);for(;s>r;++r)p[r]=k(e[r]);for(;o>r;++r)d[r]=n[r]}p.update=g,p.parentNode=g.parentNode=d.parentNode=n.parentNode,c.push(p),l.push(g),f.push(d)}var r,u,a=-1,o=this.length;if(!arguments.length){for(n=Array(o=(r=this[0]).length);++a<o;)(u=r[a])&&(n[a]=u.__data__);return n}var c=j([]),l=m([]),f=m([]);if("function"==typeof n)for(;++a<o;)e(r=this[a],n.call(r,r.parentNode.__data__,a));else for(;++a<o;)e(r=this[a],n);return l.enter=function(){return c},l.exit=function(){return f},l},wa.datum=function(n){return arguments.length?this.property("__data__",n):this.property("__data__")},wa.filter=function(n){var t,e,r,i=[];"function"!=typeof n&&(n=A(n));for(var u=0,a=this.length;a>u;u++){i.push(t=[]),t.parentNode=(e=this[u]).parentNode;for(var o=0,c=e.length;c>o;o++)(r=e[o])&&n.call(r,r.__data__,o)&&t.push(r)}return m(i)},wa.order=function(){for(var n=-1,t=this.length;++n<t;)for(var e,r=this[n],i=r.length-1,u=r[i];--i>=0;)(e=r[i])&&(u&&u!==e.nextSibling&&u.parentNode.insertBefore(e,u),u=e);return this},wa.sort=function(n){n=N.apply(this,arguments);for(var t=-1,e=this.length;++t<e;)this[t].sort(n);return this.order()},wa.on=function(n,t,e){var r=arguments.length;if(3>r){if("string"!=typeof n){2>r&&(t=!1);for(e in n)this.each(T(e,n[e],t));return this}if(2>r)return(r=this.node()["__on"+n])&&r._;e=!1}return this.each(T(n,t,e))};var ka=ua.map({mouseenter:"mouseover",mouseleave:"mouseout"});ka.forEach(function(n){"on"+n in aa&&ka.remove(n)}),wa.each=function(n){return D(this,function(t,e,r){n.call(t,t.__data__,e,r)})},wa.call=function(n){var t=da(arguments);return n.apply(t[0]=this,t),this},wa.empty=function(){return!this.node()},wa.node=function(){for(var n=0,t=this.length;t>n;n++)for(var e=this[n],r=0,i=e.length;i>r;r++){var u=e[r];if(u)return u}return null};var Aa=[];ua.selection.enter=j,ua.selection.enter.prototype=Aa,Aa.append=wa.append,Aa.insert=wa.insert,Aa.empty=wa.empty,Aa.node=wa.node,Aa.select=function(n){for(var t,e,r,i,u,a=[],o=-1,c=this.length;++o<c;){r=(i=this[o]).update,a.push(t=[]),t.parentNode=i.parentNode;for(var l=-1,f=i.length;++l<f;)(u=i[l])?(t.push(r[l]=e=n.call(i.parentNode,u.__data__,l)),e.__data__=u.__data__):t.push(null)}return m(a)},wa.transition=function(){var n,t,e=rc||++oc,r=[],i=Object.create(cc);i.time=Date.now();for(var u=-1,a=this.length;++u<a;){r.push(n=[]);for(var o=this[u],c=-1,l=o.length;++c<l;)(t=o[c])&&xu(t,c,e,i),n.push(t)}return vu(r,e)},ua.select=function(n){var t=["string"==typeof n?ya(n,aa):n];return t.parentNode=xa,m([t])},ua.selectAll=function(n){var t=da("string"==typeof n?Ma(n,aa):n);return t.parentNode=xa,m([t])};var Na=ua.select(xa);ua.behavior.zoom=function(){function n(){this.on("mousedown.zoom",o).on("mousemove.zoom",f).on(Ca+".zoom",c).on("dblclick.zoom",g).on("touchstart.zoom",p).on("touchmove.zoom",d).on("touchend.zoom",p)}function t(n){return[(n[0]-w[0])/S,(n[1]-w[1])/S]}function e(n){return[n[0]*S+w[0],n[1]*S+w[1]]}function r(n){S=Math.max(E[0],Math.min(E[1],n))}function i(n,t){t=e(t),w[0]+=n[0]-t[0],w[1]+=n[1]-t[1]}function u(){M&&M.domain(y.range().map(function(n){return(n-w[0])/S}).map(y.invert)),b&&b.domain(x.range().map(function(n){return(n-w[1])/S}).map(x.invert))}function a(n){u(),ua.event.preventDefault(),n({type:"zoom",scale:S,translate:w})}function o(){function n(){c=1,i(ua.mouse(r),h),a(u)}function e(){c&&l(),f.on("mousemove.zoom",null).on("mouseup.zoom",null),c&&ua.event.target===o&&s(f,"click.zoom")}var r=this,u=k.of(r,arguments),o=ua.event.target,c=0,f=ua.select(oa).on("mousemove.zoom",n).on("mouseup.zoom",e),h=t(ua.mouse(r));oa.focus(),l()}function c(){m||(m=t(ua.mouse(this))),r(Math.pow(2,qa()*.002)*S),i(ua.mouse(this),m),a(k.of(this,arguments))}function f(){m=null}function g(){var n=ua.mouse(this),e=t(n),u=Math.log(S)/Math.LN2;r(Math.pow(2,ua.event.shiftKey?Math.ceil(u)-1:Math.floor(u)+1)),i(n,e),a(k.of(this,arguments))}function p(){var n=ua.touches(this),e=Date.now();if(v=S,m={},n.forEach(function(n){m[n.identifier]=t(n)}),l(),n.length===1){if(500>e-_){var u=n[0],o=t(n[0]);r(2*S),i(u,o),a(k.of(this,arguments))}_=e}}function d(){var n=ua.touches(this),t=n[0],e=m[t.identifier];if(u=n[1]){var u,o=m[u.identifier];t=[(t[0]+u[0])/2,(t[1]+u[1])/2],e=[(e[0]+o[0])/2,(e[1]+o[1])/2],r(ua.event.scale*v)}i(t,e),_=null,a(k.of(this,arguments))}var m,v,y,M,x,b,_,w=[0,0],S=1,E=Ta,k=h(n,"zoom");return n.translate=function(t){return arguments.length?(w=t.map(Number),u(),n):w},n.scale=function(t){return arguments.length?(S=+t,u(),n):S},n.scaleExtent=function(t){return arguments.length?(E=null==t?Ta:t.map(Number),n):E},n.x=function(t){return arguments.length?(M=t,y=t.copy(),w=[0,0],S=1,n):M},n.y=function(t){return arguments.length?(b=t,x=t.copy(),w=[0,0],S=1,n):b},ua.rebind(n,k,"on")};var qa,Ta=[0,1/0],Ca="onwheel"in aa?(qa=function(){return-ua.event.deltaY*(ua.event.deltaMode?120:1)},"wheel"):"onmousewheel"in aa?(qa=function(){return ua.event.wheelDelta},"mousewheel"):(qa=function(){return-ua.event.detail},"MozMousePixelScroll");L.prototype.toString=function(){return this.rgb()+""},ua.hsl=function(n,t,e){return arguments.length===1?n instanceof H?F(n.h,n.s,n.l):it(""+n,ut,F):F(+n,+t,+e)};var za=H.prototype=new L;za.brighter=function(n){return n=Math.pow(.7,arguments.length?n:1),F(this.h,this.s,this.l/n)},za.darker=function(n){return n=Math.pow(.7,arguments.length?n:1),F(this.h,this.s,n*this.l)},za.rgb=function(){return P(this.h,this.s,this.l)};var Da=Math.PI,ja=1e-6,La=Da/180,Fa=180/Da;ua.hcl=function(n,t,e){return arguments.length===1?n instanceof Z?X(n.h,n.c,n.l):n instanceof J?K(n.l,n.a,n.b):K((n=at((n=ua.rgb(n)).r,n.g,n.b)).l,n.a,n.b):X(+n,+t,+e)};var Ha=Z.prototype=new L;Ha.brighter=function(n){return X(this.h,this.c,Math.min(100,this.l+Pa*(arguments.length?n:1)))},Ha.darker=function(n){return X(this.h,this.c,Math.max(0,this.l-Pa*(arguments.length?n:1)))},Ha.rgb=function(){return B(this.h,this.c,this.l).rgb()},ua.lab=function(n,t,e){return arguments.length===1?n instanceof J?$(n.l,n.a,n.b):n instanceof Z?B(n.l,n.c,n.h):at((n=ua.rgb(n)).r,n.g,n.b):$(+n,+t,+e)};var Pa=18,Ra=.95047,Oa=1,Ya=1.08883,Ua=J.prototype=new L;Ua.brighter=function(n){return $(Math.min(100,this.l+Pa*(arguments.length?n:1)),this.a,this.b)},Ua.darker=function(n){return $(Math.max(0,this.l-Pa*(arguments.length?n:1)),this.a,this.b)},Ua.rgb=function(){return G(this.l,this.a,this.b)},ua.rgb=function(n,t,e){return arguments.length===1?n instanceof et?tt(n.r,n.g,n.b):it(""+n,tt,P):tt(~~n,~~t,~~e)};var Ia=et.prototype=new L;Ia.brighter=function(n){n=Math.pow(.7,arguments.length?n:1);var t=this.r,e=this.g,r=this.b,i=30;return t||e||r?(t&&i>t&&(t=i),e&&i>e&&(e=i),r&&i>r&&(r=i),tt(Math.min(255,Math.floor(t/n)),Math.min(255,Math.floor(e/n)),Math.min(255,Math.floor(r/n)))):tt(i,i,i)},Ia.darker=function(n){return n=Math.pow(.7,arguments.length?n:1),tt(Math.floor(n*this.r),Math.floor(n*this.g),Math.floor(n*this.b))},Ia.hsl=function(){return ut(this.r,this.g,this.b)},Ia.toString=function(){return"#"+rt(this.r)+rt(this.g)+rt(this.b)};var Va=ua.map({aliceblue:"#f0f8ff",antiquewhite:"#faebd7",aqua:"#00ffff",aquamarine:"#7fffd4",azure:"#f0ffff",beige:"#f5f5dc",bisque:"#ffe4c4",black:"#000000",blanchedalmond:"#ffebcd",blue:"#0000ff",blueviolet:"#8a2be2",brown:"#a52a2a",burlywood:"#deb887",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkgray:"#a9a9a9",darkgreen:"#006400",darkgrey:"#a9a9a9",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",darkseagreen:"#8fbc8f",darkslateblue:"#483d8b",darkslategray:"#2f4f4f",darkslategrey:"#2f4f4f",darkturquoise:"#00ced1",darkviolet:"#9400d3",deeppink:"#ff1493",deepskyblue:"#00bfff",dimgray:"#696969",dimgrey:"#696969",dodgerblue:"#1e90ff",firebrick:"#b22222",floralwhite:"#fffaf0",forestgreen:"#228b22",fuchsia:"#ff00ff",gainsboro:"#dcdcdc",ghostwhite:"#f8f8ff",gold:"#ffd700",goldenrod:"#daa520",gray:"#808080",green:"#008000",greenyellow:"#adff2f",grey:"#808080",honeydew:"#f0fff0",hotpink:"#ff69b4",indianred:"#cd5c5c",indigo:"#4b0082",ivory:"#fffff0",khaki:"#f0e68c",lavender:"#e6e6fa",lavenderblush:"#fff0f5",lawngreen:"#7cfc00",lemonchiffon:"#fffacd",lightblue:"#add8e6",lightcoral:"#f08080",lightcyan:"#e0ffff",lightgoldenrodyellow:"#fafad2",lightgray:"#d3d3d3",lightgreen:"#90ee90",lightgrey:"#d3d3d3",lightpink:"#ffb6c1",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",lightskyblue:"#87cefa",lightslategray:"#778899",lightslategrey:"#778899",lightsteelblue:"#b0c4de",lightyellow:"#ffffe0",lime:"#00ff00",limegreen:"#32cd32",linen:"#faf0e6",magenta:"#ff00ff",maroon:"#800000",mediumaquamarine:"#66cdaa",mediumblue:"#0000cd",mediumorchid:"#ba55d3",mediumpurple:"#9370db",mediumseagreen:"#3cb371",mediumslateblue:"#7b68ee",mediumspringgreen:"#00fa9a",mediumturquoise:"#48d1cc",mediumvioletred:"#c71585",midnightblue:"#191970",mintcream:"#f5fffa",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",navajowhite:"#ffdead",navy:"#000080",oldlace:"#fdf5e6",olive:"#808000",olivedrab:"#6b8e23",orange:"#ffa500",orangered:"#ff4500",orchid:"#da70d6",palegoldenrod:"#eee8aa",palegreen:"#98fb98",paleturquoise:"#afeeee",palevioletred:"#db7093",papayawhip:"#ffefd5",peachpuff:"#ffdab9",peru:"#cd853f",pink:"#ffc0cb",plum:"#dda0dd",powderblue:"#b0e0e6",purple:"#800080",red:"#ff0000",rosybrown:"#bc8f8f",royalblue:"#4169e1",saddlebrown:"#8b4513",salmon:"#fa8072",sandybrown:"#f4a460",seagreen:"#2e8b57",seashell:"#fff5ee",sienna:"#a0522d",silver:"#c0c0c0",skyblue:"#87ceeb",slateblue:"#6a5acd",slategray:"#708090",slategrey:"#708090",snow:"#fffafa",springgreen:"#00ff7f",steelblue:"#4682b4",tan:"#d2b48c",teal:"#008080",thistle:"#d8bfd8",tomato:"#ff6347",turquoise:"#40e0d0",violet:"#ee82ee",wheat:"#f5deb3",white:"#ffffff",whitesmoke:"#f5f5f5",yellow:"#ffff00",yellowgreen:"#9acd32"});Va.forEach(function(n,t){Va.set(n,it(t,tt,P))}),ua.functor=lt,ua.xhr=st(ft),ua.csv=pt(",","text/csv"),ua.tsv=pt("	","text/tab-separated-values");var Xa,Za,Ba,$a;ua.timer=function(n,t,e){if(arguments.length<3){if(arguments.length<2)t=0;else if(!isFinite(t))return;e=Date.now()}var r=e+t,i={callback:n,time:r,next:null};Za?Za.next=i:Xa=i,Za=i,Ba||($a=clearTimeout($a),Ba=1,Ja(dt))},ua.timer.flush=function(){mt(),vt()};var Ja=oa.requestAnimationFrame||oa.webkitRequestAnimationFrame||oa.mozRequestAnimationFrame||oa.oRequestAnimationFrame||oa.msRequestAnimationFrame||function(n){setTimeout(n,17)},Ga=".",Ka=",",Wa=[3,3],Qa=["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"].map(yt);ua.formatPrefix=function(n,t){var e=0;return n&&(0>n&&(n*=-1),t&&(n=ua.round(n,Mt(n,t))),e=1+Math.floor(1e-12+Math.log(n)/Math.LN10),e=Math.max(-24,Math.min(24,Math.floor((0>=e?e+1:e-1)/3)*3))),Qa[8+e/3]},ua.round=function(n,t){return t?Math.round(n*(t=Math.pow(10,t)))/t:Math.round(n)},ua.format=function(n){var t=no.exec(n),e=t[1]||" ",r=t[2]||">",i=t[3]||"",u=t[4]||"",a=t[5],o=+t[6],c=t[7],l=t[8],f=t[9],s=1,h="",g=!1;switch(l&&(l=+l.substring(1)),(a||"0"===e&&"="===r)&&(a=e="0",r="=",c&&(o-=Math.floor((o-1)/4))),f){case"n":c=!0,f="g";break;case"%":s=100,h="%",f="f";break;case"p":s=100,h="%",f="r";break;case"b":case"o":case"x":case"X":u&&(u="0"+f.toLowerCase());case"c":case"d":g=!0,l=0;break;case"s":s=-1,f="r"}"#"===u&&(u=""),"r"!=f||l||(f="g"),null!=l&&("g"==f?l=Math.max(1,Math.min(21,l)):("e"==f||"f"==f)&&(l=Math.max(0,Math.min(20,l)))),f=to.get(f)||xt;var p=a&&c;return function(n){if(g&&n%1)return"";var t=0>n||0===n&&0>1/n?(n=-n,"-"):i;if(0>s){var d=ua.formatPrefix(n,l);n=d.scale(n),h=d.symbol}else n*=s;n=f(n,l),!a&&c&&(n=eo(n));var m=u.length+n.length+(p?0:t.length),v=o>m?Array(m=o-m+1).join(e):"";return p&&(n=eo(v+n)),Ga&&n.replace(".",Ga),t+=u,("<"===r?t+n+v:">"===r?v+t+n:"^"===r?v.substring(0,m>>=1)+t+n+v.substring(m):t+(p?n:v+n))+h}};var no=/(?:([^{])?([<>=^]))?([+\- ])?(#)?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i,to=ua.map({b:function(n){return n.toString(2)},c:function(n){return String.fromCharCode(n)},o:function(n){return n.toString(8)},x:function(n){return n.toString(16)},X:function(n){return n.toString(16).toUpperCase()},g:function(n,t){return n.toPrecision(t)},e:function(n,t){return n.toExponential(t)},f:function(n,t){return n.toFixed(t)},r:function(n,t){return(n=ua.round(n,Mt(n,t))).toFixed(Math.max(0,Math.min(20,Mt(n*(1+1e-15),t))))}}),eo=ft;if(Wa){var ro=Wa.length;eo=function(n){for(var t=n.lastIndexOf("."),e=t>=0?"."+n.substring(t+1):(t=n.length,""),r=[],i=0,u=Wa[0];t>0&&u>0;)r.push(n.substring(t-=u,t+u)),u=Wa[i=(i+1)%ro];return r.reverse().join(Ka||"")+e}}ua.geo={},ua.geo.stream=function(n,t){n&&io.hasOwnProperty(n.type)?io[n.type](n,t):bt(n,t)};var io={Feature:function(n,t){bt(n.geometry,t)},FeatureCollection:function(n,t){for(var e=n.features,r=-1,i=e.length;++r<i;)bt(e[r].geometry,t)}},uo={Sphere:function(n,t){t.sphere()},Point:function(n,t){var e=n.coordinates;t.point(e[0],e[1])},MultiPoint:function(n,t){for(var e,r=n.coordinates,i=-1,u=r.length;++i<u;)e=r[i],t.point(e[0],e[1])},LineString:function(n,t){_t(n.coordinates,t,0)},MultiLineString:function(n,t){for(var e=n.coordinates,r=-1,i=e.length;++r<i;)_t(e[r],t,0)},Polygon:function(n,t){wt(n.coordinates,t)},MultiPolygon:function(n,t){for(var e=n.coordinates,r=-1,i=e.length;++r<i;)wt(e[r],t)},GeometryCollection:function(n,t){for(var e=n.geometries,r=-1,i=e.length;++r<i;)bt(e[r],t)}};ua.geo.area=function(n){return ao=0,ua.geo.stream(n,co),ao};var ao,oo,co={sphere:function(){ao+=4*Da},point:q,lineStart:q,lineEnd:q,polygonStart:function(){oo=0,co.lineStart=St},polygonEnd:function(){var n=2*oo;ao+=0>n?4*Da+n:n,co.lineStart=co.lineEnd=co.point=q}};ua.geo.bounds=function(){function n(n,t){M.push(x=[f=n,h=n]),s>t&&(s=t),t>g&&(g=t)}function t(t,e){var r=Et([t*La,e*La]);if(v){var i=At(v,r),u=[i[1],-i[0],0],a=At(u,i);Tt(a),a=Ct(a);var c=t-p,l=c>0?1:-1,d=a[0]*Fa*l,m=Math.abs(c)>180;if(m^(d>l*p&&l*t>d)){var y=a[1]*Fa;y>g&&(g=y)}else if(d=(d+360)%360-180,m^(d>l*p&&l*t>d)){var y=-a[1]*Fa;s>y&&(s=y)}else s>e&&(s=e),e>g&&(g=e);m?p>t?o(f,t)>o(f,h)&&(h=t):o(t,h)>o(f,h)&&(f=t):h>=f?(f>t&&(f=t),t>h&&(h=t)):t>p?o(f,t)>o(f,h)&&(h=t):o(t,h)>o(f,h)&&(f=t)}else n(t,e);v=r,p=t}function e(){b.point=t}function r(){x[0]=f,x[1]=h,b.point=n,v=null}function i(n,e){if(v){var r=n-p;y+=Math.abs(r)>180?r+(r>0?360:-360):r}else d=n,m=e;co.point(n,e),t(n,e)}function u(){co.lineStart()}function a(){i(d,m),co.lineEnd(),Math.abs(y)>ja&&(f=-(h=180)),x[0]=f,x[1]=h,v=null}function o(n,t){return(t-=n)<0?t+360:t}function c(n,t){return n[0]-t[0]}function l(n,t){return t[0]<=t[1]?t[0]<=n&&n<=t[1]:n<t[0]||t[1]<n}var f,s,h,g,p,d,m,v,y,M,x,b={point:n,lineStart:e,lineEnd:r,polygonStart:function(){b.point=i,b.lineStart=u,b.lineEnd=a,y=0,co.polygonStart()},polygonEnd:function(){co.polygonEnd(),b.point=n,b.lineStart=e,b.lineEnd=r,0>oo?(f=-(h=180),s=-(g=90)):y>ja?g=90:-ja>y&&(s=-90),x[0]=f,x[1]=h}};return function(n){g=h=-(f=s=1/0),M=[],ua.geo.stream(n,b),M.sort(c);for(var t,e=1,r=M.length,i=M[0],u=[i];r>e;++e)t=M[e],l(t[0],i)||l(t[1],i)?(o(i[0],t[1])>o(i[0],i[1])&&(i[1]=t[1]),o(t[0],i[1])>o(i[0],i[1])&&(i[0]=t[0])):u.push(i=t);for(var a,t,p=-1/0,r=u.length-1,e=0,i=u[r];r>=e;i=t,++e)t=u[e],(a=o(i[1],t[0]))>p&&(p=a,f=t[0],h=i[1]);return M=x=null,[[f,s],[h,g]]}}(),ua.geo.centroid=function(n){lo=fo=so=ho=go=0,ua.geo.stream(n,po);var t;return fo&&Math.abs(t=Math.sqrt(so*so+ho*ho+go*go))>ja?[Math.atan2(ho,so)*Fa,Math.asin(Math.max(-1,Math.min(1,go/t)))*Fa]:void 0};var lo,fo,so,ho,go,po={sphere:function(){2>lo&&(lo=2,fo=so=ho=go=0)},point:Dt,lineStart:Lt,lineEnd:Ft,polygonStart:function(){2>lo&&(lo=2,fo=so=ho=go=0),po.lineStart=jt},polygonEnd:function(){po.lineStart=Lt}},mo=Ot(Ht,Xt,Bt),vo=1e9;ua.geo.projection=Qt,ua.geo.projectionMutator=ne,(ua.geo.equirectangular=function(){return Qt(ee)}).raw=ee.invert=ee,ua.geo.rotation=function(n){function t(t){return t=n(t[0]*La,t[1]*La),t[0]*=Fa,t[1]*=Fa,t}return n=re(n[0]%360*La,n[1]*La,n.length>2?n[2]*La:0),t.invert=function(t){return t=n.invert(t[0]*La,t[1]*La),t[0]*=Fa,t[1]*=Fa,t},t},ua.geo.circle=function(){function n(){var n="function"==typeof r?r.apply(this,arguments):r,t=re(-n[0]*La,-n[1]*La,0).invert,i=[];return e(null,null,1,{point:function(n,e){i.push(n=t(n,e)),n[0]*=Fa,n[1]*=Fa}}),{type:"Polygon",coordinates:[i]}}var t,e,r=[0,0],i=6;return n.origin=function(t){return arguments.length?(r=t,n):r},n.angle=function(r){return arguments.length?(e=oe((t=+r)*La,i*La),n):t},n.precision=function(r){return arguments.length?(e=oe(t*La,(i=+r)*La),n):i},n.angle(90)},ua.geo.distance=function(n,t){var e,r=(t[0]-n[0])*La,i=n[1]*La,u=t[1]*La,a=Math.sin(r),o=Math.cos(r),c=Math.sin(i),l=Math.cos(i),f=Math.sin(u),s=Math.cos(u);return Math.atan2(Math.sqrt((e=s*a)*e+(e=l*f-c*s*o)*e),c*f+l*s*o)},ua.geo.graticule=function(){function n(){return{type:"MultiLineString",coordinates:t()}}function t(){return ua.range(Math.ceil(u/m)*m,i,m).map(h).concat(ua.range(Math.ceil(l/v)*v,c,v).map(g)).concat(ua.range(Math.ceil(r/p)*p,e,p).filter(function(n){return Math.abs(n%m)>ja}).map(f)).concat(ua.range(Math.ceil(o/d)*d,a,d).filter(function(n){return Math.abs(n%v)>ja}).map(s))}var e,r,i,u,a,o,c,l,f,s,h,g,p=10,d=p,m=90,v=360,y=2.5;return n.lines=function(){return t().map(function(n){return{type:"LineString",coordinates:n}})},n.outline=function(){return{type:"Polygon",coordinates:[h(u).concat(g(c).slice(1),h(i).reverse().slice(1),g(l).reverse().slice(1))]}},n.extent=function(t){return arguments.length?n.majorExtent(t).minorExtent(t):n.minorExtent()},n.majorExtent=function(t){return arguments.length?(u=+t[0][0],i=+t[1][0],l=+t[0][1],c=+t[1][1],u>i&&(t=u,u=i,i=t),l>c&&(t=l,l=c,c=t),n.precision(y)):[[u,l],[i,c]]},n.minorExtent=function(t){return arguments.length?(r=+t[0][0],e=+t[1][0],o=+t[0][1],a=+t[1][1],r>e&&(t=r,r=e,e=t),o>a&&(t=o,o=a,a=t),n.precision(y)):[[r,o],[e,a]]},n.step=function(t){return arguments.length?n.majorStep(t).minorStep(t):n.minorStep()},n.majorStep=function(t){return arguments.length?(m=+t[0],v=+t[1],n):[m,v]},n.minorStep=function(t){return arguments.length?(p=+t[0],d=+t[1],n):[p,d]},n.precision=function(t){return arguments.length?(y=+t,f=le(o,a,90),s=fe(r,e,y),h=le(l,c,90),g=fe(u,i,y),n):y},n.majorExtent([[-180,-90+ja],[180,90-ja]]).minorExtent([[-180,-80-ja],[180,80+ja]])},ua.geo.greatArc=function(){function n(){return{type:"LineString",coordinates:[t||r.apply(this,arguments),e||i.apply(this,arguments)]}}var t,e,r=se,i=he;return n.distance=function(){return ua.geo.distance(t||r.apply(this,arguments),e||i.apply(this,arguments))},n.source=function(e){return arguments.length?(r=e,t="function"==typeof e?null:e,n):r},n.target=function(t){return arguments.length?(i=t,e="function"==typeof t?null:t,n):i},n.precision=function(){return arguments.length?n:0},n},ua.geo.interpolate=function(n,t){return ge(n[0]*La,n[1]*La,t[0]*La,t[1]*La)},ua.geo.length=function(n){return yo=0,ua.geo.stream(n,Mo),yo};var yo,Mo={sphere:q,point:q,lineStart:pe,lineEnd:q,polygonStart:q,polygonEnd:q};(ua.geo.conicEqualArea=function(){return de(me)}).raw=me,ua.geo.albers=function(){return ua.geo.conicEqualArea().rotate([96,0]).center([-.6,38.7]).parallels([29.5,45.5]).scale(1070)},ua.geo.albersUsa=function(){function n(n){var u=n[0],a=n[1];return t=null,e(u,a),t||(r(u,a),t)||i(u,a),t}var t,e,r,i,u=ua.geo.albers(),a=ua.geo.conicEqualArea().rotate([154,0]).center([-2,58.5]).parallels([55,65]),o=ua.geo.conicEqualArea().rotate([157,0]).center([-3,19.9]).parallels([8,18]),c={point:function(n,e){t=[n,e]}};return n.invert=function(n){var t=u.scale(),e=u.translate(),r=(n[0]-e[0])/t,i=(n[1]-e[1])/t;return(i>=.12&&.234>i&&r>=-.425&&-.214>r?a:i>=.166&&.234>i&&r>=-.214&&-.115>r?o:u).invert(n)},n.stream=function(n){var t=u.stream(n),e=a.stream(n),r=o.stream(n);return{point:function(n,i){t.point(n,i),e.point(n,i),r.point(n,i)},sphere:function(){t.sphere(),e.sphere(),r.sphere()},lineStart:function(){t.lineStart(),e.lineStart(),r.lineStart()},lineEnd:function(){t.lineEnd(),e.lineEnd(),r.lineEnd()},polygonStart:function(){t.polygonStart(),e.polygonStart(),r.polygonStart()},polygonEnd:function(){t.polygonEnd(),e.polygonEnd(),r.polygonEnd()}}},n.precision=function(t){return arguments.length?(u.precision(t),a.precision(t),o.precision(t),n):u.precision()},n.scale=function(t){return arguments.length?(u.scale(t),a.scale(.35*t),o.scale(t),n.translate(u.translate())):u.scale()},n.translate=function(t){if(!arguments.length)return u.translate();var l=u.scale(),f=+t[0],s=+t[1];return e=u.translate(t).clipExtent([[f-.455*l,s-.238*l],[f+.455*l,s+.238*l]]).stream(c).point,r=a.translate([f-.307*l,s+.201*l]).clipExtent([[f-.425*l+ja,s+.12*l+ja],[f-.214*l-ja,s+.234*l-ja]]).stream(c).point,i=o.translate([f-.205*l,s+.212*l]).clipExtent([[f-.214*l+ja,s+.166*l+ja],[f-.115*l-ja,s+.234*l-ja]]).stream(c).point,n},n.scale(1070)};var xo,bo,_o,wo,So,Eo,ko={point:q,lineStart:q,lineEnd:q,polygonStart:function(){bo=0,ko.lineStart=ve},polygonEnd:function(){ko.lineStart=ko.lineEnd=ko.point=q,xo+=Math.abs(bo/2)}},Ao={point:ye,lineStart:q,lineEnd:q,polygonStart:q,polygonEnd:q},No={point:be,lineStart:_e,lineEnd:we,polygonStart:function(){No.lineStart=Se},polygonEnd:function(){No.point=be,No.lineStart=_e,No.lineEnd=we}};ua.geo.path=function(){function n(n){return n&&ua.geo.stream(n,r(i.pointRadius("function"==typeof u?+u.apply(this,arguments):u))),i.result()}var t,e,r,i,u=4.5;return n.area=function(n){return xo=0,ua.geo.stream(n,r(ko)),xo},n.centroid=function(n){return lo=so=ho=go=0,ua.geo.stream(n,r(No)),go?[so/go,ho/go]:void 0},n.bounds=function(n){return So=Eo=-(_o=wo=1/0),ua.geo.stream(n,r(Ao)),[[_o,wo],[So,Eo]]},n.projection=function(e){return arguments.length?(r=(t=e)?e.stream||ke(e):ft,n):t},n.context=function(t){return arguments.length?(i=(e=t)==null?new Me:new Ee(t),n):e},n.pointRadius=function(t){return arguments.length?(u="function"==typeof t?t:+t,n):u},n.projection(ua.geo.albersUsa()).context(null)};var qo=Ae(function(n){return Math.sqrt(2/(1+n))},function(n){return 2*Math.asin(n/2)});(ua.geo.azimuthalEqualArea=function(){return Qt(qo)}).raw=qo;var To=Ae(function(n){var t=Math.acos(n);return t&&t/Math.sin(t)},ft);(ua.geo.azimuthalEquidistant=function(){return Qt(To)}).raw=To,(ua.geo.conicConformal=function(){return de(Ne)}).raw=Ne,(ua.geo.conicEquidistant=function(){return de(qe)}).raw=qe;var Co=Ae(function(n){return 1/n},Math.atan);(ua.geo.gnomonic=function(){return Qt(Co)}).raw=Co,Te.invert=function(n,t){return[n,2*Math.atan(Math.exp(t))-Da/2]},(ua.geo.mercator=function(){return Ce(Te)}).raw=Te;var zo=Ae(function(){return 1},Math.asin);(ua.geo.orthographic=function(){return Qt(zo)}).raw=zo;var Do=Ae(function(n){return 1/(1+n)},function(n){return 2*Math.atan(n)});(ua.geo.stereographic=function(){return Qt(Do)}).raw=Do,ze.invert=function(n,t){return[Math.atan2(U(n),Math.cos(t)),Y(Math.sin(t)/I(n))]},(ua.geo.transverseMercator=function(){return Ce(ze)}).raw=ze,ua.geom={},ua.svg={},ua.svg.line=function(){return De(ft)};var jo=ua.map({linear:Fe,"linear-closed":He,"step-before":Pe,"step-after":Re,basis:Xe,"basis-open":Ze,"basis-closed":Be,bundle:$e,cardinal:Ue,"cardinal-open":Oe,"cardinal-closed":Ye,monotone:nr});jo.forEach(function(n,t){t.key=n,t.closed=/-closed$/.test(n)});var Lo=[0,2/3,1/3,0],Fo=[0,1/3,2/3,0],Ho=[0,1/6,2/3,1/6];ua.geom.hull=function(n){function t(n){if(n.length<3)return[];var t,i,u,a,o,c,l,f,s,h,g,p,d=lt(e),m=lt(r),v=n.length,y=v-1,M=[],x=[],b=0;if(d===je&&r===Le)t=n;else for(u=0,t=[];v>u;++u)t.push([+d.call(this,i=n[u],u),+m.call(this,i,u)]);for(u=1;v>u;++u)(t[u][1]<t[b][1]||t[u][1]==t[b][1]&&t[u][0]<t[b][0])&&(b=u);for(u=0;v>u;++u)u!==b&&(c=t[u][1]-t[b][1],o=t[u][0]-t[b][0],M.push({angle:Math.atan2(c,o),index:u}));for(M.sort(function(n,t){return n.angle-t.angle}),g=M[0].angle,h=M[0].index,s=0,u=1;y>u;++u){if(a=M[u].index,g==M[u].angle){if(o=t[h][0]-t[b][0],c=t[h][1]-t[b][1],l=t[a][0]-t[b][0],f=t[a][1]-t[b][1],o*o+c*c>=l*l+f*f){M[u].index=-1;continue}M[s].index=-1}g=M[u].angle,s=u,h=a}for(x.push(b),u=0,a=0;2>u;++a)M[a].index>-1&&(x.push(M[a].index),u++);for(p=x.length;y>a;++a)if(!(M[a].index<0)){for(;!tr(x[p-2],x[p-1],M[a].index,t);)--p;x[p++]=M[a].index}var _=[];for(u=p-1;u>=0;--u)_.push(n[x[u]]);return _}var e=je,r=Le;return arguments.length?t(n):(t.x=function(n){return arguments.length?(e=n,t):e},t.y=function(n){return arguments.length?(r=n,t):r},t)},ua.geom.polygon=function(n){return n.area=function(){for(var t=0,e=n.length,r=n[e-1][1]*n[0][0]-n[e-1][0]*n[0][1];++t<e;)r+=n[t-1][1]*n[t][0]-n[t-1][0]*n[t][1];return.5*r},n.centroid=function(t){var e,r,i=-1,u=n.length,a=0,o=0,c=n[u-1];for(arguments.length||(t=-1/(6*n.area()));++i<u;)e=c,c=n[i],r=e[0]*c[1]-c[0]*e[1],a+=(e[0]+c[0])*r,o+=(e[1]+c[1])*r;return[a*t,o*t]},n.clip=function(t){for(var e,r,i,u,a,o,c=-1,l=n.length,f=n[l-1];++c<l;){for(e=t.slice(),t.length=0,u=n[c],a=e[(i=e.length)-1],r=-1;++r<i;)o=e[r],er(o,f,u)?(er(a,f,u)||t.push(rr(a,o,f,u)),t.push(o)):er(a,f,u)&&t.push(rr(a,o,f,u)),a=o;f=u}return t},n},ua.geom.delaunay=function(n){var t=n.map(function(){return[]}),e=[];return ir(n,function(e){t[e.region.l.index].push(n[e.region.r.index])}),t.forEach(function(t,r){var i=n[r],u=i[0],a=i[1];t.forEach(function(n){n.angle=Math.atan2(n[0]-u,n[1]-a)}),t.sort(function(n,t){return n.angle-t.angle});for(var o=0,c=t.length-1;c>o;o++)e.push([i,t[o],t[o+1]])}),e},ua.geom.voronoi=function(n){function t(n){var t,r,a,o=n.map(function(){return[]}),c=lt(i),l=lt(u),f=n.length,s=1e6;if(c===je&&l===Le)t=n;else for(t=[],a=0;f>a;++a)t.push([+c.call(this,r=n[a],a),+l.call(this,r,a)]);if(ir(t,function(n){var t,e,r,i,u,a;n.a===1&&n.b>=0?(t=n.ep.r,e=n.ep.l):(t=n.ep.l,e=n.ep.r),n.a===1?(u=t?t.y:-s,r=n.c-n.b*u,a=e?e.y:s,i=n.c-n.b*a):(r=t?t.x:-s,u=n.c-n.a*r,i=e?e.x:s,a=n.c-n.a*i);var c=[r,u],l=[i,a];o[n.region.l.index].push(c,l),o[n.region.r.index].push(c,l)}),o=o.map(function(n,e){var r=t[e][0],i=t[e][1],u=n.map(function(n){return Math.atan2(n[0]-r,n[1]-i)
}),a=ua.range(n.length).sort(function(n,t){return u[n]-u[t]});return a.filter(function(n,t){return!t||u[n]-u[a[t-1]]>ja}).map(function(t){return n[t]})}),o.forEach(function(n,e){var r=n.length;if(!r)return n.push([-s,-s],[-s,s],[s,s],[s,-s]);if(!(r>2)){var i=t[e],u=n[0],a=n[1],o=i[0],c=i[1],l=u[0],f=u[1],h=a[0],g=a[1],p=Math.abs(h-l),d=g-f;if(Math.abs(d)<ja){var m=f>c?-s:s;n.push([-s,m],[s,m])}else if(ja>p){var v=l>o?-s:s;n.push([v,-s],[v,s])}else{var m=(l-o)*(g-f)>(h-l)*(f-c)?s:-s,y=Math.abs(d)-p;Math.abs(y)<ja?n.push([0>d?m:-m,m]):(y>0&&(m*=-1),n.push([-s,m],[s,m]))}}}),e)for(a=0;f>a;++a)e(o[a]);for(a=0;f>a;++a)o[a].point=n[a];return o}var e,r=null,i=je,u=Le;return arguments.length?t(n):(t.x=function(n){return arguments.length?(i=n,t):i},t.y=function(n){return arguments.length?(u=n,t):u},t.size=function(n){return arguments.length?(null==n?e=null:(r=[+n[0],+n[1]],e=ua.geom.polygon([[0,0],[0,r[1]],r,[r[0],0]]).clip),t):r},t.links=function(n){var t,e,r,a=n.map(function(){return[]}),o=[],c=lt(i),l=lt(u),f=n.length;if(c===je&&l===Le)t=n;else for(r=0;f>r;++r)t.push([+c.call(this,e=n[r],r),+l.call(this,e,r)]);return ir(t,function(t){var e=t.region.l.index,r=t.region.r.index;a[e][r]||(a[e][r]=a[r][e]=!0,o.push({source:n[e],target:n[r]}))}),o},t.triangles=function(n){if(i===je&&u===Le)return ua.geom.delaunay(n);var t,e,r,a,o,c=lt(i),l=lt(u);for(a=0,t=[],o=n.length;o>a;++a)e=[+c.call(this,r=n[a],a),+l.call(this,r,a)],e.data=r,t.push(e);return ua.geom.delaunay(t).map(function(n){return n.map(function(n){return n.data})})},t)};var Po={l:"r",r:"l"};ua.geom.quadtree=function(n,t,e,r,i){function u(n){function u(n,t,e,r,i,u,a,o){if(!isNaN(e)&&!isNaN(r))if(n.leaf){var c=n.x,f=n.y;if(null!=c)if(Math.abs(c-e)+Math.abs(f-r)<.01)l(n,t,e,r,i,u,a,o);else{var s=n.point;n.x=n.y=n.point=null,l(n,s,c,f,i,u,a,o),l(n,t,e,r,i,u,a,o)}else n.x=e,n.y=r,n.point=t}else l(n,t,e,r,i,u,a,o)}function l(n,t,e,r,i,a,o,c){var l=.5*(i+o),f=.5*(a+c),s=e>=l,h=r>=f,g=(h<<1)+s;n.leaf=!1,n=n.nodes[g]||(n.nodes[g]=or()),s?i=l:o=l,h?a=f:c=f,u(n,t,e,r,i,a,o,c)}var f,s,h,g,p,d,m,v,y,M=lt(o),x=lt(c);if(null!=t)d=t,m=e,v=r,y=i;else if(v=y=-(d=m=1/0),s=[],h=[],p=n.length,a)for(g=0;p>g;++g)f=n[g],f.x<d&&(d=f.x),f.y<m&&(m=f.y),f.x>v&&(v=f.x),f.y>y&&(y=f.y),s.push(f.x),h.push(f.y);else for(g=0;p>g;++g){var b=+M(f=n[g],g),_=+x(f,g);d>b&&(d=b),m>_&&(m=_),b>v&&(v=b),_>y&&(y=_),s.push(b),h.push(_)}var w=v-d,S=y-m;w>S?y=m+w:v=d+S;var E=or();if(E.add=function(n){u(E,n,+M(n,++g),+x(n,g),d,m,v,y)},E.visit=function(n){cr(n,E,d,m,v,y)},g=-1,null==t){for(;++g<p;)u(E,n[g],s[g],h[g],d,m,v,y);--g}else n.forEach(E.add);return s=h=n=f=null,E}var a,o=je,c=Le;return(a=arguments.length)?(o=ur,c=ar,3===a&&(i=e,r=t,e=t=0),u(n)):(u.x=function(n){return arguments.length?(o=n,u):o},u.y=function(n){return arguments.length?(c=n,u):c},u.size=function(n){return arguments.length?(null==n?t=e=r=i=null:(t=e=0,r=+n[0],i=+n[1]),u):null==t?null:[r,i]},u)},ua.interpolateRgb=lr,ua.transform=function(n){var t=aa.createElementNS(ua.ns.prefix.svg,"g");return(ua.transform=function(n){if(null!=n){t.setAttribute("transform",n);var e=t.transform.baseVal.consolidate()}return new fr(e?e.matrix:Ro)})(n)},fr.prototype.toString=function(){return"translate("+this.translate+")rotate("+this.rotate+")skewX("+this.skew+")scale("+this.scale+")"};var Ro={a:1,b:0,c:0,d:1,e:0,f:0};ua.interpolateNumber=pr,ua.interpolateTransform=dr,ua.interpolateObject=mr,ua.interpolateString=vr;var Oo=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;ua.interpolate=yr,ua.interpolators=[function(n,t){var e=typeof t;return("string"===e?Va.has(t)||/^(#|rgb\(|hsl\()/.test(t)?lr:vr:t instanceof L?lr:"object"===e?Array.isArray(t)?xr:mr:pr)(n,t)}],ua.interpolateArray=xr;var Yo=function(){return ft},Uo=ua.map({linear:Yo,poly:Ar,quad:function(){return Sr},cubic:function(){return Er},sin:function(){return Nr},exp:function(){return qr},circle:function(){return Tr},elastic:Cr,back:zr,bounce:function(){return Dr}}),Io=ua.map({"in":ft,out:_r,"in-out":wr,"out-in":function(n){return wr(_r(n))}});ua.ease=function(n){var t=n.indexOf("-"),e=t>=0?n.substring(0,t):n,r=t>=0?n.substring(t+1):"in";return e=Uo.get(e)||Yo,r=Io.get(r)||ft,br(r(e.apply(null,Array.prototype.slice.call(arguments,1))))},ua.interpolateHcl=jr,ua.interpolateHsl=Lr,ua.interpolateLab=Fr,ua.interpolateRound=Hr,ua.layout={},ua.layout.bundle=function(){return function(n){for(var t=[],e=-1,r=n.length;++e<r;)t.push(Or(n[e]));return t}},ua.layout.chord=function(){function n(){var n,l,s,h,g,p={},d=[],m=ua.range(u),v=[];for(e=[],r=[],n=0,h=-1;++h<u;){for(l=0,g=-1;++g<u;)l+=i[h][g];d.push(l),v.push(ua.range(u)),n+=l}for(a&&m.sort(function(n,t){return a(d[n],d[t])}),o&&v.forEach(function(n,t){n.sort(function(n,e){return o(i[t][n],i[t][e])})}),n=(2*Da-f*u)/n,l=0,h=-1;++h<u;){for(s=l,g=-1;++g<u;){var y=m[h],M=v[y][g],x=i[y][M],b=l,_=l+=x*n;p[y+"-"+M]={index:y,subindex:M,startAngle:b,endAngle:_,value:x}}r[y]={index:y,startAngle:s,endAngle:l,value:(l-s)/n},l+=f}for(h=-1;++h<u;)for(g=h-1;++g<u;){var w=p[h+"-"+g],S=p[g+"-"+h];(w.value||S.value)&&e.push(w.value<S.value?{source:S,target:w}:{source:w,target:S})}c&&t()}function t(){e.sort(function(n,t){return c((n.source.value+n.target.value)/2,(t.source.value+t.target.value)/2)})}var e,r,i,u,a,o,c,l={},f=0;return l.matrix=function(n){return arguments.length?(u=(i=n)&&i.length,e=r=null,l):i},l.padding=function(n){return arguments.length?(f=n,e=r=null,l):f},l.sortGroups=function(n){return arguments.length?(a=n,e=r=null,l):a},l.sortSubgroups=function(n){return arguments.length?(o=n,e=null,l):o},l.sortChords=function(n){return arguments.length?(c=n,e&&t(),l):c},l.chords=function(){return e||n(),e},l.groups=function(){return r||n(),r},l},ua.layout.force=function(){function n(n){return function(t,e,r,i){if(t.point!==n){var u=t.cx-n.x,a=t.cy-n.y,o=1/Math.sqrt(u*u+a*a);if(d>(i-e)*o){var c=t.charge*o*o;return n.px-=u*c,n.py-=a*c,!0}if(t.point&&isFinite(o)){var c=t.pointCharge*o*o;n.px-=u*c,n.py-=a*c}}return!t.charge}}function t(n){n.px=ua.event.x,n.py=ua.event.y,o.resume()}var e,r,i,u,a,o={},c=ua.dispatch("start","tick","end"),l=[1,1],f=.9,s=Vo,h=Xo,g=-30,p=.1,d=.8,m=[],v=[];return o.tick=function(){if((r*=.99)<.005)return c.end({type:"end",alpha:r=0}),!0;var t,e,o,s,h,d,y,M,x,b=m.length,_=v.length;for(e=0;_>e;++e)o=v[e],s=o.source,h=o.target,M=h.x-s.x,x=h.y-s.y,(d=M*M+x*x)&&(d=r*u[e]*((d=Math.sqrt(d))-i[e])/d,M*=d,x*=d,h.x-=M*(y=s.weight/(h.weight+s.weight)),h.y-=x*y,s.x+=M*(y=1-y),s.y+=x*y);if((y=r*p)&&(M=l[0]/2,x=l[1]/2,e=-1,y))for(;++e<b;)o=m[e],o.x+=(M-o.x)*y,o.y+=(x-o.y)*y;if(g)for(Br(t=ua.geom.quadtree(m),r,a),e=-1;++e<b;)(o=m[e]).fixed||t.visit(n(o));for(e=-1;++e<b;)o=m[e],o.fixed?(o.x=o.px,o.y=o.py):(o.x-=(o.px-(o.px=o.x))*f,o.y-=(o.py-(o.py=o.y))*f);c.tick({type:"tick",alpha:r})},o.nodes=function(n){return arguments.length?(m=n,o):m},o.links=function(n){return arguments.length?(v=n,o):v},o.size=function(n){return arguments.length?(l=n,o):l},o.linkDistance=function(n){return arguments.length?(s="function"==typeof n?n:+n,o):s},o.distance=o.linkDistance,o.linkStrength=function(n){return arguments.length?(h="function"==typeof n?n:+n,o):h},o.friction=function(n){return arguments.length?(f=+n,o):f},o.charge=function(n){return arguments.length?(g="function"==typeof n?n:+n,o):g},o.gravity=function(n){return arguments.length?(p=+n,o):p},o.theta=function(n){return arguments.length?(d=+n,o):d},o.alpha=function(n){return arguments.length?(n=+n,r?r=n>0?n:0:n>0&&(c.start({type:"start",alpha:r=n}),ua.timer(o.tick)),o):r},o.start=function(){function n(n,r){for(var i,u=t(e),a=-1,o=u.length;++a<o;)if(!isNaN(i=u[a][n]))return i;return Math.random()*r}function t(){if(!c){for(c=[],r=0;p>r;++r)c[r]=[];for(r=0;d>r;++r){var n=v[r];c[n.source.index].push(n.target),c[n.target.index].push(n.source)}}return c[e]}var e,r,c,f,p=m.length,d=v.length,y=l[0],M=l[1];for(e=0;p>e;++e)(f=m[e]).index=e,f.weight=0;for(e=0;d>e;++e)f=v[e],typeof f.source=="number"&&(f.source=m[f.source]),typeof f.target=="number"&&(f.target=m[f.target]),++f.source.weight,++f.target.weight;for(e=0;p>e;++e)f=m[e],isNaN(f.x)&&(f.x=n("x",y)),isNaN(f.y)&&(f.y=n("y",M)),isNaN(f.px)&&(f.px=f.x),isNaN(f.py)&&(f.py=f.y);if(i=[],"function"==typeof s)for(e=0;d>e;++e)i[e]=+s.call(this,v[e],e);else for(e=0;d>e;++e)i[e]=s;if(u=[],"function"==typeof h)for(e=0;d>e;++e)u[e]=+h.call(this,v[e],e);else for(e=0;d>e;++e)u[e]=h;if(a=[],"function"==typeof g)for(e=0;p>e;++e)a[e]=+g.call(this,m[e],e);else for(e=0;p>e;++e)a[e]=g;return o.resume()},o.resume=function(){return o.alpha(.1)},o.stop=function(){return o.alpha(0)},o.drag=function(){return e||(e=ua.behavior.drag().origin(ft).on("dragstart.force",Ir).on("drag.force",t).on("dragend.force",Vr)),arguments.length?(this.on("mouseover.force",Xr).on("mouseout.force",Zr).call(e),void 0):e},ua.rebind(o,c,"on")};var Vo=20,Xo=1;ua.layout.hierarchy=function(){function n(t,a,o){var c=i.call(e,t,a);if(t.depth=a,o.push(t),c&&(l=c.length)){for(var l,f,s=-1,h=t.children=[],g=0,p=a+1;++s<l;)f=n(c[s],p,o),f.parent=t,h.push(f),g+=f.value;r&&h.sort(r),u&&(t.value=g)}else u&&(t.value=+u.call(e,t,a)||0);return t}function t(n,r){var i=n.children,a=0;if(i&&(o=i.length))for(var o,c=-1,l=r+1;++c<o;)a+=t(i[c],l);else u&&(a=+u.call(e,n,r)||0);return u&&(n.value=a),a}function e(t){var e=[];return n(t,0,e),e}var r=Kr,i=Jr,u=Gr;return e.sort=function(n){return arguments.length?(r=n,e):r},e.children=function(n){return arguments.length?(i=n,e):i},e.value=function(n){return arguments.length?(u=n,e):u},e.revalue=function(n){return t(n,0),n},e},ua.layout.partition=function(){function n(t,e,r,i){var u=t.children;if(t.x=e,t.y=t.depth*i,t.dx=r,t.dy=i,u&&(a=u.length)){var a,o,c,l=-1;for(r=t.value?r/t.value:0;++l<a;)n(o=u[l],e,c=o.value*r,i),e+=c}}function t(n){var e=n.children,r=0;if(e&&(i=e.length))for(var i,u=-1;++u<i;)r=Math.max(r,t(e[u]));return 1+r}function e(e,u){var a=r.call(this,e,u);return n(a[0],0,i[0],i[1]/t(a[0])),a}var r=ua.layout.hierarchy(),i=[1,1];return e.size=function(n){return arguments.length?(i=n,e):i},$r(e,r)},ua.layout.pie=function(){function n(u){var a=u.map(function(e,r){return+t.call(n,e,r)}),o=+("function"==typeof r?r.apply(this,arguments):r),c=(("function"==typeof i?i.apply(this,arguments):i)-o)/ua.sum(a),l=ua.range(u.length);null!=e&&l.sort(e===Zo?function(n,t){return a[t]-a[n]}:function(n,t){return e(u[n],u[t])});var f=[];return l.forEach(function(n){var t;f[n]={data:u[n],value:t=a[n],startAngle:o,endAngle:o+=t*c}}),f}var t=Number,e=Zo,r=0,i=2*Da;return n.value=function(e){return arguments.length?(t=e,n):t},n.sort=function(t){return arguments.length?(e=t,n):e},n.startAngle=function(t){return arguments.length?(r=t,n):r},n.endAngle=function(t){return arguments.length?(i=t,n):i},n};var Zo={};ua.layout.stack=function(){function n(o,c){var l=o.map(function(e,r){return t.call(n,e,r)}),f=l.map(function(t){return t.map(function(t,e){return[u.call(n,t,e),a.call(n,t,e)]})}),s=e.call(n,f,c);l=ua.permute(l,s),f=ua.permute(f,s);var h,g,p,d=r.call(n,f,c),m=l.length,v=l[0].length;for(g=0;v>g;++g)for(i.call(n,l[0][g],p=d[g],f[0][g][1]),h=1;m>h;++h)i.call(n,l[h][g],p+=f[h-1][g][1],f[h][g][1]);return o}var t=ft,e=ei,r=ri,i=ti,u=Qr,a=ni;return n.values=function(e){return arguments.length?(t=e,n):t},n.order=function(t){return arguments.length?(e="function"==typeof t?t:Bo.get(t)||ei,n):e},n.offset=function(t){return arguments.length?(r="function"==typeof t?t:$o.get(t)||ri,n):r},n.x=function(t){return arguments.length?(u=t,n):u},n.y=function(t){return arguments.length?(a=t,n):a},n.out=function(t){return arguments.length?(i=t,n):i},n};var Bo=ua.map({"inside-out":function(n){var t,e,r=n.length,i=n.map(ii),u=n.map(ui),a=ua.range(r).sort(function(n,t){return i[n]-i[t]}),o=0,c=0,l=[],f=[];for(t=0;r>t;++t)e=a[t],c>o?(o+=u[e],l.push(e)):(c+=u[e],f.push(e));return f.reverse().concat(l)},reverse:function(n){return ua.range(n.length).reverse()},"default":ei}),$o=ua.map({silhouette:function(n){var t,e,r,i=n.length,u=n[0].length,a=[],o=0,c=[];for(e=0;u>e;++e){for(t=0,r=0;i>t;t++)r+=n[t][e][1];r>o&&(o=r),a.push(r)}for(e=0;u>e;++e)c[e]=(o-a[e])/2;return c},wiggle:function(n){var t,e,r,i,u,a,o,c,l,f=n.length,s=n[0],h=s.length,g=[];for(g[0]=c=l=0,e=1;h>e;++e){for(t=0,i=0;f>t;++t)i+=n[t][e][1];for(t=0,u=0,o=s[e][0]-s[e-1][0];f>t;++t){for(r=0,a=(n[t][e][1]-n[t][e-1][1])/(2*o);t>r;++r)a+=(n[r][e][1]-n[r][e-1][1])/o;u+=a*n[t][e][1]}g[e]=c-=i?u/i*o:0,l>c&&(l=c)}for(e=0;h>e;++e)g[e]-=l;return g},expand:function(n){var t,e,r,i=n.length,u=n[0].length,a=1/i,o=[];for(e=0;u>e;++e){for(t=0,r=0;i>t;t++)r+=n[t][e][1];if(r)for(t=0;i>t;t++)n[t][e][1]/=r;else for(t=0;i>t;t++)n[t][e][1]=a}for(e=0;u>e;++e)o[e]=0;return o},zero:ri});ua.layout.histogram=function(){function n(n,u){for(var a,o,c=[],l=n.map(e,this),f=r.call(this,l,u),s=i.call(this,f,l,u),u=-1,h=l.length,g=s.length-1,p=t?1:1/h;++u<g;)a=c[u]=[],a.dx=s[u+1]-(a.x=s[u]),a.y=0;if(g>0)for(u=-1;++u<h;)o=l[u],o>=f[0]&&o<=f[1]&&(a=c[ua.bisect(s,o,1,g)-1],a.y+=p,a.push(n[u]));return c}var t=!0,e=Number,r=li,i=oi;return n.value=function(t){return arguments.length?(e=t,n):e},n.range=function(t){return arguments.length?(r=lt(t),n):r},n.bins=function(t){return arguments.length?(i="number"==typeof t?function(n){return ci(n,t)}:lt(t),n):i},n.frequency=function(e){return arguments.length?(t=!!e,n):t},n},ua.layout.tree=function(){function n(n,i){function u(n,t){var r=n.children,i=n._tree;if(r&&(a=r.length)){for(var a,c,l,f=r[0],s=f,h=-1;++h<a;)l=r[h],u(l,c),s=o(l,c,s),c=l;yi(n);var g=.5*(f._tree.prelim+l._tree.prelim);t?(i.prelim=t._tree.prelim+e(n,t),i.mod=i.prelim-g):i.prelim=g}else t&&(i.prelim=t._tree.prelim+e(n,t))}function a(n,t){n.x=n._tree.prelim+t;var e=n.children;if(e&&(r=e.length)){var r,i=-1;for(t+=n._tree.mod;++i<r;)a(e[i],t)}}function o(n,t,r){if(t){for(var i,u=n,a=n,o=t,c=n.parent.children[0],l=u._tree.mod,f=a._tree.mod,s=o._tree.mod,h=c._tree.mod;o=hi(o),u=si(u),o&&u;)c=si(c),a=hi(a),a._tree.ancestor=n,i=o._tree.prelim+s-u._tree.prelim-l+e(o,u),i>0&&(Mi(xi(o,n,r),n,i),l+=i,f+=i),s+=o._tree.mod,l+=u._tree.mod,h+=c._tree.mod,f+=a._tree.mod;o&&!hi(a)&&(a._tree.thread=o,a._tree.mod+=s-f),u&&!si(c)&&(c._tree.thread=u,c._tree.mod+=l-h,r=n)}return r}var c=t.call(this,n,i),l=c[0];vi(l,function(n,t){n._tree={ancestor:n,prelim:0,mod:0,change:0,shift:0,number:t?t._tree.number+1:0}}),u(l),a(l,-l._tree.prelim);var f=gi(l,di),s=gi(l,pi),h=gi(l,mi),g=f.x-e(f,s)/2,p=s.x+e(s,f)/2,d=h.depth||1;return vi(l,function(n){n.x=(n.x-g)/(p-g)*r[0],n.y=n.depth/d*r[1],delete n._tree}),c}var t=ua.layout.hierarchy().sort(null).value(null),e=fi,r=[1,1];return n.separation=function(t){return arguments.length?(e=t,n):e},n.size=function(t){return arguments.length?(r=t,n):r},$r(n,t)},ua.layout.pack=function(){function n(n,i){var u=t.call(this,n,i),a=u[0];a.x=0,a.y=0,vi(a,function(n){n.r=Math.sqrt(n.value)}),vi(a,Ei);var o=r[0],c=r[1],l=Math.max(2*a.r/o,2*a.r/c);if(e>0){var f=e*l/2;vi(a,function(n){n.r+=f}),vi(a,Ei),vi(a,function(n){n.r-=f}),l=Math.max(2*a.r/o,2*a.r/c)}return Ni(a,o/2,c/2,1/l),u}var t=ua.layout.hierarchy().sort(bi),e=0,r=[1,1];return n.size=function(t){return arguments.length?(r=t,n):r},n.padding=function(t){return arguments.length?(e=+t,n):e},$r(n,t)},ua.layout.cluster=function(){function n(n,i){var u,a=t.call(this,n,i),o=a[0],c=0;vi(o,function(n){var t=n.children;t&&t.length?(n.x=Ci(t),n.y=Ti(t)):(n.x=u?c+=e(n,u):0,n.y=0,u=n)});var l=zi(o),f=Di(o),s=l.x-e(l,f)/2,h=f.x+e(f,l)/2;return vi(o,function(n){n.x=(n.x-s)/(h-s)*r[0],n.y=(1-(o.y?n.y/o.y:1))*r[1]}),a}var t=ua.layout.hierarchy().sort(null).value(null),e=fi,r=[1,1];return n.separation=function(t){return arguments.length?(e=t,n):e},n.size=function(t){return arguments.length?(r=t,n):r},$r(n,t)},ua.layout.treemap=function(){function n(n,t){for(var e,r,i=-1,u=n.length;++i<u;)r=(e=n[i]).value*(0>t?0:t),e.area=isNaN(r)||0>=r?0:r}function t(e){var u=e.children;if(u&&u.length){var a,o,c,l=s(e),f=[],h=u.slice(),p=1/0,d="slice"===g?l.dx:"dice"===g?l.dy:"slice-dice"===g?e.depth&1?l.dy:l.dx:Math.min(l.dx,l.dy);for(n(h,l.dx*l.dy/e.value),f.area=0;(c=h.length)>0;)f.push(a=h[c-1]),f.area+=a.area,"squarify"!==g||(o=r(f,d))<=p?(h.pop(),p=o):(f.area-=f.pop().area,i(f,d,l,!1),d=Math.min(l.dx,l.dy),f.length=f.area=0,p=1/0);f.length&&(i(f,d,l,!0),f.length=f.area=0),u.forEach(t)}}function e(t){var r=t.children;if(r&&r.length){var u,a=s(t),o=r.slice(),c=[];for(n(o,a.dx*a.dy/t.value),c.area=0;u=o.pop();)c.push(u),c.area+=u.area,u.z!=null&&(i(c,u.z?a.dx:a.dy,a,!o.length),c.length=c.area=0);r.forEach(e)}}function r(n,t){for(var e,r=n.area,i=0,u=1/0,a=-1,o=n.length;++a<o;)(e=n[a].area)&&(u>e&&(u=e),e>i&&(i=e));return r*=r,t*=t,r?Math.max(t*i*p/r,r/(t*u*p)):1/0}function i(n,t,e,r){var i,u=-1,a=n.length,o=e.x,l=e.y,f=t?c(n.area/t):0;if(t==e.dx){for((r||f>e.dy)&&(f=e.dy);++u<a;)i=n[u],i.x=o,i.y=l,i.dy=f,o+=i.dx=Math.min(e.x+e.dx-o,f?c(i.area/f):0);i.z=!0,i.dx+=e.x+e.dx-o,e.y+=f,e.dy-=f}else{for((r||f>e.dx)&&(f=e.dx);++u<a;)i=n[u],i.x=o,i.y=l,i.dx=f,l+=i.dy=Math.min(e.y+e.dy-l,f?c(i.area/f):0);i.z=!1,i.dy+=e.y+e.dy-l,e.x+=f,e.dx-=f}}function u(r){var i=a||o(r),u=i[0];return u.x=0,u.y=0,u.dx=l[0],u.dy=l[1],a&&o.revalue(u),n([u],u.dx*u.dy/u.value),(a?e:t)(u),h&&(a=i),i}var a,o=ua.layout.hierarchy(),c=Math.round,l=[1,1],f=null,s=ji,h=!1,g="squarify",p=.5*(1+Math.sqrt(5));return u.size=function(n){return arguments.length?(l=n,u):l},u.padding=function(n){function t(t){var e=n.call(u,t,t.depth);return null==e?ji(t):Li(t,"number"==typeof e?[e,e,e,e]:e)}function e(t){return Li(t,n)}if(!arguments.length)return f;var r;return s=(f=n)==null?ji:(r=typeof n)=="function"?t:"number"===r?(n=[n,n,n,n],e):e,u},u.round=function(n){return arguments.length?(c=n?Math.round:Number,u):c!=Number},u.sticky=function(n){return arguments.length?(h=n,a=null,u):h},u.ratio=function(n){return arguments.length?(p=n,u):p},u.mode=function(n){return arguments.length?(g=n+"",u):g},$r(u,o)},ua.random={normal:function(n,t){var e=arguments.length;return 2>e&&(t=1),1>e&&(n=0),function(){var e,r,i;do e=Math.random()*2-1,r=Math.random()*2-1,i=e*e+r*r;while(!i||i>1);return n+t*e*Math.sqrt(-2*Math.log(i)/i)}},logNormal:function(){var n=ua.random.normal.apply(ua,arguments);return function(){return Math.exp(n())}},irwinHall:function(n){return function(){for(var t=0,e=0;n>e;e++)t+=Math.random();return t/n}}},ua.scale={},ua.scale.linear=function(){return Yi([0,1],[0,1],yr,!1)},ua.scale.log=function(){return Bi(ua.scale.linear().domain([0,Math.LN10]),10,$i,Ji,[1,10])};var Jo=ua.format(".0e");ua.scale.pow=function(){return Wi(ua.scale.linear(),1,[0,1])},ua.scale.sqrt=function(){return ua.scale.pow().exponent(.5)},ua.scale.ordinal=function(){return nu([],{t:"range",a:[[]]})},ua.scale.category10=function(){return ua.scale.ordinal().range(Go)},ua.scale.category20=function(){return ua.scale.ordinal().range(Ko)},ua.scale.category20b=function(){return ua.scale.ordinal().range(Wo)},ua.scale.category20c=function(){return ua.scale.ordinal().range(Qo)};var Go=["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"],Ko=["#1f77b4","#aec7e8","#ff7f0e","#ffbb78","#2ca02c","#98df8a","#d62728","#ff9896","#9467bd","#c5b0d5","#8c564b","#c49c94","#e377c2","#f7b6d2","#7f7f7f","#c7c7c7","#bcbd22","#dbdb8d","#17becf","#9edae5"],Wo=["#393b79","#5254a3","#6b6ecf","#9c9ede","#637939","#8ca252","#b5cf6b","#cedb9c","#8c6d31","#bd9e39","#e7ba52","#e7cb94","#843c39","#ad494a","#d6616b","#e7969c","#7b4173","#a55194","#ce6dbd","#de9ed6"],Qo=["#3182bd","#6baed6","#9ecae1","#c6dbef","#e6550d","#fd8d3c","#fdae6b","#fdd0a2","#31a354","#74c476","#a1d99b","#c7e9c0","#756bb1","#9e9ac8","#bcbddc","#dadaeb","#636363","#969696","#bdbdbd","#d9d9d9"];ua.scale.quantile=function(){return tu([],[])},ua.scale.quantize=function(){return eu(0,1,[0,1])},ua.scale.threshold=function(){return ru([.5],[0,1])},ua.scale.identity=function(){return iu([0,1])},ua.svg.arc=function(){function n(){var n=t.apply(this,arguments),u=e.apply(this,arguments),a=r.apply(this,arguments)+nc,o=i.apply(this,arguments)+nc,c=(a>o&&(c=a,a=o,o=c),o-a),l=Da>c?"0":"1",f=Math.cos(a),s=Math.sin(a),h=Math.cos(o),g=Math.sin(o);return c>=tc?n?"M0,"+u+"A"+u+","+u+" 0 1,1 0,"+-u+"A"+u+","+u+" 0 1,1 0,"+u+"M0,"+n+"A"+n+","+n+" 0 1,0 0,"+-n+"A"+n+","+n+" 0 1,0 0,"+n+"Z":"M0,"+u+"A"+u+","+u+" 0 1,1 0,"+-u+"A"+u+","+u+" 0 1,1 0,"+u+"Z":n?"M"+u*f+","+u*s+"A"+u+","+u+" 0 "+l+",1 "+u*h+","+u*g+"L"+n*h+","+n*g+"A"+n+","+n+" 0 "+l+",0 "+n*f+","+n*s+"Z":"M"+u*f+","+u*s+"A"+u+","+u+" 0 "+l+",1 "+u*h+","+u*g+"L0,0"+"Z"}var t=uu,e=au,r=ou,i=cu;return n.innerRadius=function(e){return arguments.length?(t=lt(e),n):t},n.outerRadius=function(t){return arguments.length?(e=lt(t),n):e},n.startAngle=function(t){return arguments.length?(r=lt(t),n):r},n.endAngle=function(t){return arguments.length?(i=lt(t),n):i},n.centroid=function(){var n=(t.apply(this,arguments)+e.apply(this,arguments))/2,u=(r.apply(this,arguments)+i.apply(this,arguments))/2+nc;return[Math.cos(u)*n,Math.sin(u)*n]},n};var nc=-Da/2,tc=2*Da-1e-6;ua.svg.line.radial=function(){var n=De(lu);return n.radius=n.x,delete n.x,n.angle=n.y,delete n.y,n},Pe.reverse=Re,Re.reverse=Pe,ua.svg.area=function(){return fu(ft)},ua.svg.area.radial=function(){var n=fu(lu);return n.radius=n.x,delete n.x,n.innerRadius=n.x0,delete n.x0,n.outerRadius=n.x1,delete n.x1,n.angle=n.y,delete n.y,n.startAngle=n.y0,delete n.y0,n.endAngle=n.y1,delete n.y1,n},ua.svg.chord=function(){function n(n,o){var c=t(this,u,n,o),l=t(this,a,n,o);return"M"+c.p0+r(c.r,c.p1,c.a1-c.a0)+(e(c,l)?i(c.r,c.p1,c.r,c.p0):i(c.r,c.p1,l.r,l.p0)+r(l.r,l.p1,l.a1-l.a0)+i(l.r,l.p1,c.r,c.p0))+"Z"}function t(n,t,e,r){var i=t.call(n,e,r),u=o.call(n,i,r),a=c.call(n,i,r)+nc,f=l.call(n,i,r)+nc;return{r:u,a0:a,a1:f,p0:[u*Math.cos(a),u*Math.sin(a)],p1:[u*Math.cos(f),u*Math.sin(f)]}}function e(n,t){return n.a0==t.a0&&n.a1==t.a1}function r(n,t,e){return"A"+n+","+n+" 0 "+ +(e>Da)+",1 "+t}function i(n,t,e,r){return"Q 0,0 "+r}var u=se,a=he,o=su,c=ou,l=cu;return n.radius=function(t){return arguments.length?(o=lt(t),n):o},n.source=function(t){return arguments.length?(u=lt(t),n):u},n.target=function(t){return arguments.length?(a=lt(t),n):a},n.startAngle=function(t){return arguments.length?(c=lt(t),n):c},n.endAngle=function(t){return arguments.length?(l=lt(t),n):l},n},ua.svg.diagonal=function(){function n(n,i){var u=t.call(this,n,i),a=e.call(this,n,i),o=(u.y+a.y)/2,c=[u,{x:u.x,y:o},{x:a.x,y:o},a];return c=c.map(r),"M"+c[0]+"C"+c[1]+" "+c[2]+" "+c[3]}var t=se,e=he,r=hu;return n.source=function(e){return arguments.length?(t=lt(e),n):t},n.target=function(t){return arguments.length?(e=lt(t),n):e},n.projection=function(t){return arguments.length?(r=t,n):r},n},ua.svg.diagonal.radial=function(){var n=ua.svg.diagonal(),t=hu,e=n.projection;return n.projection=function(n){return arguments.length?e(gu(t=n)):t},n},ua.svg.symbol=function(){function n(n,r){return(ec.get(t.call(this,n,r))||mu)(e.call(this,n,r))}var t=du,e=pu;return n.type=function(e){return arguments.length?(t=lt(e),n):t},n.size=function(t){return arguments.length?(e=lt(t),n):e},n};var ec=ua.map({circle:mu,cross:function(n){var t=Math.sqrt(n/5)/2;return"M"+-3*t+","+-t+"H"+-t+"V"+-3*t+"H"+t+"V"+-t+"H"+3*t+"V"+t+"H"+t+"V"+3*t+"H"+-t+"V"+t+"H"+-3*t+"Z"},diamond:function(n){var t=Math.sqrt(n/(2*uc)),e=t*uc;return"M0,"+-t+"L"+e+",0"+" 0,"+t+" "+-e+",0"+"Z"},square:function(n){var t=Math.sqrt(n)/2;return"M"+-t+","+-t+"L"+t+","+-t+" "+t+","+t+" "+-t+","+t+"Z"},"triangle-down":function(n){var t=Math.sqrt(n/ic),e=t*ic/2;return"M0,"+e+"L"+t+","+-e+" "+-t+","+-e+"Z"},"triangle-up":function(n){var t=Math.sqrt(n/ic),e=t*ic/2;return"M0,"+-e+"L"+t+","+e+" "+-t+","+e+"Z"}});ua.svg.symbolTypes=ec.keys();var rc,ic=Math.sqrt(3),uc=Math.tan(30*La),ac=[],oc=0,cc={ease:kr,delay:0,duration:250};ac.call=wa.call,ac.empty=wa.empty,ac.node=wa.node,ua.transition=function(n){return arguments.length?rc?n.transition():n:Na.transition()},ua.transition.prototype=ac,ac.select=function(n){var t,e,r,i=this.id,u=[];"function"!=typeof n&&(n=v(n));for(var a=-1,o=this.length;++a<o;){u.push(t=[]);for(var c=this[a],l=-1,f=c.length;++l<f;)(r=c[l])&&(e=n.call(r,r.__data__,l))?("__data__"in r&&(e.__data__=r.__data__),xu(e,l,i,r.__transition__[i]),t.push(e)):t.push(null)}return vu(u,i)},ac.selectAll=function(n){var t,e,r,i,u,a=this.id,o=[];"function"!=typeof n&&(n=y(n));for(var c=-1,l=this.length;++c<l;)for(var f=this[c],s=-1,h=f.length;++s<h;)if(r=f[s]){u=r.__transition__[a],e=n.call(r,r.__data__,s),o.push(t=[]);for(var g=-1,p=e.length;++g<p;)xu(i=e[g],g,a,u),t.push(i)}return vu(o,a)},ac.filter=function(n){var t,e,r,i=[];"function"!=typeof n&&(n=A(n));for(var u=0,a=this.length;a>u;u++){i.push(t=[]);for(var e=this[u],o=0,c=e.length;c>o;o++)(r=e[o])&&n.call(r,r.__data__,o)&&t.push(r)}return vu(i,this.id,this.time).ease(this.ease())},ac.tween=function(n,t){var e=this.id;return arguments.length<2?this.node().__transition__[e].tween.get(n):D(this,null==t?function(t){t.__transition__[e].tween.remove(n)}:function(r){r.__transition__[e].tween.set(n,t)})},ac.attr=function(n,t){function e(){this.removeAttribute(o)}function r(){this.removeAttributeNS(o.space,o.local)}function i(n){return null==n?e:(n+="",function(){var t,e=this.getAttribute(o);return e!==n&&(t=a(e,n),function(n){this.setAttribute(o,t(n))})})}function u(n){return null==n?r:(n+="",function(){var t,e=this.getAttributeNS(o.space,o.local);return e!==n&&(t=a(e,n),function(n){this.setAttributeNS(o.space,o.local,t(n))})})}if(arguments.length<2){for(t in n)this.attr(t,n[t]);return this}var a=Mr(n),o=ua.ns.qualify(n);return yu(this,"attr."+n,t,o.local?u:i)},ac.attrTween=function(n,t){function e(n,e){var r=t.call(this,n,e,this.getAttribute(i));return r&&function(n){this.setAttribute(i,r(n))}}function r(n,e){var r=t.call(this,n,e,this.getAttributeNS(i.space,i.local));return r&&function(n){this.setAttributeNS(i.space,i.local,r(n))}}var i=ua.ns.qualify(n);return this.tween("attr."+n,i.local?r:e)},ac.style=function(n,t,e){function r(){this.style.removeProperty(n)}function i(t){return null==t?r:(t+="",function(){var r,i=oa.getComputedStyle(this,null).getPropertyValue(n);return i!==t&&(r=a(i,t),function(t){this.style.setProperty(n,r(t),e)})})}var u=arguments.length;if(3>u){if("string"!=typeof n){2>u&&(t="");for(e in n)this.style(e,n[e],t);return this}e=""}var a=Mr(n);return yu(this,"style."+n,t,i)},ac.styleTween=function(n,t,e){function r(r,i){var u=t.call(this,r,i,oa.getComputedStyle(this,null).getPropertyValue(n));return u&&function(t){this.style.setProperty(n,u(t),e)}}return arguments.length<3&&(e=""),this.tween("style."+n,r)},ac.text=function(n){return yu(this,"text",n,Mu)},ac.remove=function(){return this.each("end.transition",function(){var n;!this.__transition__&&(n=this.parentNode)&&n.removeChild(this)})},ac.ease=function(n){var t=this.id;return arguments.length<1?this.node().__transition__[t].ease:("function"!=typeof n&&(n=ua.ease.apply(ua,arguments)),D(this,function(e){e.__transition__[t].ease=n}))},ac.delay=function(n){var t=this.id;return D(this,"function"==typeof n?function(e,r,i){e.__transition__[t].delay=n.call(e,e.__data__,r,i)|0}:(n|=0,function(e){e.__transition__[t].delay=n}))},ac.duration=function(n){var t=this.id;return D(this,"function"==typeof n?function(e,r,i){e.__transition__[t].duration=Math.max(1,n.call(e,e.__data__,r,i)|0)}:(n=Math.max(1,0|n),function(e){e.__transition__[t].duration=n}))},ac.each=function(n,t){var e=this.id;if(arguments.length<2){var r=cc,i=rc;rc=e,D(this,function(t,r,i){cc=t.__transition__[e],n.call(t,t.__data__,r,i)}),cc=r,rc=i}else D(this,function(r){r.__transition__[e].event.on(n,t)});return this},ac.transition=function(){for(var n,t,e,r,i=this.id,u=++oc,a=[],o=0,c=this.length;c>o;o++){a.push(n=[]);for(var t=this[o],l=0,f=t.length;f>l;l++)(e=t[l])&&(r=Object.create(e.__transition__[i]),r.delay+=r.duration,xu(e,l,u,r)),n.push(e)}return vu(a,u)},ua.svg.axis=function(){function n(n){n.each(function(){var n,s=ua.select(this),h=null==l?e.ticks?e.ticks.apply(e,c):e.domain():l,g=null==t?e.tickFormat?e.tickFormat.apply(e,c):String:t,p=wu(e,h,f),d=s.selectAll(".tick.minor").data(p,String),m=d.enter().insert("line",".tick").attr("class","tick minor").style("opacity",1e-6),v=ua.transition(d.exit()).style("opacity",1e-6).remove(),y=ua.transition(d).style("opacity",1),M=s.selectAll(".tick.major").data(h,String),x=M.enter().insert("g","path").attr("class","tick major").style("opacity",1e-6),b=ua.transition(M.exit()).style("opacity",1e-6).remove(),_=ua.transition(M).style("opacity",1),w=Hi(e),S=s.selectAll(".domain").data([0]),E=(S.enter().append("path").attr("class","domain"),ua.transition(S)),k=e.copy(),A=this.__chart__||k;this.__chart__=k,x.append("line"),x.append("text");var N=x.select("line"),q=_.select("line"),T=M.select("text").text(g),C=x.select("text"),z=_.select("text");switch(r){case"bottom":n=bu,m.attr("y2",u),y.attr("x2",0).attr("y2",u),N.attr("y2",i),C.attr("y",Math.max(i,0)+o),q.attr("x2",0).attr("y2",i),z.attr("x",0).attr("y",Math.max(i,0)+o),T.attr("dy",".71em").style("text-anchor","middle"),E.attr("d","M"+w[0]+","+a+"V0H"+w[1]+"V"+a);break;case"top":n=bu,m.attr("y2",-u),y.attr("x2",0).attr("y2",-u),N.attr("y2",-i),C.attr("y",-(Math.max(i,0)+o)),q.attr("x2",0).attr("y2",-i),z.attr("x",0).attr("y",-(Math.max(i,0)+o)),T.attr("dy","0em").style("text-anchor","middle"),E.attr("d","M"+w[0]+","+-a+"V0H"+w[1]+"V"+-a);break;case"left":n=_u,m.attr("x2",-u),y.attr("x2",-u).attr("y2",0),N.attr("x2",-i),C.attr("x",-(Math.max(i,0)+o)),q.attr("x2",-i).attr("y2",0),z.attr("x",-(Math.max(i,0)+o)).attr("y",0),T.attr("dy",".32em").style("text-anchor","end"),E.attr("d","M"+-a+","+w[0]+"H0V"+w[1]+"H"+-a);break;case"right":n=_u,m.attr("x2",u),y.attr("x2",u).attr("y2",0),N.attr("x2",i),C.attr("x",Math.max(i,0)+o),q.attr("x2",i).attr("y2",0),z.attr("x",Math.max(i,0)+o).attr("y",0),T.attr("dy",".32em").style("text-anchor","start"),E.attr("d","M"+a+","+w[0]+"H0V"+w[1]+"H"+a)}if(e.ticks)x.call(n,A),_.call(n,k),b.call(n,k),m.call(n,A),y.call(n,k),v.call(n,k);else{var D=k.rangeBand()/2,j=function(n){return k(n)+D};x.call(n,j),_.call(n,j)}})}var t,e=ua.scale.linear(),r=lc,i=6,u=6,a=6,o=3,c=[10],l=null,f=0;return n.scale=function(t){return arguments.length?(e=t,n):e},n.orient=function(t){return arguments.length?(r=t in fc?t+"":lc,n):r},n.ticks=function(){return arguments.length?(c=arguments,n):c},n.tickValues=function(t){return arguments.length?(l=t,n):l},n.tickFormat=function(e){return arguments.length?(t=e,n):t},n.tickSize=function(t,e){if(!arguments.length)return i;var r=arguments.length-1;return i=+t,u=r>1?+e:i,a=r>0?+arguments[r]:i,n},n.tickPadding=function(t){return arguments.length?(o=+t,n):o},n.tickSubdivide=function(t){return arguments.length?(f=+t,n):f},n};var lc="bottom",fc={top:1,right:1,bottom:1,left:1};ua.svg.brush=function(){function n(u){u.each(function(){var u,a=ua.select(this),l=a.selectAll(".background").data([0]),s=a.selectAll(".extent").data([0]),h=a.selectAll(".resize").data(f,String);a.style("pointer-events","all").on("mousedown.brush",i).on("touchstart.brush",i),l.enter().append("rect").attr("class","background").style("visibility","hidden").style("cursor","crosshair"),s.enter().append("rect").attr("class","extent").style("cursor","move"),h.enter().append("g").attr("class",function(n){return"resize "+n}).style("cursor",function(n){return sc[n]}).append("rect").attr("x",function(n){return/[ew]$/.test(n)?-3:null}).attr("y",function(n){return/^[ns]/.test(n)?-3:null}).attr("width",6).attr("height",6).style("visibility","hidden"),h.style("display",n.empty()?"none":null),h.exit().remove(),o&&(u=Hi(o),l.attr("x",u[0]).attr("width",u[1]-u[0]),e(a)),c&&(u=Hi(c),l.attr("y",u[0]).attr("height",u[1]-u[0]),r(a)),t(a)})}function t(n){n.selectAll(".resize").attr("transform",function(n){return"translate("+s[+/e$/.test(n)][0]+","+s[+/^s/.test(n)][1]+")"})}function e(n){n.select(".extent").attr("x",s[0][0]),n.selectAll(".extent,.n>rect,.s>rect").attr("width",s[1][0]-s[0][0])}function r(n){n.select(".extent").attr("y",s[0][1]),n.selectAll(".extent,.e>rect,.w>rect").attr("height",s[1][1]-s[0][1])}function i(){function i(){var n=ua.event.changedTouches;
return n?ua.touches(y,n)[0]:ua.mouse(y)}function f(){ua.event.keyCode==32&&(E||(m=null,k[0]-=s[1][0],k[1]-=s[1][1],E=2),l())}function h(){ua.event.keyCode==32&&2==E&&(k[0]+=s[1][0],k[1]+=s[1][1],E=0,l())}function g(){var n=i(),u=!1;v&&(n[0]+=v[0],n[1]+=v[1]),E||(ua.event.altKey?(m||(m=[(s[0][0]+s[1][0])/2,(s[0][1]+s[1][1])/2]),k[0]=s[+(n[0]<m[0])][0],k[1]=s[+(n[1]<m[1])][1]):m=null),w&&p(n,o,0)&&(e(b),u=!0),S&&p(n,c,1)&&(r(b),u=!0),u&&(t(b),x({type:"brush",mode:E?"move":"resize"}))}function p(n,t,e){var r,i,a=Hi(t),o=a[0],c=a[1],l=k[e],f=s[1][e]-s[0][e];return E&&(o-=l,c-=f+l),r=Math.max(o,Math.min(c,n[e])),E?i=(r+=l)+f:(m&&(l=Math.max(o,Math.min(c,2*m[e]-r))),r>l?(i=r,r=l):i=l),s[0][e]!==r||s[1][e]!==i?(u=null,s[0][e]=r,s[1][e]=i,!0):void 0}function d(){g(),b.style("pointer-events","all").selectAll(".resize").style("display",n.empty()?"none":null),ua.select("body").style("cursor",null),A.on("mousemove.brush",null).on("mouseup.brush",null).on("touchmove.brush",null).on("touchend.brush",null).on("keydown.brush",null).on("keyup.brush",null),x({type:"brushend"}),l()}var m,v,y=this,M=ua.select(ua.event.target),x=a.of(y,arguments),b=ua.select(y),_=M.datum(),w=!/^(n|s)$/.test(_)&&o,S=!/^(e|w)$/.test(_)&&c,E=M.classed("extent"),k=i(),A=ua.select(oa).on("mousemove.brush",g).on("mouseup.brush",d).on("touchmove.brush",g).on("touchend.brush",d).on("keydown.brush",f).on("keyup.brush",h);if(E)k[0]=s[0][0]-k[0],k[1]=s[0][1]-k[1];else if(_){var N=+/w$/.test(_),q=+/^n/.test(_);v=[s[1-N][0]-k[0],s[1-q][1]-k[1]],k[0]=s[N][0],k[1]=s[q][1]}else ua.event.altKey&&(m=k.slice());b.style("pointer-events","none").selectAll(".resize").style("display",null),ua.select("body").style("cursor",M.style("cursor")),x({type:"brushstart"}),g(),l()}var u,a=h(n,"brushstart","brush","brushend"),o=null,c=null,f=hc[0],s=[[0,0],[0,0]];return n.x=function(t){return arguments.length?(o=t,f=hc[!o<<1|!c],n):o},n.y=function(t){return arguments.length?(c=t,f=hc[!o<<1|!c],n):c},n.extent=function(t){var e,r,i,a,l;return arguments.length?(u=[[0,0],[0,0]],o&&(e=t[0],r=t[1],c&&(e=e[0],r=r[0]),u[0][0]=e,u[1][0]=r,o.invert&&(e=o(e),r=o(r)),e>r&&(l=e,e=r,r=l),s[0][0]=0|e,s[1][0]=0|r),c&&(i=t[0],a=t[1],o&&(i=i[1],a=a[1]),u[0][1]=i,u[1][1]=a,c.invert&&(i=c(i),a=c(a)),i>a&&(l=i,i=a,a=l),s[0][1]=0|i,s[1][1]=0|a),n):(t=u||s,o&&(e=t[0][0],r=t[1][0],u||(e=s[0][0],r=s[1][0],o.invert&&(e=o.invert(e),r=o.invert(r)),e>r&&(l=e,e=r,r=l))),c&&(i=t[0][1],a=t[1][1],u||(i=s[0][1],a=s[1][1],c.invert&&(i=c.invert(i),a=c.invert(a)),i>a&&(l=i,i=a,a=l))),o&&c?[[e,i],[r,a]]:o?[e,r]:c&&[i,a])},n.clear=function(){return u=null,s[0][0]=s[0][1]=s[1][0]=s[1][1]=0,n},n.empty=function(){return o&&s[0][0]===s[1][0]||c&&s[0][1]===s[1][1]},ua.rebind(n,a,"on")};var sc={n:"ns-resize",e:"ew-resize",s:"ns-resize",w:"ew-resize",nw:"nwse-resize",ne:"nesw-resize",se:"nwse-resize",sw:"nesw-resize"},hc=[["n","e","s","w","nw","ne","se","sw"],["e","w"],["n","s"],[]];ua.time={};var gc=Date,pc=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];Su.prototype={getDate:function(){return this._.getUTCDate()},getDay:function(){return this._.getUTCDay()},getFullYear:function(){return this._.getUTCFullYear()},getHours:function(){return this._.getUTCHours()},getMilliseconds:function(){return this._.getUTCMilliseconds()},getMinutes:function(){return this._.getUTCMinutes()},getMonth:function(){return this._.getUTCMonth()},getSeconds:function(){return this._.getUTCSeconds()},getTime:function(){return this._.getTime()},getTimezoneOffset:function(){return 0},valueOf:function(){return this._.valueOf()},setDate:function(){dc.setUTCDate.apply(this._,arguments)},setDay:function(){dc.setUTCDay.apply(this._,arguments)},setFullYear:function(){dc.setUTCFullYear.apply(this._,arguments)},setHours:function(){dc.setUTCHours.apply(this._,arguments)},setMilliseconds:function(){dc.setUTCMilliseconds.apply(this._,arguments)},setMinutes:function(){dc.setUTCMinutes.apply(this._,arguments)},setMonth:function(){dc.setUTCMonth.apply(this._,arguments)},setSeconds:function(){dc.setUTCSeconds.apply(this._,arguments)},setTime:function(){dc.setTime.apply(this._,arguments)}};var dc=Date.prototype,mc="%a %b %e %X %Y",vc="%m/%d/%Y",yc="%H:%M:%S",Mc=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],xc=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],bc=["January","February","March","April","May","June","July","August","September","October","November","December"],_c=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];ua.time.year=Eu(function(n){return n=ua.time.day(n),n.setMonth(0,1),n},function(n,t){n.setFullYear(n.getFullYear()+t)},function(n){return n.getFullYear()}),ua.time.years=ua.time.year.range,ua.time.years.utc=ua.time.year.utc.range,ua.time.day=Eu(function(n){var t=new gc(1970,0);return t.setFullYear(n.getFullYear(),n.getMonth(),n.getDate()),t},function(n,t){n.setDate(n.getDate()+t)},function(n){return n.getDate()-1}),ua.time.days=ua.time.day.range,ua.time.days.utc=ua.time.day.utc.range,ua.time.dayOfYear=function(n){var t=ua.time.year(n);return Math.floor((n-t-(n.getTimezoneOffset()-t.getTimezoneOffset())*6e4)/864e5)},pc.forEach(function(n,t){n=n.toLowerCase(),t=7-t;var e=ua.time[n]=Eu(function(n){return(n=ua.time.day(n)).setDate(n.getDate()-(n.getDay()+t)%7),n},function(n,t){n.setDate(n.getDate()+Math.floor(t)*7)},function(n){var e=ua.time.year(n).getDay();return Math.floor((ua.time.dayOfYear(n)+(e+t)%7)/7)-(e!==t)});ua.time[n+"s"]=e.range,ua.time[n+"s"].utc=e.utc.range,ua.time[n+"OfYear"]=function(n){var e=ua.time.year(n).getDay();return Math.floor((ua.time.dayOfYear(n)+(e+t)%7)/7)}}),ua.time.week=ua.time.sunday,ua.time.weeks=ua.time.sunday.range,ua.time.weeks.utc=ua.time.sunday.utc.range,ua.time.weekOfYear=ua.time.sundayOfYear,ua.time.format=function(n){function t(t){for(var r,i,u,a=[],o=-1,c=0;++o<e;)n.charCodeAt(o)===37&&(a.push(n.substring(c,o)),(i=qc[r=n.charAt(++o)])!=null&&(r=n.charAt(++o)),(u=Tc[r])&&(r=u(t,null==i?"e"===r?" ":"0":i)),a.push(r),c=o+1);return a.push(n.substring(c,o)),a.join("")}var e=n.length;return t.parse=function(t){var e={y:1900,m:0,d:1,H:0,M:0,S:0,L:0},r=Au(e,n,t,0);if(r!=t.length)return null;"p"in e&&(e.H=e.H%12+e.p*12);var i=new gc;return i.setFullYear(e.y,e.m,e.d),i.setHours(e.H,e.M,e.S,e.L),i},t.toString=function(){return n},t};var wc=Nu(Mc),Sc=Nu(xc),Ec=Nu(bc),kc=qu(bc),Ac=Nu(_c),Nc=qu(_c),qc={"-":"",_:" ",0:"0"},Tc={a:function(n){return xc[n.getDay()]},A:function(n){return Mc[n.getDay()]},b:function(n){return _c[n.getMonth()]},B:function(n){return bc[n.getMonth()]},c:ua.time.format(mc),d:function(n,t){return Tu(n.getDate(),t,2)},e:function(n,t){return Tu(n.getDate(),t,2)},H:function(n,t){return Tu(n.getHours(),t,2)},I:function(n,t){return Tu(n.getHours()%12||12,t,2)},j:function(n,t){return Tu(1+ua.time.dayOfYear(n),t,3)},L:function(n,t){return Tu(n.getMilliseconds(),t,3)},m:function(n,t){return Tu(n.getMonth()+1,t,2)},M:function(n,t){return Tu(n.getMinutes(),t,2)},p:function(n){return n.getHours()>=12?"PM":"AM"},S:function(n,t){return Tu(n.getSeconds(),t,2)},U:function(n,t){return Tu(ua.time.sundayOfYear(n),t,2)},w:function(n){return n.getDay()},W:function(n,t){return Tu(ua.time.mondayOfYear(n),t,2)},x:ua.time.format(vc),X:ua.time.format(yc),y:function(n,t){return Tu(n.getFullYear()%100,t,2)},Y:function(n,t){return Tu(n.getFullYear()%1e4,t,4)},Z:$u,"%":function(){return"%"}},Cc={a:Cu,A:zu,b:Du,B:ju,c:Lu,d:Uu,e:Uu,H:Iu,I:Iu,L:Zu,m:Yu,M:Vu,p:Bu,S:Xu,x:Fu,X:Hu,y:Ru,Y:Pu},zc=/^\s*\d+/,Dc=ua.map({am:0,pm:1});ua.time.format.utc=function(n){function t(n){try{gc=Su;var t=new gc;return t._=n,e(t)}finally{gc=Date}}var e=ua.time.format(n);return t.parse=function(n){try{gc=Su;var t=e.parse(n);return t&&t._}finally{gc=Date}},t.toString=e.toString,t};var jc=ua.time.format.utc("%Y-%m-%dT%H:%M:%S.%LZ");ua.time.format.iso=Date.prototype.toISOString&&+new Date("2000-01-01T00:00:00.000Z")?Ju:jc,Ju.parse=function(n){var t=new Date(n);return isNaN(t)?null:t},Ju.toString=jc.toString,ua.time.second=Eu(function(n){return new gc(Math.floor(n/1e3)*1e3)},function(n,t){n.setTime(n.getTime()+Math.floor(t)*1e3)},function(n){return n.getSeconds()}),ua.time.seconds=ua.time.second.range,ua.time.seconds.utc=ua.time.second.utc.range,ua.time.minute=Eu(function(n){return new gc(Math.floor(n/6e4)*6e4)},function(n,t){n.setTime(n.getTime()+Math.floor(t)*6e4)},function(n){return n.getMinutes()}),ua.time.minutes=ua.time.minute.range,ua.time.minutes.utc=ua.time.minute.utc.range,ua.time.hour=Eu(function(n){var t=n.getTimezoneOffset()/60;return new gc((Math.floor(n/36e5-t)+t)*36e5)},function(n,t){n.setTime(n.getTime()+Math.floor(t)*36e5)},function(n){return n.getHours()}),ua.time.hours=ua.time.hour.range,ua.time.hours.utc=ua.time.hour.utc.range,ua.time.month=Eu(function(n){return n=ua.time.day(n),n.setDate(1),n},function(n,t){n.setMonth(n.getMonth()+t)},function(n){return n.getMonth()}),ua.time.months=ua.time.month.range,ua.time.months.utc=ua.time.month.utc.range;var Lc=[1e3,5e3,15e3,3e4,6e4,3e5,9e5,18e5,36e5,108e5,216e5,432e5,864e5,1728e5,6048e5,2592e6,7776e6,31536e6],Fc=[[ua.time.second,1],[ua.time.second,5],[ua.time.second,15],[ua.time.second,30],[ua.time.minute,1],[ua.time.minute,5],[ua.time.minute,15],[ua.time.minute,30],[ua.time.hour,1],[ua.time.hour,3],[ua.time.hour,6],[ua.time.hour,12],[ua.time.day,1],[ua.time.day,2],[ua.time.week,1],[ua.time.month,1],[ua.time.month,3],[ua.time.year,1]],Hc=[[ua.time.format("%Y"),Ht],[ua.time.format("%B"),function(n){return n.getMonth()}],[ua.time.format("%b %d"),function(n){return n.getDate()!=1}],[ua.time.format("%a %d"),function(n){return n.getDay()&&n.getDate()!=1}],[ua.time.format("%I %p"),function(n){return n.getHours()}],[ua.time.format("%I:%M"),function(n){return n.getMinutes()}],[ua.time.format(":%S"),function(n){return n.getSeconds()}],[ua.time.format(".%L"),function(n){return n.getMilliseconds()}]],Pc=ua.scale.linear(),Rc=Wu(Hc);Fc.year=function(n,t){return Pc.domain(n.map(na)).ticks(t).map(Qu)},ua.time.scale=function(){return Gu(ua.scale.linear(),Fc,Rc)};var Oc=Fc.map(function(n){return[n[0].utc,n[1]]}),Yc=[[ua.time.format.utc("%Y"),Ht],[ua.time.format.utc("%B"),function(n){return n.getUTCMonth()}],[ua.time.format.utc("%b %d"),function(n){return n.getUTCDate()!=1}],[ua.time.format.utc("%a %d"),function(n){return n.getUTCDay()&&n.getUTCDate()!=1}],[ua.time.format.utc("%I %p"),function(n){return n.getUTCHours()}],[ua.time.format.utc("%I:%M"),function(n){return n.getUTCMinutes()}],[ua.time.format.utc(":%S"),function(n){return n.getUTCSeconds()}],[ua.time.format.utc(".%L"),function(n){return n.getUTCMilliseconds()}]],Uc=Wu(Yc);return Oc.year=function(n,t){return Pc.domain(n.map(ea)).ticks(t).map(ta)},ua.time.scale.utc=function(){return Gu(ua.scale.linear(),Oc,Uc)},ua.text=st(function(n){return n.responseText}),ua.json=function(n,t){return ht(n,"application/json",ra,t)},ua.html=function(n,t){return ht(n,"text/html",ia,t)},ua.xml=st(function(n){return n.responseXML}),ua}();
define("d3", function(){});

define('views/scoreVsGraph',["d3"],function(ddd){
    var ScoreVsGraphView = Backbone.View.extend({
        //template: Handlebars.compile(template),
        events:{
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            //this.model.on('destroy',this.remove, this);
        //    this.render();
        },
        changeModel:function(newModel){
            this.model.off('change',this.render);
            this.model = newModel;
            this.model.on('change',this.render, this);
        },
        plotFunction: function(data){
            var sumX=0;
            var sumY=0;
            var sumXSquares=0;
            var sumXYProducts=0;
            var cnt=0;
            for(var i=0;i<data.length;i++){
                var item = data[i];
                cnt += item.cnt;
                sumX += item.x * item.cnt;
                sumY += item.y * item.cnt;
                sumXSquares += item.x * item.x * item.cnt;
                sumXYProducts += item.x*item.y * item.cnt;
            }
            var meanY = sumY / cnt;
            var meanX = sumX / cnt;
            var b =  (sumXYProducts - (sumX * sumY) / cnt) / (sumXSquares - (sumX * sumX)/ cnt);
            var a = meanY - b * meanX;
            return function(x){
                return a + b * x;
            };
        },
        render: function(){
            var margin = {top:20,bottom:30,left:40,right:15};
            var fullWidth = 400;
            var fullHeight = 300;
            var width = fullWidth - margin.left - margin.right;
            var height = fullHeight - margin.top - margin.bottom;
            var data = this.model.toJSON().data;
            var xMax = d3.max(data,function(d){return d.x;});
            var xMin = d3.min(data,function(d){return d.x;});
            var yMax = d3.max(data,function(d){return d.y;});
            var yMin = d3.min(data,function(d){return d.y;});
            
            console.log("xMax",xMax);
            console.log("xMin",xMin);
            console.log("yMax",yMax);
            console.log("yMin",yMin);
            var x = d3.scale.linear()
                .domain([xMin-1,xMax+1])
                .range([0,width]);
            var y = d3.scale.linear()
                .domain([yMin,yMax])
                .range([height, 0]);
                
            console.log("x(10)",x(10));
            if(!this.graph){
                this.graph = d3.select(this.el).append("svg:svg")
                .attr("width", fullWidth)
                .attr("height", fullHeight)
                .attr("class",'graph')
                ;
                this.main = this.graph.append('g')
                .attr('transform','translate(' +margin.left + ',' + margin.top + ')')
                .attr('width',width)
                .attr('height',height)
                .attr('class','main');
                // draw the x axis
                this.xAxis = d3.svg.axis().scale(x).orient('bottom');
                this.xAxisHolder = this.main.append('g')
                    .attr('transform', 'translate(0,' + height + ')')
                    .attr('class', 'x axis');
                // draw the y axis
                this.yAxis = d3.svg.axis().scale(y).orient('left')//.ticks(yMax-yMin+1);
                this.yAxisHolder = this.main.append('g').attr('transform', 'translate(0,0)').attr('class', 'y axis');
                this.circles = this.main.append("svg:g"); 

                // draw the x axis
                this.xAxis = d3.svg.axis().scale(x).orient('bottom');
                this.xAxisHolder = this.main.append('g')
                    .attr('transform', 'translate(0,' + height + ')')
                    .attr('class', 'x axis');
                // draw the y axis
                this.yAxis = d3.svg.axis().scale(y).orient('left')//.ticks(yMax-yMin+1);
                this.yAxisHolder = this.main.append('g').attr('transform', 'translate(0,0)').attr('class', 'y axis');
                this.circles = this.main.append("svg:g"); 
            }
            this.xAxis.scale(x);
            this.xAxisHolder 
                .transition()
                .duration(1000)
                .ease("linear").call(this.xAxis);
            this.yAxis.scale(y);
            this.yAxisHolder
                .transition()
                .duration(1000)
                .ease("linear")
                .call(this.yAxis);
               // draw the graph object
            var self = this;
            this.circles.selectAll("circle").remove();
            var rrr = this.circles.selectAll("circle")
            .data(data)  // using the values in the ydata array
            ;
            
            rrr.enter().append("svg:circle")  // create a new circle for each value
            .attr("cy", function (d) { return y(d.y); } ) // translate y value to a pixel
            .attr("cx", function (d,i) { return x(d.x); } ) // translate x value
            .attr("title", function(d) {return "h ha ha" + d.y;})
            .attr("r", function(d) {
                return 1.25 + (d.cnt)*0.75;
            })// radius of circle
            .attr('class','tooltipCircle')
            ;
          /*  rrr.transition()
            .duration(1000)
            .attrTween('cx', function(a) {
               var i = d3.interpolate(this._previous, a.x);
                this._previous = i(0);
                return function(t) {
                    return x(i(t));
                };
            })
            .attrTween('cy', function(a) {
                var i = d3.interpolate(this._previous, a.y);
                this._previous = i(0);
                return function(t) {
                    return y(i(t));
                };
            });
            rrr.exit().remove();
            */
            var yAvg = (yMax + yMin) / 2;
           // $("body").tooltip({ selector: ".tooltipCircle" });
     // .style("opacity", 0.6); // opacity of circle
            var plot = self.plotFunction(data);
            if(this.myLine){
                this.myLine.remove();
            }
            this.myLine = this.main.append("svg:line")
                .attr("x1", x(xMin-1))
                .attr("y1", y(plot(xMin-1)))
                .attr("x2", x(xMax+1))
                .attr("y2", y(plot(xMax+1)))
                .style("stroke", "rgb(6,120,155)");
            return this;
      }
    });
    
    return ScoreVsGraphView;
});
define('models/scoreVs',[],function(){
    var ScoreVs = Backbone.Model.extend({
        url:'stats/scoreVs/??',
        initialize:function(){   
        },
        
        sync : function(method, model,options){
          options = options || {};
          options.url = "/stats/scoresVs/" + this.get('stat');
          console.log('syncing', this.get('stat'));
          Backbone.sync(method,model,options);
        }
    });
    return ScoreVs;
});
define('models/GIRvsFairwayPercent',[],function(){
    var GIRvsFairwayPercent = Backbone.Model.extend({
        url:'stats/girVsFw',
        initialize:function(){   
        }
    });
    return GIRvsFairwayPercent;
});
define('models/HoleVsPar',[],function(){
    var HoleVsPar = Backbone.Model.extend({
        url:'stats/holeVsPar',
        initialize:function(){   
        }
    });
    return HoleVsPar;
});
define('views/graphLayer',["views/scoreVsGraph","models/scoreVs","models/GIRvsFairwayPercent","models/HoleVsPar"],function(ScoreVsGraph,ScoreVsModel,GIRvsFairwayPercent,HoleVsPar){
    var GraphLayer = Backbone.View.extend({
        el: '#graphLayer',
        tagName:'div',
        events:{
            "click a.scoreVsGIR":"scoreVsGIR",
            "click a.scoreVsPutts":"scoreVsPutts",
            "click a.scoreVsFairways":"scoreVsFairways",
            "click a.scoreVsPlayable":"scoreVsPlayable",
            "click a.scoreVsDrPenPoints":"scoreVsDrPenPoints",
            "click a.scoreVsScramble":"scoreVsScramble",
            "click a.girVsFw":"girVsFw",
            "click a.holeVsPar":"holeVsPar"
        },
        hide:function(){
            $(this.el).hide();
        },
        show:function(){
            var self = this;
          $(self.el).show();
        },
        collections:[],
        views:[],
        initialize: function(){
             //this.collection.on('add', this.render, this);
         //   this.collections.courses = new CourseList();
           // this.views.courses = new CourseListView({collection:this.collections.courses});
        },
        render:function(){  
            return this;
        },
        scoreVsPlayable:function(e){
            e.preventDefault();
            this.createOrUpdate('playablePercent');
        },
        scoreVsDrPenPoints:function(e){
            e.preventDefault();
            this.createOrUpdate('drivePoints');
        },
        scoreVsScramble:function(e){
            e.preventDefault();
            this.createOrUpdate('scramblePercent');
        },
        scoreVsGIR:function(e){
            e.preventDefault();
            this.createOrUpdate('GIR');
        },
        scoreVsPutts:function(e){
            e.preventDefault();
            this.createOrUpdate('putts');
        },
        scoreVsFairways:function(e){
            e.preventDefault();
            this.createOrUpdate('fairwayPercent');
        },
        createOrUpdate : function(stat){
            this.$el.find("#graphTitle").html("Score vs " + stat);
            if(!this.model){
                this.model = new ScoreVsModel({stat:stat});
            }else{                
                this.model.set({stat:stat});
            }
            if(!this.graph){
                this.graph = new ScoreVsGraph({el:"#graphHolder",model:this.model});    
            }else{
                this.graph.changeModel(this.model);
            }
            var self = this;
            this.model.fetch({success:function(){
                self.graph.render();
            }});
        },
        girVsFw : function(e){
            e.preventDefault();
            this.$el.find("#graphTitle").html("GIR vs Fairway %");
            
            if(!this.model2){
                this.model2 = new GIRvsFairwayPercent();
            }
            
            if(!this.graph){
                this.graph = new ScoreVsGraph({el:"#graphHolder",model:this.model2});    
            }else{
                this.graph.changeModel(this.model2);
            }
            
            
              var self = this;
            this.model2.fetch({success:function(){
                self.graph.render();
            }});
        },
        holeVsPar : function(e){
            e.preventDefault();
            this.$el.find("#graphTitle").html("Hole vs Par");
            
            if(!this.model2){
                this.model2 = new HoleVsPar();
            }
            
            if(!this.graph){
                this.graph = new ScoreVsGraph({el:"#graphHolder",model:this.model2});    
            }else{
                this.graph.changeModel(this.model2);
            }
            
            
            var self = this;
            this.model2.fetch({success:function(){
                self.graph.render();
            }});
        }
    });
    return GraphLayer;
});
define('text!templates/scoreTable.html',[],function () { return '\r\n<h2>Recent Scores\r\n   <!-- <button class="btn btn-mini" type="button" data-toggle="modal" data-target="#bookModal"><span class="icon-plus-sign"></span></button> -->\r\n   <a href="/score/add"><button class="btn btn-mini" type="button"><span class="icon-plus-sign"></span></button></a>\r\n   <button class="btn btn-mini last20" type="button">Last 20</button>\r\n   <button class="btn btn-mini last5" type="button">Last 5</button>\r\n   <button class="btn btn-mini y2013 " type="button">2013</button>\r\n   <button class="btn btn-mini y2012" type="button">2012</button>\r\n   <button class="btn btn-mini all" type="button">all</button>\r\n</h2>\r\n<table cellpadding="0" cellspacing="0" class="table table-bordered table-striped table-hover scores">\r\n            <thead>\r\n    <tr>\r\n        <th rowspan="2">Date</th>\r\n        <th rowspan="2">Course</th>\r\n        <th rowspan="2">Score</th>\r\n        <th rowspan="2">Handicap</th>\r\n        <th rowspan="2">GIR</th>\r\n        <th colspan="3">Putts</th>\r\n        <th  class="shortGame" colspan="2">Avg Putts</th>\r\n        <th class="shortGame" colspan="3">Chips</th>\r\n        <th class="shortGame" colspan="2">Scramble</th>\r\n        <th class="shortGame" colspan="2">Short Game</th>\r\n        \r\n        <th rowspan="2">Ch 15</th>\r\n        \r\n        \r\n        <th colspan="2" class="driving">Fairways</th>\r\n        <th rowspan="2" class="driving" title="Driver Penalty Points">Dr Pen Pts</th>\r\n        <th colspan="2" class="driving">Playable</th>\r\n        <th class="scoreRow" rowspan="2" title="Penalties">Pens</th>\r\n        <th class="scoreRow" rowspan="2" title="Extras">EX</th>\r\n        <th class="scoreRow" rowspan="2" title="Eagles">-2</th>\r\n        <th class="scoreRow" rowspan="2" title="Birdies">-1</th>\r\n        <th class="scoreRow" rowspan="2" title="Pars">0</th>\r\n        <th class="scoreRow" rowspan="2" title="Bogies">+1</th>\r\n        <th class="scoreRow" rowspan="2" title="Doubles">+2</th>\r\n        <th class="scoreRow" rowspan="2" title="Others">+3</th>\r\n        \r\n    </tr>\r\n    <tr>\r\n        <th>#</th><!--putts -->\r\n        <th>1</th><!--putts -->\r\n        <th>3</th><!--putts -->\r\n        <th class="shortGame">w/ Chip</th><!--avgputts -->\r\n        <th class="shortGame">w/o Chip</th><!--avgputts -->\r\n        <th class="shortGame">In</th><!--chips -->\r\n        <th class="shortGame">#</th><!--chips -->\r\n        <th class="shortGame" title="More then one chip on a hole">EX</th><!--chips -->\r\n        <th class="shortGame">#</th><!--scramble -->\r\n        <th class="shortGame">%</th><!--scramble -->\r\n        \r\n        <th class="shortGame">#</th><!--shortgame -->\r\n        <th class="shortGame">%</th><!--shortgame -->\r\n\r\n        <th class="driving">#</th><!--fairways -->\r\n        <th class="driving">%</th><!--fairways -->\r\n        <th class="driving">#</th><!--playable -->\r\n        <th class="driving">%</td><!--playable -->\r\n        \r\n    </tr>\r\n\t</thead>\r\n        <tbody id="recentTable">\r\n        </tbody>\r\n    </table>';});

define('text!templates/table.html',[],function () { return '<td class="text"><a href="" id="{{_id}}" class="scorelink">{{prettyDate}}</a></td>\r\n<td class="text courseName" title="{{course.name}} - {{tee.name}}"><a href="" id="{{_id}}" class="scorelink">{{{shortName}}}</a></td>\r\n<td>{{score}}</td>\r\n<td>{{stats.handicap}}</td>\r\n<td>{{stats.GIR}}</td>\r\n<td>{{stats.putts}}</td><td>{{stats.onePutts}}</td><td>{{stats.threePutts}}</td>\r\n<td class="shortGame">{{stats.avgPuttsWithChip}}</td>\r\n<td class="shortGame">{{stats.avgPuttsWithoutChip}}</td>\r\n<td class="shortGame">{{stats.chipIn}}</td>\r\n<td class="shortGame">{{stats.chips}}</td>\r\n<td class="shortGame">{{stats.extraChips}} </td>\r\n<td class="shortGame" title="{{stats.scrambles}} / {{stats.scrambleChances}}">{{scrambleText}}</td>\r\n<td class="shortGame">{{stats.scramblePercent}}</td>\r\n\r\n<td class="shortGame">{{stats.shortGame}}</td>\r\n<td class="shortGame">{{stats.shortGamePercent}}</td>\r\n\r\n<td>{{stats.ch15}}</td>\r\n<!-- driving -->\r\n<td class="driving" title="{{stats.fairways}} / {{stats.totalFairways}}">{{fairwayText}}</td>\r\n<td class="driving">{{stats.fairwayPercent}}</td>\r\n<td class="driving">{{stats.drivePoints}}</td>\r\n<td class="driving" title="{{stats.playable}} / {{stats.totalFairways}}">{{playableText}}</td>\r\n<td class="driving">{{stats.playablePercent}}</td>\r\n\r\n<td class="scoreRow">{{stats.penalties}}</td>\r\n<td class="scoreRow">{{stats.extra}}</td>\r\n<td class="scoreRow">{{stats.eagles}}</td>\r\n<td class="scoreRow">{{stats.birdies}}</td>\r\n<td class="scoreRow">{{stats.pars}}</td>\r\n<td class="scoreRow">{{stats.bogies}}</td>\r\n<td class="scoreRow">{{stats.doubles}}</td>\r\n<td class="scoreRow">{{stats.others}} </td>\r\n\r\n';});

define('text!templates/scorecard.html',[],function () { return '<div class="modal-header">\r\n    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>\r\n    <h3>{{prettyDate}} - {{course.name}} - {{tee.name}}</h3>\r\n  </div>\r\n  <div class="modal-body">\r\n    <table class="scores scoreFront scorecard table table-bordered">\r\n        <thead>\r\n            <tr>\r\n                <th>Hole</th>\r\n                <th>1</th>\r\n                <th>2</th>\r\n                <th>3</th>\r\n                <th>4</th>\r\n                <th>5</th>\r\n                <th>6</th>\r\n                <th>7</th>\r\n                <th>8</th>\r\n                <th>9</th>\r\n                <th>Out</th>\r\n                <th>Total</th>\r\n            </tr>\r\n        </thead>\r\n        {{{frontTable}}}\r\n    </table>\r\n     <table class="scores scorecard scoreBack table table-bordered">\r\n        <thead>\r\n            <tr>\r\n                <th>Hole</th>\r\n                <th>10</th>\r\n                <th>11</th>\r\n                <th>12</th>\r\n                <th>13</th>\r\n                <th>14</th>\r\n                <th>15</th>\r\n                <th>16</th>\r\n                <th>17</th>\r\n                <th>18</th>\r\n                <th>In</th>\r\n                <th>Total</th>\r\n            </tr>\r\n        </thead>\r\n        <tbody>\r\n            {{{backTable}}}\r\n        </tbody>\r\n    </table>\r\n    <div class="stats">\r\n        handicapAfter:{{handicapAfter}}<br />\r\n        handicapBefore:{{handicapBefore}}<br />\r\n        score:{{score}}<br />\r\n        ESC:{{ESC}}<br />\r\n    </div>\r\n  </div>\r\n  <div class="modal-footer">\r\n  <a href="#" class="btn btn-primary" id="btnscoreFront">Front</a><a href="#" class="btn" id="btnscoreBack">Back</a><a href="#" class="btn" id="btnstats" >Stats</a>\r\n    <a href="#" class="btn" data-dismiss="modal">Close</a>\r\n    <a href="/score/edit" id="editButton" class="btn">Edit</a>\r\n  </div>';});

define('views/scorecard',['text!templates/scorecard.html','scoreCalculator'],function(template,scoreCalculator){
    var RecentView = Backbone.View.extend({
        el: '#scoreModal',  
        tagName:"div",
        template: Handlebars.compile(template),
        events:{
            "click #btnscoreBack":"showBackTable",
            "click #btnscoreFront":"showFrontTable",
            "click #btnstats":"showStats"
        },
        initialize: function(){
            // this.collection.on('add', this.render, this);
            this.model.set({"frontTable":this.getFrontTable(),"backTable":this.getBackTable()});
            this.render();
        },
        render:function(){
            var $el = $('<div id="scoreModal" class="modal hide fade scorecard" tabindex="-1" role="dialog" aria-hidden="true"/>');
            var html =this.template(this.model.toJSON());
            $el.html(html);
            $("body").append($el);
            $el.modal('show');
            $el.find(".scoreBack").hide();
            $el.find(".stats").hide();
            this.$el = $el;
            
            $el.find("#editButton").prop("href","/score/edit/" + this.model.get("_id"));
            return this;
        },
        showFrontTable:function(e){
            e.preventDefault();
           /* this.$el.find(".scoreFront").show();
            this.$el.find("#btnFront").addClass("btn-primary");
            this.$el.find("#btnBack").removeClass("btn-primary");
            this.$el.find(".scoreBack").hide();
            this.$el.find(".stats").hide();
            this.$el.find("#btnStats").removeClass("btn-primary");*/
            this.hideThese(["stats","scoreBack"]);
            this.showThis("scoreFront");
        },
        showBackTable:function(e){
            e.preventDefault();
        /*    this.$el.find(".scoreBack").show();
            this.$el.find(".scoreFront").hide();
            this.$el.find(".stats").hide();
            this.$el.find("#btnBack").addClass("btn-primary");
            this.$el.find("#btnFront").removeClass("btn-primary");
            this.$el.find("#btnStats").removeClass("btn-primary");*/
            this.hideThese(["scoreFront","stats"]);
            this.showThis("scoreBack");
        },
        showStats:function(e){
            e.preventDefault();
            this.hideThese(["scoreFront","scoreBack"]);
            this.showThis("stats");
        },
        hideThese:function(items){
            var self = this;
            items.forEach(function(key){
                self.$el.find("." + key).hide();
                self.$el.find("#btn" + key ).removeClass("btn-primary");    
            });
        },
        showThis:function(key){
            this.$el.find("." + key).show();
            this.$el.find("#btn" + key ).addClass("btn-primary");    
        },
        getFrontTable: function(){
           return this.getTable(0);
         },
        getBackTable: function(){
           return this.getTable(9);
         },
        getTable: function(index){
            var tee = this.model.get("tee");
            var holes = this.model.get("holes");
            var html = "<tbody>";
            html += this.getRow(tee.holes,index,"Yards","yards",tee.yards);
            html += this.getRow(tee.holes,index,"Par","par",tee.par);
            html += this.getScoreRow(holes,tee.holes,index,"Score","score",this.model.get("score"));
            html += this.getRow(holes,index,"Putts","putts",this.model.get("stats").putts);
            html += this.getBoolRow(holes,tee.holes,index,"GIR","GIR",this.model.get("stats").GIR);
            html += this.getRow(holes,index,"Chips","chips",this.model.get("stats").chips,function(d){
                
                if(d.chipIn)
                    return "chipin";
                else if(d.chips == 1 && d.putts === 1){
                    return "upAndDown";
                }
                return "";
            });
            html += this.getFairwayRow(holes,tee.holes,index,"Fairway","fairway",this.model.get("stats").fairwayPercent,function(val) {return (val=="Hit"||val=="hit");});
            html += this.getFairwayRow(holes,tee.holes,index,"Playable","playable",this.model.get("stats").playablePercent,function(val) {return val;});
            html += this.getExtraRow(holes,tee.holes,index,"Extras",this.model.get("stats").extra);
            html += this.getRow(holes,index,"Penalties","penalties",this.model.get("stats").penalties);
            html += this.getRow(holes,index,"Dr Pnts","drivePoints",this.model.get("stats").drivePoints);
            
            html += "</tbody>";
            return html;
         },
        getRow: function(holes,index,label,stat,total,classFunction){
            var html =  this.htmlTop(label);
                var sum = 0;
                for(var i = 0;i< 9;i++){
                    var val = holes[index+i][stat];
                    var className ="";
                    if(classFunction){
                        className = classFunction(holes[index+i]);
                    }
                    if(typeof val != 'undefined'){
                        sum += val;
                        html += "<td class='"  + className + "'>" + val + "</td>";
                    }else{
                        html += "<td class='"  + className + "'>0</td>";
                    }
                }
                 html += this.htmlBottom(sum,total);
            return html;
        },
        
        getExtraRow: function(holes,teeHoles,index,label,total){
            var html =  this.htmlTop(label);
                var sum = 0;
                for(var i = 0;i< 9;i++){
                    var scoreHole = holes[index+i];
                    var teeHole = teeHoles[index+i];
                    var val = (new scoreCalculator()).getExtra(scoreHole,teeHole.par);//holes[index+i][stat];
                    console.log("getExtraRow:",val);
                    if(typeof val != 'undefined'){
                        sum += val;
                        html += "<td>" + val + "</td>";
                    }else{
                        html += "<td>0</td>";
                    }
                }
                html += this.htmlBottom(sum,total);
            return html;
        },
      
        getScoreRow: function(holes,teeHoles,index,label,stat,total){
            var html =  this.htmlTop(label);
                var sum = 0;
                for(var i = 0;i< 9;i++){
                    var val = holes[index+i][stat];
                    if(typeof val != 'undefined'){
                        sum += val;
                        var diff = val - teeHoles[index+i].par;
                        var className = getScoreClassName(diff);
                        html += "<td class='" + className + "'>" + val + "</td>";
                    }else{
                        html += "<td class='bogie'>0</td>";
                    }
                }
                html += "<td class='bogie'>" + sum + "</td>";
                html += "<td class='bogie'>" + total + "</td>";
            html += "</tr>";
            return html;
        },
        getBoolRow: function(holes,teeHoles,index,label,stat,total){
            var html =  this.htmlTop(label);
            var sum = 0;
            for(var i = 0;i< 9;i++){
                var val = holes[index+i];
                var gir = ((teeHoles[index+i].par - 2 ) >= ( val.score - val.putts));
                
                console.log('bool row:',index+i,gir);
                if(gir){
                    sum += 1;
                    html += "<td><i class='icon icon-ok' /></td>";
                }else{
                    html += "<td><i class='icon icon-remove' /></td>";
                }
            }
            html  += this.htmlBottom(sum,total);
            return html;
        },
        getFairwayRow: function(holes,teeHoles,index,label,stat,total,test){
            var html =  this.htmlTop(label);
                var sum = 0;
                var cnt = 0;
             
                for(var i = 0;i< 9;i++){
                    var val = holes[index+i][stat];
                    if(teeHoles[index+i].par > 3 && typeof val != 'undefined'){
                        cnt += 1;
                        if(test(val)){
                            sum += 1;    
                            html += "<td><i class='icon icon-ok' /></td>";
                        }else{
                            html += "<td><i class='icon icon-remove' /></td>";
                        }
                    }else{
                        html += "<td>&nbsp;</td>";    
                    }
                }
                html += this.htmlBottom((sum / cnt*100).toFixed(0),total);
            return html;
        },
        htmlTop : function(label){
            return "<tr><th>" + label + "</th>";
        },
        htmlBottom :function(sum,total){
             return "<td>" + sum + "</td><td>" + total + "</td></tr>";
        }
    });
    function getScoreClassName(diff){
        switch(diff){
            case -3:
            case -2:
                return "eagle";
            case -1:
                return "birdie";
            case 0:
                return "par";
            case 1:
                return "bogie";
            case 2:
                return "double";
            default:
                return "other";
        }
    }
    return RecentView;
});
define('models/scorecard',[],function(){
    var ScoreCard = Backbone.Model.extend({
        initialize:function(){
            var front = {"par":0};
            var back = {"par":0};
            for(var i = 0;i<9;i++){
                var t = this.get("tee").holes[i];
                front.par += t.par;
            }
            for(var j = 9;j<18;j++){
                var teeHole = this.get("tee").holes[j];
                back.par += teeHole.par;
            }
            var tee = this.get("tee");
            tee.par =0;
            tee.yards=0;
            this.get("tee").holes.forEach(function(t){
                tee.par += t.par;
                tee.yards += t.yards;
            });
            this.set({"tee":tee, "front":front,"back":back});
            console.log("scorecard init",this.toJSON());
            
        },
    });
    return ScoreCard;
});
define('views/scoreTableItem',['text!templates/table.html','views/scorecard','models/scorecard'],function(template,ScorecardView,ScoreCard){
    var ScoreView = Backbone.View.extend({
        tagName:'tr',
        className:'',
        template: Handlebars.compile(template),
        events:{
            "click a":          "scorecard"
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
          
        },
        scorecard: function(e){
            e.preventDefault();
            new ScorecardView({model:new ScoreCard(this.model.toJSON())});
        },
        render: function(){
            var $el = $(this.el);
            var html =this.template(this.model.toJSON());
            $el.html(html);
            $el.addClass(this.model.get("className"));
            return this;
        }
        
    });
    return ScoreView;
});
define('models/sum',[],function(xdate,scoreCalculator){
    var ScoreSum = Backbone.Model.extend({
        url:'scores',
        blank: {
            _id:"sum",
            isGoal:true,
            date: new Date(),
            courseName:"Sum",
            course:{name:""},
            tee:{name:""},
            score:0,
            stats:{
                handicap:0,
                GIR:0,
                putts:0,
                onePutts:0,
                threePutts:0,
                chipIn:0,
                shortGame:0,
                ch15:0,
                avgPuttsWithoutChip:0,
                avgPuttsWithChip:0,
                fairways:0, totalFairways:0,
                fairwayPercent:0,
                drivePoints:0,
                playable:0,
                playablePercent:0,
                chips:0,
                penalties:0,
                shortGamePercent:0.0,
                extra:0,
                scrambles:0,
                scrambleChances:0,
                scramblePercent:0,
                pars:0,
                bogies:0,
                birdies:0,
                extraChips:0,
                doubles:0,
                others:0,
                eagles:0    
            }
            },
        initialize:function(){
            var pretty,shortName,className;
            pretty="Sum";
            shortName="Sum";
            className="goalFoot";
            this.set(this.blank);
            console.log("sum.isGoal",this.get("isGoal"));
            this.set({"scrambleText":"","fairwayText":"","playableText":"","prettyDate":pretty,"eagleAstrix":"",'shortName':shortName,"className":className});
                   
        },
        count:0,
        add:function(score){
            this.sum("score",score);
            for(var i in this.blank.stats){
                this.sumStat(i,score);    
            }
            this.count++;
        },
        roundNumbers:function(){
            for(var i in this.blank.stats){
                this.fixIt(i);    
            }
            var rounder = 10;
            this.set({"score":Math.round(this.get('score')*rounder)/rounder});
            
        },
        sum:function(attribute,model){
            var value = this.get(attribute);
            value = value * this.count + model.get(attribute);
            value = value/  (this.count+1);
            var result = {};
            result[attribute]=value;
            this.set(result);
        },
        sumStat:function(attribute,model){
            var stats = this.get('stats');
            var modelStats = model.get('stats');
            if(stats && modelStats){
                var value = stats[attribute] * this.count + modelStats[attribute];
                stats[attribute]=value/  (this.count+1);
                this.set({"stats":stats});
            }
        },
        fixIt:function(attribute){
            var stats = this.get('stats');
            var value = stats[attribute];
            var rounder;
            switch(attribute){
                case "handicap":
                case "putts":
                case "chipIn":
                case "avgPuttsWithoutChip":
                case "avgPuttsWithChip":
                case "extraChips":
                case "eagles":
                     rounder = 100;
                     break;
                default:
                   rounder = 10;
                   // console.log("rounding:",attribute,"by",rounder);
                    break;
            }
            stats[attribute]=Math.round(value*rounder)/rounder;
            this.set({"stats":stats});
        }
    });
    return ScoreSum;
});
define('views/recentTable',['views/scoreTableItem','models/score','models/sum'],function(ScoreTableItemView,Score, Sum){
    var RecentView = Backbone.View.extend({
   //     el: '#recentTable',  
        events:{
        },
        initialize: function(){
            // this.collection.on('add', this.render, this);
        },
        hide:function(){
          this.$el.parent().parent().hide();  
          return this;
        },
        show:function(){
          this.$el.parent().parent().show();  
          return this;
        },
        render:function(){
            console.log("rendering: score table view");
            var self = this;
            self.$el.empty();
            var sum = new Sum();
            console.log(this.collection.filter());
            this.collection.filter().forEach(function(score){
                sum.add(score);
              var item = new ScoreTableItemView({model:score});
               self.$el.append(item.render().el);
            });
            //add sum record
            sum.roundNumbers();
            var sumitem = new ScoreTableItemView({model:sum});
            self.$el.append(sumitem.render().el);            
            
            //add Goal Record
            var item = new ScoreTableItemView({model:new Score(self.goalScore)});
            self.$el.append(item.render().el);         
            // color cells based on goal record
            this.colorCells();
            return this;
        },
        colorCells: function(){
            for(var i=3;i<=31;i++){
                switch(i){
                case 5:
                case 7:
                case 11:
                case 15:
                case 20:
                case 23:    
                case 26:
                case 27:
                case 28:
                    this.doAverages(i,true);
                    break;
                case 14:
                case 19:
                case 22:
                case 29:
                    break; //dont average these
                default:
                    this.doAverages(i,false);
                }
            }
        },
        doAverages:function(child,isAboveBetter){
            var goalscore = this.$el.find("tr:last-child").find(":nth-child(" + child + ")").html();
            var goalScore = parseFloat(goalscore);
             this.$el.find("td:nth-child(" + child + ")").each(function(){
                if($(this).parent().hasClass('goalFoot'))
                    return;
                
                var thisScore = parseFloat($(this).html());
                var isAbove;
                if(thisScore > goalScore){
                    isAbove = true;
                }else{
                    isAbove = false;
                }
                if(thisScore == goalScore || (isAboveBetter && isAbove) || (!isAboveBetter && !isAbove)){
                    $(this).css("color","#002900").css("font-weight","800").css("background-color","#2fddff");
                }else{
                   // $(this).css("color","#985404");
                }
            });
            
        },
        goalScore : {
            _id:"goal",
            isGoal:true,
            date: new Date(),
            dateString:"*",
            courseName:"Goal",
            course:{name:""},
            tee:{name:""},
            score:86,
            stats:{
                handicap:13,
                GIR:7,
                putts:33,
                onePutts:5,
                threePutts:1,
                chipIn:1,
                shortGame:42,
                ch15:0,
                avgPuttsWithoutChip:2,
                avgPuttsWithChip:1.6,
                fairways:8, totalFairways:14,
                fairwayPercent:57,
                drivePoints:7,
                playable:12,
                playablePercent:85.7,
                chips:10,
                penalties:0,
                shortGamePercent:50.0,
                extra:2.5,
                scrambles:4,
                scrambleChances:10,
                scramblePercent:25,
                pars:9,
                bogies:7,
                birdies:1,
                extraChips:0,
                doubles:2,
                others:0,
                eagles:1    
            }
        }
    });
    
    return RecentView;
});
define('views/scoreTable',['text!templates/scoreTable.html','views/recentTable'],function(template,RecentView){
    var ScoreTableView = Backbone.View.extend({
  //      tagName:'div',
    //    className:'scoreTableWrapper',
        template: Handlebars.compile(template),
        events:{
            "click button.y2013":          "y2013",
            "click button.y2012":          "y2012",
            "click button.all":          "all",
            "click button.last20":          "last20",
            "click button.last5":          "last5"
        },
        initialize:function(){
            console.log("initialize ScoreTable",new RecentView());
            this.collection.setFilter("last","20");
            this.views={};
           this.render();
        },
        y2013: function(e){
            this.collection.setFilter('year',2013);
            this.views.recent.render();
        },
        y2012: function(e){
            this.collection.setFilter('year',2012);
            this.views.recent.render();
        },
        last20: function(e){
            this.collection.setFilter('last',20);
            this.views.recent.render();
        },
        last5: function(e){
            this.collection.setFilter('last',5);
            this.views.recent.render();
        },
        all: function(e){
            this.collection.setFilter(null,null);
            this.views.recent.render();
        },
        hide:function(){
            this.$el.hide();
        },
        show:function(){
            this.$el.show();
        },
        
        render: function(){
            
            var $el = $(this.el);
            var html =this.template({});
            console.log("rendering ScoreTable",$el.html(),":");
            $el.html(html);
            var self = this;
            this.views.recent = new RecentView({el:$(this.el).find("#recentTable"),collection:this.collection});
            this.collection.fetch({data:{},success: function(res){ 
                self.views.recent.render();
            }});
            return this;
        }
        
    });
    return ScoreTableView;
});
define('',[],function(){
    var ScoreTableModel = Backbone.Model.extend({
        url:'scoresTable',
        initialize:function(){
            
        }
    });
    return ScoreTableModel;
});
define("models/scoreTable", function(){});

define('app',['views/app','collections/scorelist','collections/goallist','views/goals','config'
        ,'views/courseLayer' ,'views/graphLayer','views/scoreTable','models/scoreTable'
        ], function(AppView,ScoreList,GoalList,GoalsView,config
        , CourseLayer,GraphLayer,ScoreTableView,ScoreTableModel){
   var App = function(){
       
      console.log('app loaded');
      this.views.app = new AppView();
      this.views.app.render();
      
      this.collections.scores = new ScoreList();
      this.collections.goals = new GoalList();      
      
      
      this.views.scoreWrapper = new ScoreTableView({el:".scoreTableWrapper",collection:this.collections.scores});
            
      //this.views.recentTable = new RecentTableView({collection:this.collections.scores});
      
      this.views.goals = new GoalsView({collection:this.collections.goals});
      
      this.views.courseLayer = new CourseLayer();
      this.views.graphLayer = new GraphLayer();
      
      console.log("render!");
      this.init();
   } ;
   
   App.prototype= {
       views: {},
       collections: {},
       init:function(){
            var self = this;
       
            self.collections.goals.fetch({data:{},success: function(res){ self.views.goals.render();}});
            self.views.courseLayer.hide();
       
            $("body").on("click","#coursesLink",function(){
                $("#scoresLink").parent().removeClass('active');
                   $("#graphsLink").parent().removeClass('active');
                self.views.scoreWrapper.hide();
                self.views.graphLayer.hide();
                self.views.courseLayer.show();
              //  $('div#courseLayer').show();
                
                $("#coursesLink").parent().addClass('active');
                
            });
             $("body").on("click","#scoresLink",function(){
                $("#coursesLink").parent().removeClass('active');
                 $("#graphsLink").parent().removeClass('active');
                self.views.courseLayer.hide();
                self.views.graphLayer.hide();
                //$('div#courseLayer').hide();
                self.views.scoreWrapper.show();
                
                $("#scoresLink").parent().addClass('active');
            });
            $("body").on("click","#graphsLink",function(){
                $("#coursesLink").parent().removeClass('active');
                $("#scoresLink").parent().removeClass('active');
                self.views.courseLayer.hide();
                self.views.scoreWrapper.hide();
                //$('div#courseLayer').hide();
                self.views.graphLayer.show();
                $("#graphsLink").parent().addClass('active');
            });
            $('div#courseLayer').hide();
            self.views.courseLayer.hide();
            self.views.graphLayer.hide();
       }
       
   };
   
   return App;
});
requirejs.config({
    baseUrl:'app/js',
    paths:{
        text: 'lib/text',
        xdate: '/public/xdate/xdate',
        scoreCalculator:'lib/scoreCalculator',
        d3:'/public/d3/d3.min'
    },
    shim:{
        '/public/underscore/underscore-min.js': {
            exports: '_'
        },
        '/public/backbone/backbone-min.js':{
            deps: ['/public/underscore/underscore-min.js'],
            exports: 'Backbone'
        },
        '/public/handlebars/handlebars.js':{
            exports: 'Handlebars'
        },
        'app':{
            deps:['/public/underscore/underscore-min.js', '/public/backbone/backbone-min.js','/public/handlebars/handlebars.js']
        }
    }
});
require(['app'],
    function(App){
        console.log('main.js App is created');
          _.templateSettings = {    interpolate: /\{\{(.+?)\}\}/g  };
        window.Golf = new App();
    }
);

define("main", function(){});

(function(){var n=this,t=n._,r={},e=Array.prototype,u=Object.prototype,i=Function.prototype,a=e.push,o=e.slice,c=e.concat,l=u.toString,f=u.hasOwnProperty,s=e.forEach,p=e.map,h=e.reduce,v=e.reduceRight,d=e.filter,g=e.every,m=e.some,y=e.indexOf,b=e.lastIndexOf,x=Array.isArray,_=Object.keys,j=i.bind,w=function(n){return n instanceof w?n:this instanceof w?(this._wrapped=n,void 0):new w(n)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=w),exports._=w):n._=w,w.VERSION="1.4.4";var A=w.each=w.forEach=function(n,t,e){if(null!=n)if(s&&n.forEach===s)n.forEach(t,e);else if(n.length===+n.length){for(var u=0,i=n.length;i>u;u++)if(t.call(e,n[u],u,n)===r)return}else for(var a in n)if(w.has(n,a)&&t.call(e,n[a],a,n)===r)return};w.map=w.collect=function(n,t,r){var e=[];return null==n?e:p&&n.map===p?n.map(t,r):(A(n,function(n,u,i){e[e.length]=t.call(r,n,u,i)}),e)};var O="Reduce of empty array with no initial value";w.reduce=w.foldl=w.inject=function(n,t,r,e){var u=arguments.length>2;if(null==n&&(n=[]),h&&n.reduce===h)return e&&(t=w.bind(t,e)),u?n.reduce(t,r):n.reduce(t);if(A(n,function(n,i,a){u?r=t.call(e,r,n,i,a):(r=n,u=!0)}),!u)throw new TypeError(O);return r},w.reduceRight=w.foldr=function(n,t,r,e){var u=arguments.length>2;if(null==n&&(n=[]),v&&n.reduceRight===v)return e&&(t=w.bind(t,e)),u?n.reduceRight(t,r):n.reduceRight(t);var i=n.length;if(i!==+i){var a=w.keys(n);i=a.length}if(A(n,function(o,c,l){c=a?a[--i]:--i,u?r=t.call(e,r,n[c],c,l):(r=n[c],u=!0)}),!u)throw new TypeError(O);return r},w.find=w.detect=function(n,t,r){var e;return E(n,function(n,u,i){return t.call(r,n,u,i)?(e=n,!0):void 0}),e},w.filter=w.select=function(n,t,r){var e=[];return null==n?e:d&&n.filter===d?n.filter(t,r):(A(n,function(n,u,i){t.call(r,n,u,i)&&(e[e.length]=n)}),e)},w.reject=function(n,t,r){return w.filter(n,function(n,e,u){return!t.call(r,n,e,u)},r)},w.every=w.all=function(n,t,e){t||(t=w.identity);var u=!0;return null==n?u:g&&n.every===g?n.every(t,e):(A(n,function(n,i,a){return(u=u&&t.call(e,n,i,a))?void 0:r}),!!u)};var E=w.some=w.any=function(n,t,e){t||(t=w.identity);var u=!1;return null==n?u:m&&n.some===m?n.some(t,e):(A(n,function(n,i,a){return u||(u=t.call(e,n,i,a))?r:void 0}),!!u)};w.contains=w.include=function(n,t){return null==n?!1:y&&n.indexOf===y?n.indexOf(t)!=-1:E(n,function(n){return n===t})},w.invoke=function(n,t){var r=o.call(arguments,2),e=w.isFunction(t);return w.map(n,function(n){return(e?t:n[t]).apply(n,r)})},w.pluck=function(n,t){return w.map(n,function(n){return n[t]})},w.where=function(n,t,r){return w.isEmpty(t)?r?null:[]:w[r?"find":"filter"](n,function(n){for(var r in t)if(t[r]!==n[r])return!1;return!0})},w.findWhere=function(n,t){return w.where(n,t,!0)},w.max=function(n,t,r){if(!t&&w.isArray(n)&&n[0]===+n[0]&&65535>n.length)return Math.max.apply(Math,n);if(!t&&w.isEmpty(n))return-1/0;var e={computed:-1/0,value:-1/0};return A(n,function(n,u,i){var a=t?t.call(r,n,u,i):n;a>=e.computed&&(e={value:n,computed:a})}),e.value},w.min=function(n,t,r){if(!t&&w.isArray(n)&&n[0]===+n[0]&&65535>n.length)return Math.min.apply(Math,n);if(!t&&w.isEmpty(n))return 1/0;var e={computed:1/0,value:1/0};return A(n,function(n,u,i){var a=t?t.call(r,n,u,i):n;e.computed>a&&(e={value:n,computed:a})}),e.value},w.shuffle=function(n){var t,r=0,e=[];return A(n,function(n){t=w.random(r++),e[r-1]=e[t],e[t]=n}),e};var k=function(n){return w.isFunction(n)?n:function(t){return t[n]}};w.sortBy=function(n,t,r){var e=k(t);return w.pluck(w.map(n,function(n,t,u){return{value:n,index:t,criteria:e.call(r,n,t,u)}}).sort(function(n,t){var r=n.criteria,e=t.criteria;if(r!==e){if(r>e||r===void 0)return 1;if(e>r||e===void 0)return-1}return n.index<t.index?-1:1}),"value")};var F=function(n,t,r,e){var u={},i=k(t||w.identity);return A(n,function(t,a){var o=i.call(r,t,a,n);e(u,o,t)}),u};w.groupBy=function(n,t,r){return F(n,t,r,function(n,t,r){(w.has(n,t)?n[t]:n[t]=[]).push(r)})},w.countBy=function(n,t,r){return F(n,t,r,function(n,t){w.has(n,t)||(n[t]=0),n[t]++})},w.sortedIndex=function(n,t,r,e){r=null==r?w.identity:k(r);for(var u=r.call(e,t),i=0,a=n.length;a>i;){var o=i+a>>>1;u>r.call(e,n[o])?i=o+1:a=o}return i},w.toArray=function(n){return n?w.isArray(n)?o.call(n):n.length===+n.length?w.map(n,w.identity):w.values(n):[]},w.size=function(n){return null==n?0:n.length===+n.length?n.length:w.keys(n).length},w.first=w.head=w.take=function(n,t,r){return null==n?void 0:null==t||r?n[0]:o.call(n,0,t)},w.initial=function(n,t,r){return o.call(n,0,n.length-(null==t||r?1:t))},w.last=function(n,t,r){return null==n?void 0:null==t||r?n[n.length-1]:o.call(n,Math.max(n.length-t,0))},w.rest=w.tail=w.drop=function(n,t,r){return o.call(n,null==t||r?1:t)},w.compact=function(n){return w.filter(n,w.identity)};var R=function(n,t,r){return A(n,function(n){w.isArray(n)?t?a.apply(r,n):R(n,t,r):r.push(n)}),r};w.flatten=function(n,t){return R(n,t,[])},w.without=function(n){return w.difference(n,o.call(arguments,1))},w.uniq=w.unique=function(n,t,r,e){w.isFunction(t)&&(e=r,r=t,t=!1);var u=r?w.map(n,r,e):n,i=[],a=[];return A(u,function(r,e){(t?e&&a[a.length-1]===r:w.contains(a,r))||(a.push(r),i.push(n[e]))}),i},w.union=function(){return w.uniq(c.apply(e,arguments))},w.intersection=function(n){var t=o.call(arguments,1);return w.filter(w.uniq(n),function(n){return w.every(t,function(t){return w.indexOf(t,n)>=0})})},w.difference=function(n){var t=c.apply(e,o.call(arguments,1));return w.filter(n,function(n){return!w.contains(t,n)})},w.zip=function(){for(var n=o.call(arguments),t=w.max(w.pluck(n,"length")),r=Array(t),e=0;t>e;e++)r[e]=w.pluck(n,""+e);return r},w.object=function(n,t){if(null==n)return{};for(var r={},e=0,u=n.length;u>e;e++)t?r[n[e]]=t[e]:r[n[e][0]]=n[e][1];return r},w.indexOf=function(n,t,r){if(null==n)return-1;var e=0,u=n.length;if(r){if("number"!=typeof r)return e=w.sortedIndex(n,t),n[e]===t?e:-1;e=0>r?Math.max(0,u+r):r}if(y&&n.indexOf===y)return n.indexOf(t,r);for(;u>e;e++)if(n[e]===t)return e;return-1},w.lastIndexOf=function(n,t,r){if(null==n)return-1;var e=null!=r;if(b&&n.lastIndexOf===b)return e?n.lastIndexOf(t,r):n.lastIndexOf(t);for(var u=e?r:n.length;u--;)if(n[u]===t)return u;return-1},w.range=function(n,t,r){1>=arguments.length&&(t=n||0,n=0),r=arguments[2]||1;for(var e=Math.max(Math.ceil((t-n)/r),0),u=0,i=Array(e);e>u;)i[u++]=n,n+=r;return i},w.bind=function(n,t){if(n.bind===j&&j)return j.apply(n,o.call(arguments,1));var r=o.call(arguments,2);return function(){return n.apply(t,r.concat(o.call(arguments)))}},w.partial=function(n){var t=o.call(arguments,1);return function(){return n.apply(this,t.concat(o.call(arguments)))}},w.bindAll=function(n){var t=o.call(arguments,1);return 0===t.length&&(t=w.functions(n)),A(t,function(t){n[t]=w.bind(n[t],n)}),n},w.memoize=function(n,t){var r={};return t||(t=w.identity),function(){var e=t.apply(this,arguments);return w.has(r,e)?r[e]:r[e]=n.apply(this,arguments)}},w.delay=function(n,t){var r=o.call(arguments,2);return setTimeout(function(){return n.apply(null,r)},t)},w.defer=function(n){return w.delay.apply(w,[n,1].concat(o.call(arguments,1)))},w.throttle=function(n,t){var r,e,u,i,a=0,o=function(){a=new Date,u=null,i=n.apply(r,e)};return function(){var c=new Date,l=t-(c-a);return r=this,e=arguments,0>=l?(clearTimeout(u),u=null,a=c,i=n.apply(r,e)):u||(u=setTimeout(o,l)),i}},w.debounce=function(n,t,r){var e,u;return function(){var i=this,a=arguments,o=function(){e=null,r||(u=n.apply(i,a))},c=r&&!e;return clearTimeout(e),e=setTimeout(o,t),c&&(u=n.apply(i,a)),u}},w.once=function(n){var t,r=!1;return function(){return r?t:(r=!0,t=n.apply(this,arguments),n=null,t)}},w.wrap=function(n,t){return function(){var r=[n];return a.apply(r,arguments),t.apply(this,r)}},w.compose=function(){var n=arguments;return function(){for(var t=arguments,r=n.length-1;r>=0;r--)t=[n[r].apply(this,t)];return t[0]}},w.after=function(n,t){return 0>=n?t():function(){return 1>--n?t.apply(this,arguments):void 0}},w.keys=_||function(n){if(n!==Object(n))throw new TypeError("Invalid object");var t=[];for(var r in n)w.has(n,r)&&(t[t.length]=r);return t},w.values=function(n){var t=[];for(var r in n)w.has(n,r)&&t.push(n[r]);return t},w.pairs=function(n){var t=[];for(var r in n)w.has(n,r)&&t.push([r,n[r]]);return t},w.invert=function(n){var t={};for(var r in n)w.has(n,r)&&(t[n[r]]=r);return t},w.functions=w.methods=function(n){var t=[];for(var r in n)w.isFunction(n[r])&&t.push(r);return t.sort()},w.extend=function(n){return A(o.call(arguments,1),function(t){if(t)for(var r in t)n[r]=t[r]}),n},w.pick=function(n){var t={},r=c.apply(e,o.call(arguments,1));return A(r,function(r){r in n&&(t[r]=n[r])}),t},w.omit=function(n){var t={},r=c.apply(e,o.call(arguments,1));for(var u in n)w.contains(r,u)||(t[u]=n[u]);return t},w.defaults=function(n){return A(o.call(arguments,1),function(t){if(t)for(var r in t)null==n[r]&&(n[r]=t[r])}),n},w.clone=function(n){return w.isObject(n)?w.isArray(n)?n.slice():w.extend({},n):n},w.tap=function(n,t){return t(n),n};var I=function(n,t,r,e){if(n===t)return 0!==n||1/n==1/t;if(null==n||null==t)return n===t;n instanceof w&&(n=n._wrapped),t instanceof w&&(t=t._wrapped);var u=l.call(n);if(u!=l.call(t))return!1;switch(u){case"[object String]":return n==t+"";case"[object Number]":return n!=+n?t!=+t:0==n?1/n==1/t:n==+t;case"[object Date]":case"[object Boolean]":return+n==+t;case"[object RegExp]":return n.source==t.source&&n.global==t.global&&n.multiline==t.multiline&&n.ignoreCase==t.ignoreCase}if("object"!=typeof n||"object"!=typeof t)return!1;for(var i=r.length;i--;)if(r[i]==n)return e[i]==t;r.push(n),e.push(t);var a=0,o=!0;if("[object Array]"==u){if(a=n.length,o=a==t.length)for(;a--&&(o=I(n[a],t[a],r,e)););}else{var c=n.constructor,f=t.constructor;if(c!==f&&!(w.isFunction(c)&&c instanceof c&&w.isFunction(f)&&f instanceof f))return!1;for(var s in n)if(w.has(n,s)&&(a++,!(o=w.has(t,s)&&I(n[s],t[s],r,e))))break;if(o){for(s in t)if(w.has(t,s)&&!a--)break;o=!a}}return r.pop(),e.pop(),o};w.isEqual=function(n,t){return I(n,t,[],[])},w.isEmpty=function(n){if(null==n)return!0;if(w.isArray(n)||w.isString(n))return 0===n.length;for(var t in n)if(w.has(n,t))return!1;return!0},w.isElement=function(n){return!(!n||1!==n.nodeType)},w.isArray=x||function(n){return"[object Array]"==l.call(n)},w.isObject=function(n){return n===Object(n)},A(["Arguments","Function","String","Number","Date","RegExp"],function(n){w["is"+n]=function(t){return l.call(t)=="[object "+n+"]"}}),w.isArguments(arguments)||(w.isArguments=function(n){return!(!n||!w.has(n,"callee"))}),"function"!=typeof/./&&(w.isFunction=function(n){return"function"==typeof n}),w.isFinite=function(n){return isFinite(n)&&!isNaN(parseFloat(n))},w.isNaN=function(n){return w.isNumber(n)&&n!=+n},w.isBoolean=function(n){return n===!0||n===!1||"[object Boolean]"==l.call(n)},w.isNull=function(n){return null===n},w.isUndefined=function(n){return n===void 0},w.has=function(n,t){return f.call(n,t)},w.noConflict=function(){return n._=t,this},w.identity=function(n){return n},w.times=function(n,t,r){for(var e=Array(n),u=0;n>u;u++)e[u]=t.call(r,u);return e},w.random=function(n,t){return null==t&&(t=n,n=0),n+Math.floor(Math.random()*(t-n+1))};var M={escape:{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","/":"&#x2F;"}};M.unescape=w.invert(M.escape);var S={escape:RegExp("["+w.keys(M.escape).join("")+"]","g"),unescape:RegExp("("+w.keys(M.unescape).join("|")+")","g")};w.each(["escape","unescape"],function(n){w[n]=function(t){return null==t?"":(""+t).replace(S[n],function(t){return M[n][t]})}}),w.result=function(n,t){if(null==n)return null;var r=n[t];return w.isFunction(r)?r.call(n):r},w.mixin=function(n){A(w.functions(n),function(t){var r=w[t]=n[t];w.prototype[t]=function(){var n=[this._wrapped];return a.apply(n,arguments),D.call(this,r.apply(w,n))}})};var N=0;w.uniqueId=function(n){var t=++N+"";return n?n+t:t},w.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var T=/(.)^/,q={"'":"'","\\":"\\","\r":"r","\n":"n","	":"t","\u2028":"u2028","\u2029":"u2029"},B=/\\|'|\r|\n|\t|\u2028|\u2029/g;w.template=function(n,t,r){var e;r=w.defaults({},r,w.templateSettings);var u=RegExp([(r.escape||T).source,(r.interpolate||T).source,(r.evaluate||T).source].join("|")+"|$","g"),i=0,a="__p+='";n.replace(u,function(t,r,e,u,o){return a+=n.slice(i,o).replace(B,function(n){return"\\"+q[n]}),r&&(a+="'+\n((__t=("+r+"))==null?'':_.escape(__t))+\n'"),e&&(a+="'+\n((__t=("+e+"))==null?'':__t)+\n'"),u&&(a+="';\n"+u+"\n__p+='"),i=o+t.length,t}),a+="';\n",r.variable||(a="with(obj||{}){\n"+a+"}\n"),a="var __t,__p='',__j=Array.prototype.join,"+"print=function(){__p+=__j.call(arguments,'');};\n"+a+"return __p;\n";try{e=Function(r.variable||"obj","_",a)}catch(o){throw o.source=a,o}if(t)return e(t,w);var c=function(n){return e.call(this,n,w)};return c.source="function("+(r.variable||"obj")+"){\n"+a+"}",c},w.chain=function(n){return w(n).chain()};var D=function(n){return this._chain?w(n).chain():n};w.mixin(w),A(["pop","push","reverse","shift","sort","splice","unshift"],function(n){var t=e[n];w.prototype[n]=function(){var r=this._wrapped;return t.apply(r,arguments),"shift"!=n&&"splice"!=n||0!==r.length||delete r[0],D.call(this,r)}}),A(["concat","join","slice"],function(n){var t=e[n];w.prototype[n]=function(){return D.call(this,t.apply(this._wrapped,arguments))}}),w.extend(w.prototype,{chain:function(){return this._chain=!0,this},value:function(){return this._wrapped}})}).call(this);
define("underscore", function(){});

(function(){var root=this;var previousBackbone=root.Backbone;var array=[];var push=array.push;var slice=array.slice;var splice=array.splice;var Backbone;if(typeof exports!=="undefined"){Backbone=exports}else{Backbone=root.Backbone={}}Backbone.VERSION="1.0.0";var _=root._;if(!_&&typeof require!=="undefined")_=require("underscore");Backbone.$=root.jQuery||root.Zepto||root.ender||root.$;Backbone.noConflict=function(){root.Backbone=previousBackbone;return this};Backbone.emulateHTTP=false;Backbone.emulateJSON=false;var Events=Backbone.Events={on:function(name,callback,context){if(!eventsApi(this,"on",name,[callback,context])||!callback)return this;this._events||(this._events={});var events=this._events[name]||(this._events[name]=[]);events.push({callback:callback,context:context,ctx:context||this});return this},once:function(name,callback,context){if(!eventsApi(this,"once",name,[callback,context])||!callback)return this;var self=this;var once=_.once(function(){self.off(name,once);callback.apply(this,arguments)});once._callback=callback;return this.on(name,once,context)},off:function(name,callback,context){var retain,ev,events,names,i,l,j,k;if(!this._events||!eventsApi(this,"off",name,[callback,context]))return this;if(!name&&!callback&&!context){this._events={};return this}names=name?[name]:_.keys(this._events);for(i=0,l=names.length;i<l;i++){name=names[i];if(events=this._events[name]){this._events[name]=retain=[];if(callback||context){for(j=0,k=events.length;j<k;j++){ev=events[j];if(callback&&callback!==ev.callback&&callback!==ev.callback._callback||context&&context!==ev.context){retain.push(ev)}}}if(!retain.length)delete this._events[name]}}return this},trigger:function(name){if(!this._events)return this;var args=slice.call(arguments,1);if(!eventsApi(this,"trigger",name,args))return this;var events=this._events[name];var allEvents=this._events.all;if(events)triggerEvents(events,args);if(allEvents)triggerEvents(allEvents,arguments);return this},stopListening:function(obj,name,callback){var listeners=this._listeners;if(!listeners)return this;var deleteListener=!name&&!callback;if(typeof name==="object")callback=this;if(obj)(listeners={})[obj._listenerId]=obj;for(var id in listeners){listeners[id].off(name,callback,this);if(deleteListener)delete this._listeners[id]}return this}};var eventSplitter=/\s+/;var eventsApi=function(obj,action,name,rest){if(!name)return true;if(typeof name==="object"){for(var key in name){obj[action].apply(obj,[key,name[key]].concat(rest))}return false}if(eventSplitter.test(name)){var names=name.split(eventSplitter);for(var i=0,l=names.length;i<l;i++){obj[action].apply(obj,[names[i]].concat(rest))}return false}return true};var triggerEvents=function(events,args){var ev,i=-1,l=events.length,a1=args[0],a2=args[1],a3=args[2];switch(args.length){case 0:while(++i<l)(ev=events[i]).callback.call(ev.ctx);return;case 1:while(++i<l)(ev=events[i]).callback.call(ev.ctx,a1);return;case 2:while(++i<l)(ev=events[i]).callback.call(ev.ctx,a1,a2);return;case 3:while(++i<l)(ev=events[i]).callback.call(ev.ctx,a1,a2,a3);return;default:while(++i<l)(ev=events[i]).callback.apply(ev.ctx,args)}};var listenMethods={listenTo:"on",listenToOnce:"once"};_.each(listenMethods,function(implementation,method){Events[method]=function(obj,name,callback){var listeners=this._listeners||(this._listeners={});var id=obj._listenerId||(obj._listenerId=_.uniqueId("l"));listeners[id]=obj;if(typeof name==="object")callback=this;obj[implementation](name,callback,this);return this}});Events.bind=Events.on;Events.unbind=Events.off;_.extend(Backbone,Events);var Model=Backbone.Model=function(attributes,options){var defaults;var attrs=attributes||{};options||(options={});this.cid=_.uniqueId("c");this.attributes={};_.extend(this,_.pick(options,modelOptions));if(options.parse)attrs=this.parse(attrs,options)||{};if(defaults=_.result(this,"defaults")){attrs=_.defaults({},attrs,defaults)}this.set(attrs,options);this.changed={};this.initialize.apply(this,arguments)};var modelOptions=["url","urlRoot","collection"];_.extend(Model.prototype,Events,{changed:null,validationError:null,idAttribute:"id",initialize:function(){},toJSON:function(options){return _.clone(this.attributes)},sync:function(){return Backbone.sync.apply(this,arguments)},get:function(attr){return this.attributes[attr]},escape:function(attr){return _.escape(this.get(attr))},has:function(attr){return this.get(attr)!=null},set:function(key,val,options){var attr,attrs,unset,changes,silent,changing,prev,current;if(key==null)return this;if(typeof key==="object"){attrs=key;options=val}else{(attrs={})[key]=val}options||(options={});if(!this._validate(attrs,options))return false;unset=options.unset;silent=options.silent;changes=[];changing=this._changing;this._changing=true;if(!changing){this._previousAttributes=_.clone(this.attributes);this.changed={}}current=this.attributes,prev=this._previousAttributes;if(this.idAttribute in attrs)this.id=attrs[this.idAttribute];for(attr in attrs){val=attrs[attr];if(!_.isEqual(current[attr],val))changes.push(attr);if(!_.isEqual(prev[attr],val)){this.changed[attr]=val}else{delete this.changed[attr]}unset?delete current[attr]:current[attr]=val}if(!silent){if(changes.length)this._pending=true;for(var i=0,l=changes.length;i<l;i++){this.trigger("change:"+changes[i],this,current[changes[i]],options)}}if(changing)return this;if(!silent){while(this._pending){this._pending=false;this.trigger("change",this,options)}}this._pending=false;this._changing=false;return this},unset:function(attr,options){return this.set(attr,void 0,_.extend({},options,{unset:true}))},clear:function(options){var attrs={};for(var key in this.attributes)attrs[key]=void 0;return this.set(attrs,_.extend({},options,{unset:true}))},hasChanged:function(attr){if(attr==null)return!_.isEmpty(this.changed);return _.has(this.changed,attr)},changedAttributes:function(diff){if(!diff)return this.hasChanged()?_.clone(this.changed):false;var val,changed=false;var old=this._changing?this._previousAttributes:this.attributes;for(var attr in diff){if(_.isEqual(old[attr],val=diff[attr]))continue;(changed||(changed={}))[attr]=val}return changed},previous:function(attr){if(attr==null||!this._previousAttributes)return null;return this._previousAttributes[attr]},previousAttributes:function(){return _.clone(this._previousAttributes)},fetch:function(options){options=options?_.clone(options):{};if(options.parse===void 0)options.parse=true;var model=this;var success=options.success;options.success=function(resp){if(!model.set(model.parse(resp,options),options))return false;if(success)success(model,resp,options);model.trigger("sync",model,resp,options)};wrapError(this,options);return this.sync("read",this,options)},save:function(key,val,options){var attrs,method,xhr,attributes=this.attributes;if(key==null||typeof key==="object"){attrs=key;options=val}else{(attrs={})[key]=val}if(attrs&&(!options||!options.wait)&&!this.set(attrs,options))return false;options=_.extend({validate:true},options);if(!this._validate(attrs,options))return false;if(attrs&&options.wait){this.attributes=_.extend({},attributes,attrs)}if(options.parse===void 0)options.parse=true;var model=this;var success=options.success;options.success=function(resp){model.attributes=attributes;var serverAttrs=model.parse(resp,options);if(options.wait)serverAttrs=_.extend(attrs||{},serverAttrs);if(_.isObject(serverAttrs)&&!model.set(serverAttrs,options)){return false}if(success)success(model,resp,options);model.trigger("sync",model,resp,options)};wrapError(this,options);method=this.isNew()?"create":options.patch?"patch":"update";if(method==="patch")options.attrs=attrs;xhr=this.sync(method,this,options);if(attrs&&options.wait)this.attributes=attributes;return xhr},destroy:function(options){options=options?_.clone(options):{};var model=this;var success=options.success;var destroy=function(){model.trigger("destroy",model,model.collection,options)};options.success=function(resp){if(options.wait||model.isNew())destroy();if(success)success(model,resp,options);if(!model.isNew())model.trigger("sync",model,resp,options)};if(this.isNew()){options.success();return false}wrapError(this,options);var xhr=this.sync("delete",this,options);if(!options.wait)destroy();return xhr},url:function(){var base=_.result(this,"urlRoot")||_.result(this.collection,"url")||urlError();if(this.isNew())return base;return base+(base.charAt(base.length-1)==="/"?"":"/")+encodeURIComponent(this.id)},parse:function(resp,options){return resp},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return this.id==null},isValid:function(options){return this._validate({},_.extend(options||{},{validate:true}))},_validate:function(attrs,options){if(!options.validate||!this.validate)return true;attrs=_.extend({},this.attributes,attrs);var error=this.validationError=this.validate(attrs,options)||null;if(!error)return true;this.trigger("invalid",this,error,_.extend(options||{},{validationError:error}));return false}});var modelMethods=["keys","values","pairs","invert","pick","omit"];_.each(modelMethods,function(method){Model.prototype[method]=function(){var args=slice.call(arguments);args.unshift(this.attributes);return _[method].apply(_,args)}});var Collection=Backbone.Collection=function(models,options){options||(options={});if(options.url)this.url=options.url;if(options.model)this.model=options.model;if(options.comparator!==void 0)this.comparator=options.comparator;this._reset();this.initialize.apply(this,arguments);if(models)this.reset(models,_.extend({silent:true},options))};var setOptions={add:true,remove:true,merge:true};var addOptions={add:true,merge:false,remove:false};_.extend(Collection.prototype,Events,{model:Model,initialize:function(){},toJSON:function(options){return this.map(function(model){return model.toJSON(options)})},sync:function(){return Backbone.sync.apply(this,arguments)},add:function(models,options){return this.set(models,_.defaults(options||{},addOptions))},remove:function(models,options){models=_.isArray(models)?models.slice():[models];options||(options={});var i,l,index,model;for(i=0,l=models.length;i<l;i++){model=this.get(models[i]);if(!model)continue;delete this._byId[model.id];delete this._byId[model.cid];index=this.indexOf(model);this.models.splice(index,1);this.length--;if(!options.silent){options.index=index;model.trigger("remove",model,this,options)}this._removeReference(model)}return this},set:function(models,options){options=_.defaults(options||{},setOptions);if(options.parse)models=this.parse(models,options);if(!_.isArray(models))models=models?[models]:[];var i,l,model,attrs,existing,sort;var at=options.at;var sortable=this.comparator&&at==null&&options.sort!==false;var sortAttr=_.isString(this.comparator)?this.comparator:null;var toAdd=[],toRemove=[],modelMap={};for(i=0,l=models.length;i<l;i++){if(!(model=this._prepareModel(models[i],options)))continue;if(existing=this.get(model)){if(options.remove)modelMap[existing.cid]=true;if(options.merge){existing.set(model.attributes,options);if(sortable&&!sort&&existing.hasChanged(sortAttr))sort=true}}else if(options.add){toAdd.push(model);model.on("all",this._onModelEvent,this);this._byId[model.cid]=model;if(model.id!=null)this._byId[model.id]=model}}if(options.remove){for(i=0,l=this.length;i<l;++i){if(!modelMap[(model=this.models[i]).cid])toRemove.push(model)}if(toRemove.length)this.remove(toRemove,options)}if(toAdd.length){if(sortable)sort=true;this.length+=toAdd.length;if(at!=null){splice.apply(this.models,[at,0].concat(toAdd))}else{push.apply(this.models,toAdd)}}if(sort)this.sort({silent:true});if(options.silent)return this;for(i=0,l=toAdd.length;i<l;i++){(model=toAdd[i]).trigger("add",model,this,options)}if(sort)this.trigger("sort",this,options);return this},reset:function(models,options){options||(options={});for(var i=0,l=this.models.length;i<l;i++){this._removeReference(this.models[i])}options.previousModels=this.models;this._reset();this.add(models,_.extend({silent:true},options));if(!options.silent)this.trigger("reset",this,options);return this},push:function(model,options){model=this._prepareModel(model,options);this.add(model,_.extend({at:this.length},options));return model},pop:function(options){var model=this.at(this.length-1);this.remove(model,options);return model},unshift:function(model,options){model=this._prepareModel(model,options);this.add(model,_.extend({at:0},options));return model},shift:function(options){var model=this.at(0);this.remove(model,options);return model},slice:function(begin,end){return this.models.slice(begin,end)},get:function(obj){if(obj==null)return void 0;return this._byId[obj.id!=null?obj.id:obj.cid||obj]},at:function(index){return this.models[index]},where:function(attrs,first){if(_.isEmpty(attrs))return first?void 0:[];return this[first?"find":"filter"](function(model){for(var key in attrs){if(attrs[key]!==model.get(key))return false}return true})},findWhere:function(attrs){return this.where(attrs,true)},sort:function(options){if(!this.comparator)throw new Error("Cannot sort a set without a comparator");options||(options={});if(_.isString(this.comparator)||this.comparator.length===1){this.models=this.sortBy(this.comparator,this)}else{this.models.sort(_.bind(this.comparator,this))}if(!options.silent)this.trigger("sort",this,options);return this},sortedIndex:function(model,value,context){value||(value=this.comparator);var iterator=_.isFunction(value)?value:function(model){return model.get(value)};return _.sortedIndex(this.models,model,iterator,context)},pluck:function(attr){return _.invoke(this.models,"get",attr)},fetch:function(options){options=options?_.clone(options):{};if(options.parse===void 0)options.parse=true;var success=options.success;var collection=this;options.success=function(resp){var method=options.reset?"reset":"set";collection[method](resp,options);if(success)success(collection,resp,options);collection.trigger("sync",collection,resp,options)};wrapError(this,options);return this.sync("read",this,options)},create:function(model,options){options=options?_.clone(options):{};if(!(model=this._prepareModel(model,options)))return false;if(!options.wait)this.add(model,options);var collection=this;var success=options.success;options.success=function(resp){if(options.wait)collection.add(model,options);if(success)success(model,resp,options)};model.save(null,options);return model},parse:function(resp,options){return resp},clone:function(){return new this.constructor(this.models)},_reset:function(){this.length=0;this.models=[];this._byId={}},_prepareModel:function(attrs,options){if(attrs instanceof Model){if(!attrs.collection)attrs.collection=this;return attrs}options||(options={});options.collection=this;var model=new this.model(attrs,options);if(!model._validate(attrs,options)){this.trigger("invalid",this,attrs,options);return false}return model},_removeReference:function(model){if(this===model.collection)delete model.collection;model.off("all",this._onModelEvent,this)},_onModelEvent:function(event,model,collection,options){if((event==="add"||event==="remove")&&collection!==this)return;if(event==="destroy")this.remove(model,options);if(model&&event==="change:"+model.idAttribute){delete this._byId[model.previous(model.idAttribute)];if(model.id!=null)this._byId[model.id]=model}this.trigger.apply(this,arguments)}});var methods=["forEach","each","map","collect","reduce","foldl","inject","reduceRight","foldr","find","detect","filter","select","reject","every","all","some","any","include","contains","invoke","max","min","toArray","size","first","head","take","initial","rest","tail","drop","last","without","indexOf","shuffle","lastIndexOf","isEmpty","chain"];_.each(methods,function(method){Collection.prototype[method]=function(){var args=slice.call(arguments);args.unshift(this.models);return _[method].apply(_,args)}});var attributeMethods=["groupBy","countBy","sortBy"];_.each(attributeMethods,function(method){Collection.prototype[method]=function(value,context){var iterator=_.isFunction(value)?value:function(model){return model.get(value)};return _[method](this.models,iterator,context)}});var View=Backbone.View=function(options){this.cid=_.uniqueId("view");this._configure(options||{});this._ensureElement();this.initialize.apply(this,arguments);this.delegateEvents()};var delegateEventSplitter=/^(\S+)\s*(.*)$/;var viewOptions=["model","collection","el","id","attributes","className","tagName","events"];_.extend(View.prototype,Events,{tagName:"div",$:function(selector){return this.$el.find(selector)},initialize:function(){},render:function(){return this},remove:function(){this.$el.remove();this.stopListening();return this},setElement:function(element,delegate){if(this.$el)this.undelegateEvents();this.$el=element instanceof Backbone.$?element:Backbone.$(element);this.el=this.$el[0];if(delegate!==false)this.delegateEvents();return this},delegateEvents:function(events){if(!(events||(events=_.result(this,"events"))))return this;this.undelegateEvents();for(var key in events){var method=events[key];if(!_.isFunction(method))method=this[events[key]];if(!method)continue;var match=key.match(delegateEventSplitter);var eventName=match[1],selector=match[2];method=_.bind(method,this);eventName+=".delegateEvents"+this.cid;if(selector===""){this.$el.on(eventName,method)}else{this.$el.on(eventName,selector,method)}}return this},undelegateEvents:function(){this.$el.off(".delegateEvents"+this.cid);return this},_configure:function(options){if(this.options)options=_.extend({},_.result(this,"options"),options);_.extend(this,_.pick(options,viewOptions));this.options=options},_ensureElement:function(){if(!this.el){var attrs=_.extend({},_.result(this,"attributes"));if(this.id)attrs.id=_.result(this,"id");if(this.className)attrs["class"]=_.result(this,"className");var $el=Backbone.$("<"+_.result(this,"tagName")+">").attr(attrs);this.setElement($el,false)}else{this.setElement(_.result(this,"el"),false)}}});Backbone.sync=function(method,model,options){var type=methodMap[method];_.defaults(options||(options={}),{emulateHTTP:Backbone.emulateHTTP,emulateJSON:Backbone.emulateJSON});var params={type:type,dataType:"json"};if(!options.url){params.url=_.result(model,"url")||urlError()}if(options.data==null&&model&&(method==="create"||method==="update"||method==="patch")){params.contentType="application/json";params.data=JSON.stringify(options.attrs||model.toJSON(options))}if(options.emulateJSON){params.contentType="application/x-www-form-urlencoded";params.data=params.data?{model:params.data}:{}}if(options.emulateHTTP&&(type==="PUT"||type==="DELETE"||type==="PATCH")){params.type="POST";if(options.emulateJSON)params.data._method=type;var beforeSend=options.beforeSend;options.beforeSend=function(xhr){xhr.setRequestHeader("X-HTTP-Method-Override",type);if(beforeSend)return beforeSend.apply(this,arguments)}}if(params.type!=="GET"&&!options.emulateJSON){params.processData=false}if(params.type==="PATCH"&&window.ActiveXObject&&!(window.external&&window.external.msActiveXFilteringEnabled)){params.xhr=function(){return new ActiveXObject("Microsoft.XMLHTTP")}}var xhr=options.xhr=Backbone.ajax(_.extend(params,options));model.trigger("request",model,xhr,options);return xhr};var methodMap={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};Backbone.ajax=function(){return Backbone.$.ajax.apply(Backbone.$,arguments)};var Router=Backbone.Router=function(options){options||(options={});if(options.routes)this.routes=options.routes;this._bindRoutes();this.initialize.apply(this,arguments)};var optionalParam=/\((.*?)\)/g;var namedParam=/(\(\?)?:\w+/g;var splatParam=/\*\w+/g;var escapeRegExp=/[\-{}\[\]+?.,\\\^$|#\s]/g;_.extend(Router.prototype,Events,{initialize:function(){},route:function(route,name,callback){if(!_.isRegExp(route))route=this._routeToRegExp(route);if(_.isFunction(name)){callback=name;name=""}if(!callback)callback=this[name];var router=this;Backbone.history.route(route,function(fragment){var args=router._extractParameters(route,fragment);callback&&callback.apply(router,args);router.trigger.apply(router,["route:"+name].concat(args));router.trigger("route",name,args);Backbone.history.trigger("route",router,name,args)});return this},navigate:function(fragment,options){Backbone.history.navigate(fragment,options);return this},_bindRoutes:function(){if(!this.routes)return;this.routes=_.result(this,"routes");var route,routes=_.keys(this.routes);while((route=routes.pop())!=null){this.route(route,this.routes[route])}},_routeToRegExp:function(route){route=route.replace(escapeRegExp,"\\$&").replace(optionalParam,"(?:$1)?").replace(namedParam,function(match,optional){return optional?match:"([^/]+)"}).replace(splatParam,"(.*?)");return new RegExp("^"+route+"$")},_extractParameters:function(route,fragment){var params=route.exec(fragment).slice(1);return _.map(params,function(param){return param?decodeURIComponent(param):null})}});var History=Backbone.History=function(){this.handlers=[];_.bindAll(this,"checkUrl");if(typeof window!=="undefined"){this.location=window.location;this.history=window.history}};var routeStripper=/^[#\/]|\s+$/g;var rootStripper=/^\/+|\/+$/g;var isExplorer=/msie [\w.]+/;var trailingSlash=/\/$/;History.started=false;_.extend(History.prototype,Events,{interval:50,getHash:function(window){var match=(window||this).location.href.match(/#(.*)$/);return match?match[1]:""},getFragment:function(fragment,forcePushState){if(fragment==null){if(this._hasPushState||!this._wantsHashChange||forcePushState){fragment=this.location.pathname;var root=this.root.replace(trailingSlash,"");if(!fragment.indexOf(root))fragment=fragment.substr(root.length)}else{fragment=this.getHash()}}return fragment.replace(routeStripper,"")},start:function(options){if(History.started)throw new Error("Backbone.history has already been started");History.started=true;this.options=_.extend({},{root:"/"},this.options,options);this.root=this.options.root;this._wantsHashChange=this.options.hashChange!==false;this._wantsPushState=!!this.options.pushState;this._hasPushState=!!(this.options.pushState&&this.history&&this.history.pushState);var fragment=this.getFragment();var docMode=document.documentMode;var oldIE=isExplorer.exec(navigator.userAgent.toLowerCase())&&(!docMode||docMode<=7);this.root=("/"+this.root+"/").replace(rootStripper,"/");if(oldIE&&this._wantsHashChange){this.iframe=Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow;this.navigate(fragment)}if(this._hasPushState){Backbone.$(window).on("popstate",this.checkUrl)}else if(this._wantsHashChange&&"onhashchange"in window&&!oldIE){Backbone.$(window).on("hashchange",this.checkUrl)}else if(this._wantsHashChange){this._checkUrlInterval=setInterval(this.checkUrl,this.interval)}this.fragment=fragment;var loc=this.location;var atRoot=loc.pathname.replace(/[^\/]$/,"$&/")===this.root;if(this._wantsHashChange&&this._wantsPushState&&!this._hasPushState&&!atRoot){this.fragment=this.getFragment(null,true);this.location.replace(this.root+this.location.search+"#"+this.fragment);return true}else if(this._wantsPushState&&this._hasPushState&&atRoot&&loc.hash){this.fragment=this.getHash().replace(routeStripper,"");this.history.replaceState({},document.title,this.root+this.fragment+loc.search)}if(!this.options.silent)return this.loadUrl()},stop:function(){Backbone.$(window).off("popstate",this.checkUrl).off("hashchange",this.checkUrl);clearInterval(this._checkUrlInterval);History.started=false},route:function(route,callback){this.handlers.unshift({route:route,callback:callback})},checkUrl:function(e){var current=this.getFragment();if(current===this.fragment&&this.iframe){current=this.getFragment(this.getHash(this.iframe))}if(current===this.fragment)return false;if(this.iframe)this.navigate(current);this.loadUrl()||this.loadUrl(this.getHash())},loadUrl:function(fragmentOverride){var fragment=this.fragment=this.getFragment(fragmentOverride);var matched=_.any(this.handlers,function(handler){if(handler.route.test(fragment)){handler.callback(fragment);return true}});return matched},navigate:function(fragment,options){if(!History.started)return false;if(!options||options===true)options={trigger:options};fragment=this.getFragment(fragment||"");if(this.fragment===fragment)return;this.fragment=fragment;var url=this.root+fragment;if(this._hasPushState){this.history[options.replace?"replaceState":"pushState"]({},document.title,url)}else if(this._wantsHashChange){this._updateHash(this.location,fragment,options.replace);if(this.iframe&&fragment!==this.getFragment(this.getHash(this.iframe))){if(!options.replace)this.iframe.document.open().close();this._updateHash(this.iframe.location,fragment,options.replace)}}else{return this.location.assign(url)}if(options.trigger)this.loadUrl(fragment)},_updateHash:function(location,fragment,replace){if(replace){var href=location.href.replace(/(javascript:|#).*$/,"");location.replace(href+"#"+fragment)}else{location.hash="#"+fragment}}});Backbone.history=new History;var extend=function(protoProps,staticProps){var parent=this;var child;if(protoProps&&_.has(protoProps,"constructor")){child=protoProps.constructor}else{child=function(){return parent.apply(this,arguments)}}_.extend(child,parent,staticProps);var Surrogate=function(){this.constructor=child};Surrogate.prototype=parent.prototype;child.prototype=new Surrogate;if(protoProps)_.extend(child.prototype,protoProps);child.__super__=parent.prototype;return child};Model.extend=Collection.extend=Router.extend=View.extend=History.extend=extend;var urlError=function(){throw new Error('A "url" property or function must be specified')};var wrapError=function(model,options){var error=options.error;options.error=function(resp){if(error)error(model,resp,options);model.trigger("error",model,resp,options)}}}).call(this);
/*
//@ sourceMappingURL=backbone-min.map
*/;
define("Backbone", function(){});

/*

Copyright (C) 2011 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

// lib/handlebars/browser-prefix.js
var Handlebars = {};

(function(Handlebars, undefined) {
;
// lib/handlebars/base.js

Handlebars.VERSION = "1.0.0";
Handlebars.COMPILER_REVISION = 4;

Handlebars.REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};

Handlebars.helpers  = {};
Handlebars.partials = {};

var toString = Object.prototype.toString,
    functionType = '[object Function]',
    objectType = '[object Object]';

Handlebars.registerHelper = function(name, fn, inverse) {
  if (toString.call(name) === objectType) {
    if (inverse || fn) { throw new Handlebars.Exception('Arg not supported with multiple helpers'); }
    Handlebars.Utils.extend(this.helpers, name);
  } else {
    if (inverse) { fn.not = inverse; }
    this.helpers[name] = fn;
  }
};

Handlebars.registerPartial = function(name, str) {
  if (toString.call(name) === objectType) {
    Handlebars.Utils.extend(this.partials,  name);
  } else {
    this.partials[name] = str;
  }
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Missing helper: '" + arg + "'");
  }
});

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;

  var type = toString.call(context);

  if(type === functionType) { context = context.call(this); }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      return Handlebars.helpers.each(context, options);
    } else {
      return inverse(this);
    }
  } else {
    return fn(context);
  }
});

Handlebars.K = function() {};

Handlebars.createFrame = Object.create || function(object) {
  Handlebars.K.prototype = object;
  var obj = new Handlebars.K();
  Handlebars.K.prototype = null;
  return obj;
};

Handlebars.logger = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, level: 3,

  methodMap: {0: 'debug', 1: 'info', 2: 'warn', 3: 'error'},

  // can be overridden in the host environment
  log: function(level, obj) {
    if (Handlebars.logger.level <= level) {
      var method = Handlebars.logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};

Handlebars.log = function(level, obj) { Handlebars.logger.log(level, obj); };

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var i = 0, ret = "", data;

  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if(context && typeof context === 'object') {
    if(context instanceof Array){
      for(var j = context.length; i<j; i++) {
        if (data) { data.index = i; }
        ret = ret + fn(context[i], { data: data });
      }
    } else {
      for(var key in context) {
        if(context.hasOwnProperty(key)) {
          if(data) { data.key = key; }
          ret = ret + fn(context[key], {data: data});
          i++;
        }
      }
    }
  }

  if(i === 0){
    ret = inverse(this);
  }

  return ret;
});

Handlebars.registerHelper('if', function(conditional, options) {
  var type = toString.call(conditional);
  if(type === functionType) { conditional = conditional.call(this); }

  if(!conditional || Handlebars.Utils.isEmpty(conditional)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(conditional, options) {
  return Handlebars.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn});
});

Handlebars.registerHelper('with', function(context, options) {
  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (!Handlebars.Utils.isEmpty(context)) return options.fn(context);
});

Handlebars.registerHelper('log', function(context, options) {
  var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
  Handlebars.log(level, context);
});
;
// lib/handlebars/compiler/parser.js
/* Jison generated parser */
var handlebars = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"root":3,"program":4,"EOF":5,"simpleInverse":6,"statements":7,"statement":8,"openInverse":9,"closeBlock":10,"openBlock":11,"mustache":12,"partial":13,"CONTENT":14,"COMMENT":15,"OPEN_BLOCK":16,"inMustache":17,"CLOSE":18,"OPEN_INVERSE":19,"OPEN_ENDBLOCK":20,"path":21,"OPEN":22,"OPEN_UNESCAPED":23,"CLOSE_UNESCAPED":24,"OPEN_PARTIAL":25,"partialName":26,"params":27,"hash":28,"dataName":29,"param":30,"STRING":31,"INTEGER":32,"BOOLEAN":33,"hashSegments":34,"hashSegment":35,"ID":36,"EQUALS":37,"DATA":38,"pathSegments":39,"SEP":40,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"CLOSE_UNESCAPED",25:"OPEN_PARTIAL",31:"STRING",32:"INTEGER",33:"BOOLEAN",36:"ID",37:"EQUALS",38:"DATA",40:"SEP"},
productions_: [0,[3,2],[4,2],[4,3],[4,2],[4,1],[4,1],[4,0],[7,1],[7,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,3],[13,4],[6,2],[17,3],[17,2],[17,2],[17,1],[17,1],[27,2],[27,1],[30,1],[30,1],[30,1],[30,1],[30,1],[28,1],[34,2],[34,1],[35,3],[35,3],[35,3],[35,3],[35,3],[26,1],[26,1],[26,1],[29,2],[21,1],[39,3],[39,1]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1: return $$[$0-1]; 
break;
case 2: this.$ = new yy.ProgramNode([], $$[$0]); 
break;
case 3: this.$ = new yy.ProgramNode($$[$0-2], $$[$0]); 
break;
case 4: this.$ = new yy.ProgramNode($$[$0-1], []); 
break;
case 5: this.$ = new yy.ProgramNode($$[$0]); 
break;
case 6: this.$ = new yy.ProgramNode([], []); 
break;
case 7: this.$ = new yy.ProgramNode([]); 
break;
case 8: this.$ = [$$[$0]]; 
break;
case 9: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 10: this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0]); 
break;
case 11: this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0]); 
break;
case 12: this.$ = $$[$0]; 
break;
case 13: this.$ = $$[$0]; 
break;
case 14: this.$ = new yy.ContentNode($$[$0]); 
break;
case 15: this.$ = new yy.CommentNode($$[$0]); 
break;
case 16: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1]); 
break;
case 17: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1]); 
break;
case 18: this.$ = $$[$0-1]; 
break;
case 19:
    // Parsing out the '&' escape token at this level saves ~500 bytes after min due to the removal of one parser node.
    this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], $$[$0-2][2] === '&');
  
break;
case 20: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], true); 
break;
case 21: this.$ = new yy.PartialNode($$[$0-1]); 
break;
case 22: this.$ = new yy.PartialNode($$[$0-2], $$[$0-1]); 
break;
case 23: 
break;
case 24: this.$ = [[$$[$0-2]].concat($$[$0-1]), $$[$0]]; 
break;
case 25: this.$ = [[$$[$0-1]].concat($$[$0]), null]; 
break;
case 26: this.$ = [[$$[$0-1]], $$[$0]]; 
break;
case 27: this.$ = [[$$[$0]], null]; 
break;
case 28: this.$ = [[$$[$0]], null]; 
break;
case 29: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 30: this.$ = [$$[$0]]; 
break;
case 31: this.$ = $$[$0]; 
break;
case 32: this.$ = new yy.StringNode($$[$0]); 
break;
case 33: this.$ = new yy.IntegerNode($$[$0]); 
break;
case 34: this.$ = new yy.BooleanNode($$[$0]); 
break;
case 35: this.$ = $$[$0]; 
break;
case 36: this.$ = new yy.HashNode($$[$0]); 
break;
case 37: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 38: this.$ = [$$[$0]]; 
break;
case 39: this.$ = [$$[$0-2], $$[$0]]; 
break;
case 40: this.$ = [$$[$0-2], new yy.StringNode($$[$0])]; 
break;
case 41: this.$ = [$$[$0-2], new yy.IntegerNode($$[$0])]; 
break;
case 42: this.$ = [$$[$0-2], new yy.BooleanNode($$[$0])]; 
break;
case 43: this.$ = [$$[$0-2], $$[$0]]; 
break;
case 44: this.$ = new yy.PartialNameNode($$[$0]); 
break;
case 45: this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0])); 
break;
case 46: this.$ = new yy.PartialNameNode(new yy.IntegerNode($$[$0])); 
break;
case 47: this.$ = new yy.DataNode($$[$0]); 
break;
case 48: this.$ = new yy.IdNode($$[$0]); 
break;
case 49: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
break;
case 50: this.$ = [{part: $$[$0]}]; 
break;
}
},
table: [{3:1,4:2,5:[2,7],6:3,7:4,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,5],22:[1,14],23:[1,15],25:[1,16]},{1:[3]},{5:[1,17]},{5:[2,6],7:18,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,19],20:[2,6],22:[1,14],23:[1,15],25:[1,16]},{5:[2,5],6:20,8:21,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,5],20:[2,5],22:[1,14],23:[1,15],25:[1,16]},{17:23,18:[1,22],21:24,29:25,36:[1,28],38:[1,27],39:26},{5:[2,8],14:[2,8],15:[2,8],16:[2,8],19:[2,8],20:[2,8],22:[2,8],23:[2,8],25:[2,8]},{4:29,6:3,7:4,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,5],20:[2,7],22:[1,14],23:[1,15],25:[1,16]},{4:30,6:3,7:4,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,5],20:[2,7],22:[1,14],23:[1,15],25:[1,16]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],25:[2,12]},{5:[2,13],14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],25:[2,13]},{5:[2,14],14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],25:[2,14]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],25:[2,15]},{17:31,21:24,29:25,36:[1,28],38:[1,27],39:26},{17:32,21:24,29:25,36:[1,28],38:[1,27],39:26},{17:33,21:24,29:25,36:[1,28],38:[1,27],39:26},{21:35,26:34,31:[1,36],32:[1,37],36:[1,28],39:26},{1:[2,1]},{5:[2,2],8:21,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,19],20:[2,2],22:[1,14],23:[1,15],25:[1,16]},{17:23,21:24,29:25,36:[1,28],38:[1,27],39:26},{5:[2,4],7:38,8:6,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,19],20:[2,4],22:[1,14],23:[1,15],25:[1,16]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],25:[2,9]},{5:[2,23],14:[2,23],15:[2,23],16:[2,23],19:[2,23],20:[2,23],22:[2,23],23:[2,23],25:[2,23]},{18:[1,39]},{18:[2,27],21:44,24:[2,27],27:40,28:41,29:48,30:42,31:[1,45],32:[1,46],33:[1,47],34:43,35:49,36:[1,50],38:[1,27],39:26},{18:[2,28],24:[2,28]},{18:[2,48],24:[2,48],31:[2,48],32:[2,48],33:[2,48],36:[2,48],38:[2,48],40:[1,51]},{21:52,36:[1,28],39:26},{18:[2,50],24:[2,50],31:[2,50],32:[2,50],33:[2,50],36:[2,50],38:[2,50],40:[2,50]},{10:53,20:[1,54]},{10:55,20:[1,54]},{18:[1,56]},{18:[1,57]},{24:[1,58]},{18:[1,59],21:60,36:[1,28],39:26},{18:[2,44],36:[2,44]},{18:[2,45],36:[2,45]},{18:[2,46],36:[2,46]},{5:[2,3],8:21,9:7,11:8,12:9,13:10,14:[1,11],15:[1,12],16:[1,13],19:[1,19],20:[2,3],22:[1,14],23:[1,15],25:[1,16]},{14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],25:[2,17]},{18:[2,25],21:44,24:[2,25],28:61,29:48,30:62,31:[1,45],32:[1,46],33:[1,47],34:43,35:49,36:[1,50],38:[1,27],39:26},{18:[2,26],24:[2,26]},{18:[2,30],24:[2,30],31:[2,30],32:[2,30],33:[2,30],36:[2,30],38:[2,30]},{18:[2,36],24:[2,36],35:63,36:[1,64]},{18:[2,31],24:[2,31],31:[2,31],32:[2,31],33:[2,31],36:[2,31],38:[2,31]},{18:[2,32],24:[2,32],31:[2,32],32:[2,32],33:[2,32],36:[2,32],38:[2,32]},{18:[2,33],24:[2,33],31:[2,33],32:[2,33],33:[2,33],36:[2,33],38:[2,33]},{18:[2,34],24:[2,34],31:[2,34],32:[2,34],33:[2,34],36:[2,34],38:[2,34]},{18:[2,35],24:[2,35],31:[2,35],32:[2,35],33:[2,35],36:[2,35],38:[2,35]},{18:[2,38],24:[2,38],36:[2,38]},{18:[2,50],24:[2,50],31:[2,50],32:[2,50],33:[2,50],36:[2,50],37:[1,65],38:[2,50],40:[2,50]},{36:[1,66]},{18:[2,47],24:[2,47],31:[2,47],32:[2,47],33:[2,47],36:[2,47],38:[2,47]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],25:[2,10]},{21:67,36:[1,28],39:26},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],25:[2,11]},{14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],25:[2,16]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],25:[2,19]},{5:[2,20],14:[2,20],15:[2,20],16:[2,20],19:[2,20],20:[2,20],22:[2,20],23:[2,20],25:[2,20]},{5:[2,21],14:[2,21],15:[2,21],16:[2,21],19:[2,21],20:[2,21],22:[2,21],23:[2,21],25:[2,21]},{18:[1,68]},{18:[2,24],24:[2,24]},{18:[2,29],24:[2,29],31:[2,29],32:[2,29],33:[2,29],36:[2,29],38:[2,29]},{18:[2,37],24:[2,37],36:[2,37]},{37:[1,65]},{21:69,29:73,31:[1,70],32:[1,71],33:[1,72],36:[1,28],38:[1,27],39:26},{18:[2,49],24:[2,49],31:[2,49],32:[2,49],33:[2,49],36:[2,49],38:[2,49],40:[2,49]},{18:[1,74]},{5:[2,22],14:[2,22],15:[2,22],16:[2,22],19:[2,22],20:[2,22],22:[2,22],23:[2,22],25:[2,22]},{18:[2,39],24:[2,39],36:[2,39]},{18:[2,40],24:[2,40],36:[2,40]},{18:[2,41],24:[2,41],36:[2,41]},{18:[2,42],24:[2,42],36:[2,42]},{18:[2,43],24:[2,43],36:[2,43]},{5:[2,18],14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],25:[2,18]}],
defaultActions: {17:[2,1]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == "undefined")
        this.lexer.yylloc = {};
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === "function")
        this.parseError = this.yy.parseError;
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || 1;
        if (typeof token !== "number") {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == "undefined") {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
        if (typeof action === "undefined" || !action.length || !action[0]) {
            var errStr = "";
            if (!recovering) {
                expected = [];
                for (p in table[state])
                    if (this.terminals_[p] && p > 2) {
                        expected.push("'" + this.terminals_[p] + "'");
                    }
                if (this.lexer.showPosition) {
                    errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                } else {
                    errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                }
                this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
            }
        }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0)
                    recovering--;
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
            if (ranges) {
                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
            }
            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
            if (typeof r !== "undefined") {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}
};
/* Jison generated lexer */
var lexer = (function(){
var lexer = ({EOF:1,
parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
        if (this.options.ranges) this.yylloc.range = [0,0];
        this.offset = 0;
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) this.yylloc.range[1]++;

        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length-1);
        this.matched = this.matched.substr(0, this.matched.length-1);

        if (lines.length-1) this.yylineno -= lines.length-1;
        var r = this.yylloc.range;

        this.yylloc = {first_line: this.yylloc.first_line,
          last_line: this.yylineno+1,
          first_column: this.yylloc.first_column,
          last_column: lines ?
              (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
              this.yylloc.first_column - len
          };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
less:function (n) {
        this.unput(this.match.slice(n));
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            tempMatch,
            index,
            col,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i=0;i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (!this.options.flex) break;
            }
        }
        if (match) {
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) this.yylineno += lines.length;
            this.yylloc = {first_line: this.yylloc.last_line,
                           last_line: this.yylineno+1,
                           first_column: this.yylloc.last_column,
                           last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
                this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
            if (this.done && this._input) this.done = false;
            if (token) return token;
            else return;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function lex() {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    },
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },
popState:function popState() {
        return this.conditionStack.pop();
    },
_currentRules:function _currentRules() {
        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
    },
topState:function () {
        return this.conditionStack[this.conditionStack.length-2];
    },
pushState:function begin(condition) {
        this.begin(condition);
    }});
lexer.options = {};
lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {

var YYSTATE=YY_START
switch($avoiding_name_collisions) {
case 0: yy_.yytext = "\\"; return 14; 
break;
case 1:
                                   if(yy_.yytext.slice(-1) !== "\\") this.begin("mu");
                                   if(yy_.yytext.slice(-1) === "\\") yy_.yytext = yy_.yytext.substr(0,yy_.yyleng-1), this.begin("emu");
                                   if(yy_.yytext) return 14;
                                 
break;
case 2: return 14; 
break;
case 3:
                                   if(yy_.yytext.slice(-1) !== "\\") this.popState();
                                   if(yy_.yytext.slice(-1) === "\\") yy_.yytext = yy_.yytext.substr(0,yy_.yyleng-1);
                                   return 14;
                                 
break;
case 4: yy_.yytext = yy_.yytext.substr(0, yy_.yyleng-4); this.popState(); return 15; 
break;
case 5: return 25; 
break;
case 6: return 16; 
break;
case 7: return 20; 
break;
case 8: return 19; 
break;
case 9: return 19; 
break;
case 10: return 23; 
break;
case 11: return 22; 
break;
case 12: this.popState(); this.begin('com'); 
break;
case 13: yy_.yytext = yy_.yytext.substr(3,yy_.yyleng-5); this.popState(); return 15; 
break;
case 14: return 22; 
break;
case 15: return 37; 
break;
case 16: return 36; 
break;
case 17: return 36; 
break;
case 18: return 40; 
break;
case 19: /*ignore whitespace*/ 
break;
case 20: this.popState(); return 24; 
break;
case 21: this.popState(); return 18; 
break;
case 22: yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2).replace(/\\"/g,'"'); return 31; 
break;
case 23: yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2).replace(/\\'/g,"'"); return 31; 
break;
case 24: return 38; 
break;
case 25: return 33; 
break;
case 26: return 33; 
break;
case 27: return 32; 
break;
case 28: return 36; 
break;
case 29: yy_.yytext = yy_.yytext.substr(1, yy_.yyleng-2); return 36; 
break;
case 30: return 'INVALID'; 
break;
case 31: return 5; 
break;
}
};
lexer.rules = [/^(?:\\\\(?=(\{\{)))/,/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|$)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\{\{>)/,/^(?:\{\{#)/,/^(?:\{\{\/)/,/^(?:\{\{\^)/,/^(?:\{\{\s*else\b)/,/^(?:\{\{\{)/,/^(?:\{\{&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{)/,/^(?:=)/,/^(?:\.(?=[}\/ ]))/,/^(?:\.\.)/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}\}\})/,/^(?:\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=[}\s]))/,/^(?:false(?=[}\s]))/,/^(?:-?[0-9]+(?=[}\s]))/,/^(?:[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.]))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
lexer.conditions = {"mu":{"rules":[5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],"inclusive":false},"emu":{"rules":[3],"inclusive":false},"com":{"rules":[4],"inclusive":false},"INITIAL":{"rules":[0,1,2,31],"inclusive":true}};
return lexer;})()
parser.lexer = lexer;
function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();;
// lib/handlebars/compiler/base.js

Handlebars.Parser = handlebars;

Handlebars.parse = function(input) {

  // Just return if an already-compile AST was passed in.
  if(input.constructor === Handlebars.AST.ProgramNode) { return input; }

  Handlebars.Parser.yy = Handlebars.AST;
  return Handlebars.Parser.parse(input);
};
;
// lib/handlebars/compiler/ast.js
Handlebars.AST = {};

Handlebars.AST.ProgramNode = function(statements, inverse) {
  this.type = "program";
  this.statements = statements;
  if(inverse) { this.inverse = new Handlebars.AST.ProgramNode(inverse); }
};

Handlebars.AST.MustacheNode = function(rawParams, hash, unescaped) {
  this.type = "mustache";
  this.escaped = !unescaped;
  this.hash = hash;

  var id = this.id = rawParams[0];
  var params = this.params = rawParams.slice(1);

  // a mustache is an eligible helper if:
  // * its id is simple (a single part, not `this` or `..`)
  var eligibleHelper = this.eligibleHelper = id.isSimple;

  // a mustache is definitely a helper if:
  // * it is an eligible helper, and
  // * it has at least one parameter or hash segment
  this.isHelper = eligibleHelper && (params.length || hash);

  // if a mustache is an eligible helper but not a definite
  // helper, it is ambiguous, and will be resolved in a later
  // pass or at runtime.
};

Handlebars.AST.PartialNode = function(partialName, context) {
  this.type         = "partial";
  this.partialName  = partialName;
  this.context      = context;
};

Handlebars.AST.BlockNode = function(mustache, program, inverse, close) {
  var verifyMatch = function(open, close) {
    if(open.original !== close.original) {
      throw new Handlebars.Exception(open.original + " doesn't match " + close.original);
    }
  };

  verifyMatch(mustache.id, close);
  this.type = "block";
  this.mustache = mustache;
  this.program  = program;
  this.inverse  = inverse;

  if (this.inverse && !this.program) {
    this.isInverse = true;
  }
};

Handlebars.AST.ContentNode = function(string) {
  this.type = "content";
  this.string = string;
};

Handlebars.AST.HashNode = function(pairs) {
  this.type = "hash";
  this.pairs = pairs;
};

Handlebars.AST.IdNode = function(parts) {
  this.type = "ID";

  var original = "",
      dig = [],
      depth = 0;

  for(var i=0,l=parts.length; i<l; i++) {
    var part = parts[i].part;
    original += (parts[i].separator || '') + part;

    if (part === ".." || part === "." || part === "this") {
      if (dig.length > 0) { throw new Handlebars.Exception("Invalid path: " + original); }
      else if (part === "..") { depth++; }
      else { this.isScoped = true; }
    }
    else { dig.push(part); }
  }

  this.original = original;
  this.parts    = dig;
  this.string   = dig.join('.');
  this.depth    = depth;

  // an ID is simple if it only has one part, and that part is not
  // `..` or `this`.
  this.isSimple = parts.length === 1 && !this.isScoped && depth === 0;

  this.stringModeValue = this.string;
};

Handlebars.AST.PartialNameNode = function(name) {
  this.type = "PARTIAL_NAME";
  this.name = name.original;
};

Handlebars.AST.DataNode = function(id) {
  this.type = "DATA";
  this.id = id;
};

Handlebars.AST.StringNode = function(string) {
  this.type = "STRING";
  this.original =
    this.string =
    this.stringModeValue = string;
};

Handlebars.AST.IntegerNode = function(integer) {
  this.type = "INTEGER";
  this.original =
    this.integer = integer;
  this.stringModeValue = Number(integer);
};

Handlebars.AST.BooleanNode = function(bool) {
  this.type = "BOOLEAN";
  this.bool = bool;
  this.stringModeValue = bool === "true";
};

Handlebars.AST.CommentNode = function(comment) {
  this.type = "comment";
  this.comment = comment;
};
;
// lib/handlebars/utils.js

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
};
Handlebars.Exception.prototype = new Error();

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

var escapeChar = function(chr) {
  return escape[chr] || "&amp;";
};

Handlebars.Utils = {
  extend: function(obj, value) {
    for(var key in value) {
      if(value.hasOwnProperty(key)) {
        obj[key] = value[key];
      }
    }
  },

  escapeExpression: function(string) {
    // don't escape SafeStrings, since they're already safe
    if (string instanceof Handlebars.SafeString) {
      return string.toString();
    } else if (string == null || string === false) {
      return "";
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = string.toString();

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  },

  isEmpty: function(value) {
    if (!value && value !== 0) {
      return true;
    } else if(toString.call(value) === "[object Array]" && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }
};
;
// lib/handlebars/compiler/compiler.js

/*jshint eqnull:true*/
var Compiler = Handlebars.Compiler = function() {};
var JavaScriptCompiler = Handlebars.JavaScriptCompiler = function() {};

// the foundHelper register will disambiguate helper lookup from finding a
// function in a context. This is necessary for mustache compatibility, which
// requires that context functions in blocks are evaluated by blockHelperMissing,
// and then proceed as if the resulting value was provided to blockHelperMissing.

Compiler.prototype = {
  compiler: Compiler,

  disassemble: function() {
    var opcodes = this.opcodes, opcode, out = [], params, param;

    for (var i=0, l=opcodes.length; i<l; i++) {
      opcode = opcodes[i];

      if (opcode.opcode === 'DECLARE') {
        out.push("DECLARE " + opcode.name + "=" + opcode.value);
      } else {
        params = [];
        for (var j=0; j<opcode.args.length; j++) {
          param = opcode.args[j];
          if (typeof param === "string") {
            param = "\"" + param.replace("\n", "\\n") + "\"";
          }
          params.push(param);
        }
        out.push(opcode.opcode + " " + params.join(" "));
      }
    }

    return out.join("\n");
  },
  equals: function(other) {
    var len = this.opcodes.length;
    if (other.opcodes.length !== len) {
      return false;
    }

    for (var i = 0; i < len; i++) {
      var opcode = this.opcodes[i],
          otherOpcode = other.opcodes[i];
      if (opcode.opcode !== otherOpcode.opcode || opcode.args.length !== otherOpcode.args.length) {
        return false;
      }
      for (var j = 0; j < opcode.args.length; j++) {
        if (opcode.args[j] !== otherOpcode.args[j]) {
          return false;
        }
      }
    }

    len = this.children.length;
    if (other.children.length !== len) {
      return false;
    }
    for (i = 0; i < len; i++) {
      if (!this.children[i].equals(other.children[i])) {
        return false;
      }
    }

    return true;
  },

  guid: 0,

  compile: function(program, options) {
    this.children = [];
    this.depths = {list: []};
    this.options = options;

    // These changes will propagate to the other compiler components
    var knownHelpers = this.options.knownHelpers;
    this.options.knownHelpers = {
      'helperMissing': true,
      'blockHelperMissing': true,
      'each': true,
      'if': true,
      'unless': true,
      'with': true,
      'log': true
    };
    if (knownHelpers) {
      for (var name in knownHelpers) {
        this.options.knownHelpers[name] = knownHelpers[name];
      }
    }

    return this.program(program);
  },

  accept: function(node) {
    return this[node.type](node);
  },

  program: function(program) {
    var statements = program.statements, statement;
    this.opcodes = [];

    for(var i=0, l=statements.length; i<l; i++) {
      statement = statements[i];
      this[statement.type](statement);
    }
    this.isSimple = l === 1;

    this.depths.list = this.depths.list.sort(function(a, b) {
      return a - b;
    });

    return this;
  },

  compileProgram: function(program) {
    var result = new this.compiler().compile(program, this.options);
    var guid = this.guid++, depth;

    this.usePartial = this.usePartial || result.usePartial;

    this.children[guid] = result;

    for(var i=0, l=result.depths.list.length; i<l; i++) {
      depth = result.depths.list[i];

      if(depth < 2) { continue; }
      else { this.addDepth(depth - 1); }
    }

    return guid;
  },

  block: function(block) {
    var mustache = block.mustache,
        program = block.program,
        inverse = block.inverse;

    if (program) {
      program = this.compileProgram(program);
    }

    if (inverse) {
      inverse = this.compileProgram(inverse);
    }

    var type = this.classifyMustache(mustache);

    if (type === "helper") {
      this.helperMustache(mustache, program, inverse);
    } else if (type === "simple") {
      this.simpleMustache(mustache);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue');
    } else {
      this.ambiguousMustache(mustache, program, inverse);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('ambiguousBlockValue');
    }

    this.opcode('append');
  },

  hash: function(hash) {
    var pairs = hash.pairs, pair, val;

    this.opcode('pushHash');

    for(var i=0, l=pairs.length; i<l; i++) {
      pair = pairs[i];
      val  = pair[1];

      if (this.options.stringParams) {
        if(val.depth) {
          this.addDepth(val.depth);
        }
        this.opcode('getContext', val.depth || 0);
        this.opcode('pushStringParam', val.stringModeValue, val.type);
      } else {
        this.accept(val);
      }

      this.opcode('assignToHash', pair[0]);
    }
    this.opcode('popHash');
  },

  partial: function(partial) {
    var partialName = partial.partialName;
    this.usePartial = true;

    if(partial.context) {
      this.ID(partial.context);
    } else {
      this.opcode('push', 'depth0');
    }

    this.opcode('invokePartial', partialName.name);
    this.opcode('append');
  },

  content: function(content) {
    this.opcode('appendContent', content.string);
  },

  mustache: function(mustache) {
    var options = this.options;
    var type = this.classifyMustache(mustache);

    if (type === "simple") {
      this.simpleMustache(mustache);
    } else if (type === "helper") {
      this.helperMustache(mustache);
    } else {
      this.ambiguousMustache(mustache);
    }

    if(mustache.escaped && !options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },

  ambiguousMustache: function(mustache, program, inverse) {
    var id = mustache.id,
        name = id.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', id.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleMustache: function(mustache) {
    var id = mustache.id;

    if (id.type === 'DATA') {
      this.DATA(id);
    } else if (id.parts.length) {
      this.ID(id);
    } else {
      // Simplified ID for `this`
      this.addDepth(id.depth);
      this.opcode('getContext', id.depth);
      this.opcode('pushContext');
    }

    this.opcode('resolvePossibleLambda');
  },

  helperMustache: function(mustache, program, inverse) {
    var params = this.setupFullMustacheParams(mustache, program, inverse),
        name = mustache.id.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new Error("You specified knownHelpersOnly, but used the unknown helper " + name);
    } else {
      this.opcode('invokeHelper', params.length, name);
    }
  },

  ID: function(id) {
    this.addDepth(id.depth);
    this.opcode('getContext', id.depth);

    var name = id.parts[0];
    if (!name) {
      this.opcode('pushContext');
    } else {
      this.opcode('lookupOnContext', id.parts[0]);
    }

    for(var i=1, l=id.parts.length; i<l; i++) {
      this.opcode('lookup', id.parts[i]);
    }
  },

  DATA: function(data) {
    this.options.data = true;
    if (data.id.isScoped || data.id.depth) {
      throw new Handlebars.Exception('Scoped data references are not supported: ' + data.original);
    }

    this.opcode('lookupData');
    var parts = data.id.parts;
    for(var i=0, l=parts.length; i<l; i++) {
      this.opcode('lookup', parts[i]);
    }
  },

  STRING: function(string) {
    this.opcode('pushString', string.string);
  },

  INTEGER: function(integer) {
    this.opcode('pushLiteral', integer.integer);
  },

  BOOLEAN: function(bool) {
    this.opcode('pushLiteral', bool.bool);
  },

  comment: function() {},

  // HELPERS
  opcode: function(name) {
    this.opcodes.push({ opcode: name, args: [].slice.call(arguments, 1) });
  },

  declare: function(name, value) {
    this.opcodes.push({ opcode: 'DECLARE', name: name, value: value });
  },

  addDepth: function(depth) {
    if(isNaN(depth)) { throw new Error("EWOT"); }
    if(depth === 0) { return; }

    if(!this.depths[depth]) {
      this.depths[depth] = true;
      this.depths.list.push(depth);
    }
  },

  classifyMustache: function(mustache) {
    var isHelper   = mustache.isHelper;
    var isEligible = mustache.eligibleHelper;
    var options    = this.options;

    // if ambiguous, we can possibly resolve the ambiguity now
    if (isEligible && !isHelper) {
      var name = mustache.id.parts[0];

      if (options.knownHelpers[name]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) { return "helper"; }
    else if (isEligible) { return "ambiguous"; }
    else { return "simple"; }
  },

  pushParams: function(params) {
    var i = params.length, param;

    while(i--) {
      param = params[i];

      if(this.options.stringParams) {
        if(param.depth) {
          this.addDepth(param.depth);
        }

        this.opcode('getContext', param.depth || 0);
        this.opcode('pushStringParam', param.stringModeValue, param.type);
      } else {
        this[param.type](param);
      }
    }
  },

  setupMustacheParams: function(mustache) {
    var params = mustache.params;
    this.pushParams(params);

    if(mustache.hash) {
      this.hash(mustache.hash);
    } else {
      this.opcode('emptyHash');
    }

    return params;
  },

  // this will replace setupMustacheParams when we're done
  setupFullMustacheParams: function(mustache, program, inverse) {
    var params = mustache.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if(mustache.hash) {
      this.hash(mustache.hash);
    } else {
      this.opcode('emptyHash');
    }

    return params;
  }
};

var Literal = function(value) {
  this.value = value;
};

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function(parent, name /* , type*/) {
    if (/^[0-9]+$/.test(name)) {
      return parent + "[" + name + "]";
    } else if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
      return parent + "." + name;
    }
    else {
      return parent + "['" + name + "']";
    }
  },

  appendToBuffer: function(string) {
    if (this.environment.isSimple) {
      return "return " + string + ";";
    } else {
      return {
        appendToBuffer: true,
        content: string,
        toString: function() { return "buffer += " + string + ";"; }
      };
    }
  },

  initializeBuffer: function() {
    return this.quotedString("");
  },

  namespace: "Handlebars",
  // END PUBLIC API

  compile: function(environment, options, context, asObject) {
    this.environment = environment;
    this.options = options || {};

    Handlebars.log(Handlebars.logger.DEBUG, this.environment.disassemble() + "\n\n");

    this.name = this.environment.name;
    this.isChild = !!context;
    this.context = context || {
      programs: [],
      environments: [],
      aliases: { }
    };

    this.preamble();

    this.stackSlot = 0;
    this.stackVars = [];
    this.registers = { list: [] };
    this.compileStack = [];
    this.inlineStack = [];

    this.compileChildren(environment, options);

    var opcodes = environment.opcodes, opcode;

    this.i = 0;

    for(l=opcodes.length; this.i<l; this.i++) {
      opcode = opcodes[this.i];

      if(opcode.opcode === 'DECLARE') {
        this[opcode.name] = opcode.value;
      } else {
        this[opcode.opcode].apply(this, opcode.args);
      }
    }

    return this.createFunctionContext(asObject);
  },

  nextOpcode: function() {
    var opcodes = this.environment.opcodes;
    return opcodes[this.i + 1];
  },

  eat: function() {
    this.i = this.i + 1;
  },

  preamble: function() {
    var out = [];

    if (!this.isChild) {
      var namespace = this.namespace;

      var copies = "helpers = this.merge(helpers, " + namespace + ".helpers);";
      if (this.environment.usePartial) { copies = copies + " partials = this.merge(partials, " + namespace + ".partials);"; }
      if (this.options.data) { copies = copies + " data = data || {};"; }
      out.push(copies);
    } else {
      out.push('');
    }

    if (!this.environment.isSimple) {
      out.push(", buffer = " + this.initializeBuffer());
    } else {
      out.push("");
    }

    // track the last context pushed into place to allow skipping the
    // getContext opcode when it would be a noop
    this.lastContext = 0;
    this.source = out;
  },

  createFunctionContext: function(asObject) {
    var locals = this.stackVars.concat(this.registers.list);

    if(locals.length > 0) {
      this.source[1] = this.source[1] + ", " + locals.join(", ");
    }

    // Generate minimizer alias mappings
    if (!this.isChild) {
      for (var alias in this.context.aliases) {
        if (this.context.aliases.hasOwnProperty(alias)) {
          this.source[1] = this.source[1] + ', ' + alias + '=' + this.context.aliases[alias];
        }
      }
    }

    if (this.source[1]) {
      this.source[1] = "var " + this.source[1].substring(2) + ";";
    }

    // Merge children
    if (!this.isChild) {
      this.source[1] += '\n' + this.context.programs.join('\n') + '\n';
    }

    if (!this.environment.isSimple) {
      this.source.push("return buffer;");
    }

    var params = this.isChild ? ["depth0", "data"] : ["Handlebars", "depth0", "helpers", "partials", "data"];

    for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
      params.push("depth" + this.environment.depths.list[i]);
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource();

    if (!this.isChild) {
      var revision = Handlebars.COMPILER_REVISION,
          versions = Handlebars.REVISION_CHANGES[revision];
      source = "this.compilerInfo = ["+revision+",'"+versions+"'];\n"+source;
    }

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      var functionSource = 'function ' + (this.name || '') + '(' + params.join(',') + ') {\n  ' + source + '}';
      Handlebars.log(Handlebars.logger.DEBUG, functionSource + "\n\n");
      return functionSource;
    }
  },
  mergeSource: function() {
    // WARN: We are not handling the case where buffer is still populated as the source should
    // not have buffer append operations as their final action.
    var source = '',
        buffer;
    for (var i = 0, len = this.source.length; i < len; i++) {
      var line = this.source[i];
      if (line.appendToBuffer) {
        if (buffer) {
          buffer = buffer + '\n    + ' + line.content;
        } else {
          buffer = line.content;
        }
      } else {
        if (buffer) {
          source += 'buffer += ' + buffer + ';\n  ';
          buffer = undefined;
        }
        source += line + '\n  ';
      }
    }
    return source;
  },

  // [blockValue]
  //
  // On stack, before: hash, inverse, program, value
  // On stack, after: return value of blockHelperMissing
  //
  // The purpose of this opcode is to take a block of the form
  // `{{#foo}}...{{/foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  blockValue: function() {
    this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

    var params = ["depth0"];
    this.setupParams(0, params);

    this.replaceStack(function(current) {
      params.splice(1, 0, current);
      return "blockHelperMissing.call(" + params.join(", ") + ")";
    });
  },

  // [ambiguousBlockValue]
  //
  // On stack, before: hash, inverse, program, value
  // Compiler value, before: lastHelper=value of last found helper, if any
  // On stack, after, if no lastHelper: same as [blockValue]
  // On stack, after, if lastHelper: value
  ambiguousBlockValue: function() {
    this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

    var params = ["depth0"];
    this.setupParams(0, params);

    var current = this.topStack();
    params.splice(1, 0, current);

    // Use the options value generated from the invocation
    params[params.length-1] = 'options';

    this.source.push("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function(content) {
    this.source.push(this.appendToBuffer(this.quotedString(content)));
  },

  // [append]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Coerces `value` to a String and appends it to the current buffer.
  //
  // If `value` is truthy, or 0, it is coerced into a string and appended
  // Otherwise, the empty string is appended
  append: function() {
    // Force anything that is inlined onto the stack so we don't have duplication
    // when we examine local
    this.flushInline();
    var local = this.popStack();
    this.source.push("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
    if (this.environment.isSimple) {
      this.source.push("else { " + this.appendToBuffer("''") + " }");
    }
  },

  // [appendEscaped]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Escape `value` and append it to the buffer
  appendEscaped: function() {
    this.context.aliases.escapeExpression = 'this.escapeExpression';

    this.source.push(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
  },

  // [getContext]
  //
  // On stack, before: ...
  // On stack, after: ...
  // Compiler value, after: lastContext=depth
  //
  // Set the value of the `lastContext` compiler value to the depth
  getContext: function(depth) {
    if(this.lastContext !== depth) {
      this.lastContext = depth;
    }
  },

  // [lookupOnContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext[name], ...
  //
  // Looks up the value of `name` on the current context and pushes
  // it onto the stack.
  lookupOnContext: function(name) {
    this.push(this.nameLookup('depth' + this.lastContext, name, 'context'));
  },

  // [pushContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext, ...
  //
  // Pushes the value of the current context onto the stack.
  pushContext: function() {
    this.pushStackLiteral('depth' + this.lastContext);
  },

  // [resolvePossibleLambda]
  //
  // On stack, before: value, ...
  // On stack, after: resolved value, ...
  //
  // If the `value` is a lambda, replace it on the stack by
  // the return value of the lambda
  resolvePossibleLambda: function() {
    this.context.aliases.functionType = '"function"';

    this.replaceStack(function(current) {
      return "typeof " + current + " === functionType ? " + current + ".apply(depth0) : " + current;
    });
  },

  // [lookup]
  //
  // On stack, before: value, ...
  // On stack, after: value[name], ...
  //
  // Replace the value on the stack with the result of looking
  // up `name` on `value`
  lookup: function(name) {
    this.replaceStack(function(current) {
      return current + " == null || " + current + " === false ? " + current + " : " + this.nameLookup(current, name, 'context');
    });
  },

  // [lookupData]
  //
  // On stack, before: ...
  // On stack, after: data[id], ...
  //
  // Push the result of looking up `id` on the current data
  lookupData: function(id) {
    this.push('data');
  },

  // [pushStringParam]
  //
  // On stack, before: ...
  // On stack, after: string, currentContext, ...
  //
  // This opcode is designed for use in string mode, which
  // provides the string value of a parameter along with its
  // depth rather than resolving it immediately.
  pushStringParam: function(string, type) {
    this.pushStackLiteral('depth' + this.lastContext);

    this.pushString(type);

    if (typeof string === 'string') {
      this.pushString(string);
    } else {
      this.pushStackLiteral(string);
    }
  },

  emptyHash: function() {
    this.pushStackLiteral('{}');

    if (this.options.stringParams) {
      this.register('hashTypes', '{}');
      this.register('hashContexts', '{}');
    }
  },
  pushHash: function() {
    this.hash = {values: [], types: [], contexts: []};
  },
  popHash: function() {
    var hash = this.hash;
    this.hash = undefined;

    if (this.options.stringParams) {
      this.register('hashContexts', '{' + hash.contexts.join(',') + '}');
      this.register('hashTypes', '{' + hash.types.join(',') + '}');
    }
    this.push('{\n    ' + hash.values.join(',\n    ') + '\n  }');
  },

  // [pushString]
  //
  // On stack, before: ...
  // On stack, after: quotedString(string), ...
  //
  // Push a quoted version of `string` onto the stack
  pushString: function(string) {
    this.pushStackLiteral(this.quotedString(string));
  },

  // [push]
  //
  // On stack, before: ...
  // On stack, after: expr, ...
  //
  // Push an expression onto the stack
  push: function(expr) {
    this.inlineStack.push(expr);
    return expr;
  },

  // [pushLiteral]
  //
  // On stack, before: ...
  // On stack, after: value, ...
  //
  // Pushes a value onto the stack. This operation prevents
  // the compiler from creating a temporary variable to hold
  // it.
  pushLiteral: function(value) {
    this.pushStackLiteral(value);
  },

  // [pushProgram]
  //
  // On stack, before: ...
  // On stack, after: program(guid), ...
  //
  // Push a program expression onto the stack. This takes
  // a compile-time guid and converts it into a runtime-accessible
  // expression.
  pushProgram: function(guid) {
    if (guid != null) {
      this.pushStackLiteral(this.programExpression(guid));
    } else {
      this.pushStackLiteral(null);
    }
  },

  // [invokeHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  invokeHelper: function(paramSize, name) {
    this.context.aliases.helperMissing = 'helpers.helperMissing';

    var helper = this.lastHelper = this.setupHelper(paramSize, name, true);
    var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');

    this.push(helper.name + ' || ' + nonHelper);
    this.replaceStack(function(name) {
      return name + ' ? ' + name + '.call(' +
          helper.callParams + ") " + ": helperMissing.call(" +
          helper.helperMissingParams + ")";
    });
  },

  // [invokeKnownHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  invokeKnownHelper: function(paramSize, name) {
    var helper = this.setupHelper(paramSize, name);
    this.push(helper.name + ".call(" + helper.callParams + ")");
  },

  // [invokeAmbiguous]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of disambiguation
  //
  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  invokeAmbiguous: function(name, helperCall) {
    this.context.aliases.functionType = '"function"';

    this.pushStackLiteral('{}');    // Hash value
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

    var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');
    var nextStack = this.nextStack();

    this.source.push('if (' + nextStack + ' = ' + helperName + ') { ' + nextStack + ' = ' + nextStack + '.call(' + helper.callParams + '); }');
    this.source.push('else { ' + nextStack + ' = ' + nonHelper + '; ' + nextStack + ' = typeof ' + nextStack + ' === functionType ? ' + nextStack + '.apply(depth0) : ' + nextStack + '; }');
  },

  // [invokePartial]
  //
  // On stack, before: context, ...
  // On stack after: result of partial invocation
  //
  // This operation pops off a context, invokes a partial with that context,
  // and pushes the result of the invocation back.
  invokePartial: function(name) {
    var params = [this.nameLookup('partials', name, 'partial'), "'" + name + "'", this.popStack(), "helpers", "partials"];

    if (this.options.data) {
      params.push("data");
    }

    this.context.aliases.self = "this";
    this.push("self.invokePartial(" + params.join(", ") + ")");
  },

  // [assignToHash]
  //
  // On stack, before: value, hash, ...
  // On stack, after: hash, ...
  //
  // Pops a value and hash off the stack, assigns `hash[key] = value`
  // and pushes the hash back onto the stack.
  assignToHash: function(key) {
    var value = this.popStack(),
        context,
        type;

    if (this.options.stringParams) {
      type = this.popStack();
      context = this.popStack();
    }

    var hash = this.hash;
    if (context) {
      hash.contexts.push("'" + key + "': " + context);
    }
    if (type) {
      hash.types.push("'" + key + "': " + type);
    }
    hash.values.push("'" + key + "': (" + value + ")");
  },

  // HELPERS

  compiler: JavaScriptCompiler,

  compileChildren: function(environment, options) {
    var children = environment.children, child, compiler;

    for(var i=0, l=children.length; i<l; i++) {
      child = children[i];
      compiler = new this.compiler();

      var index = this.matchExistingProgram(child);

      if (index == null) {
        this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
        index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context);
        this.context.environments[index] = child;
      } else {
        child.index = index;
        child.name = 'program' + index;
      }
    }
  },
  matchExistingProgram: function(child) {
    for (var i = 0, len = this.context.environments.length; i < len; i++) {
      var environment = this.context.environments[i];
      if (environment && environment.equals(child)) {
        return i;
      }
    }
  },

  programExpression: function(guid) {
    this.context.aliases.self = "this";

    if(guid == null) {
      return "self.noop";
    }

    var child = this.environment.children[guid],
        depths = child.depths.list, depth;

    var programParams = [child.index, child.name, "data"];

    for(var i=0, l = depths.length; i<l; i++) {
      depth = depths[i];

      if(depth === 1) { programParams.push("depth0"); }
      else { programParams.push("depth" + (depth - 1)); }
    }

    return (depths.length === 0 ? "self.program(" : "self.programWithDepth(") + programParams.join(", ") + ")";
  },

  register: function(name, val) {
    this.useRegister(name);
    this.source.push(name + " = " + val + ";");
  },

  useRegister: function(name) {
    if(!this.registers[name]) {
      this.registers[name] = true;
      this.registers.list.push(name);
    }
  },

  pushStackLiteral: function(item) {
    return this.push(new Literal(item));
  },

  pushStack: function(item) {
    this.flushInline();

    var stack = this.incrStack();
    if (item) {
      this.source.push(stack + " = " + item + ";");
    }
    this.compileStack.push(stack);
    return stack;
  },

  replaceStack: function(callback) {
    var prefix = '',
        inline = this.isInline(),
        stack;

    // If we are currently inline then we want to merge the inline statement into the
    // replacement statement via ','
    if (inline) {
      var top = this.popStack(true);

      if (top instanceof Literal) {
        // Literals do not need to be inlined
        stack = top.value;
      } else {
        // Get or create the current stack name for use by the inline
        var name = this.stackSlot ? this.topStackName() : this.incrStack();

        prefix = '(' + this.push(name) + ' = ' + top + '),';
        stack = this.topStack();
      }
    } else {
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (inline) {
      if (this.inlineStack.length || this.compileStack.length) {
        this.popStack();
      }
      this.push('(' + prefix + item + ')');
    } else {
      // Prevent modification of the context depth variable. Through replaceStack
      if (!/^stack/.test(stack)) {
        stack = this.nextStack();
      }

      this.source.push(stack + " = (" + prefix + item + ");");
    }
    return stack;
  },

  nextStack: function() {
    return this.pushStack();
  },

  incrStack: function() {
    this.stackSlot++;
    if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
    return this.topStackName();
  },
  topStackName: function() {
    return "stack" + this.stackSlot;
  },
  flushInline: function() {
    var inlineStack = this.inlineStack;
    if (inlineStack.length) {
      this.inlineStack = [];
      for (var i = 0, len = inlineStack.length; i < len; i++) {
        var entry = inlineStack[i];
        if (entry instanceof Literal) {
          this.compileStack.push(entry);
        } else {
          this.pushStack(entry);
        }
      }
    }
  },
  isInline: function() {
    return this.inlineStack.length;
  },

  popStack: function(wrapped) {
    var inline = this.isInline(),
        item = (inline ? this.inlineStack : this.compileStack).pop();

    if (!wrapped && (item instanceof Literal)) {
      return item.value;
    } else {
      if (!inline) {
        this.stackSlot--;
      }
      return item;
    }
  },

  topStack: function(wrapped) {
    var stack = (this.isInline() ? this.inlineStack : this.compileStack),
        item = stack[stack.length - 1];

    if (!wrapped && (item instanceof Literal)) {
      return item.value;
    } else {
      return item;
    }
  },

  quotedString: function(str) {
    return '"' + str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
      .replace(/\u2029/g, '\\u2029') + '"';
  },

  setupHelper: function(paramSize, name, missingParams) {
    var params = [];
    this.setupParams(paramSize, params, missingParams);
    var foundHelper = this.nameLookup('helpers', name, 'helper');

    return {
      params: params,
      name: foundHelper,
      callParams: ["depth0"].concat(params).join(", "),
      helperMissingParams: missingParams && ["depth0", this.quotedString(name)].concat(params).join(", ")
    };
  },

  // the params and contexts arguments are passed in arrays
  // to fill in
  setupParams: function(paramSize, params, useRegister) {
    var options = [], contexts = [], types = [], param, inverse, program;

    options.push("hash:" + this.popStack());

    inverse = this.popStack();
    program = this.popStack();

    // Avoid setting fn and inverse if neither are set. This allows
    // helpers to do a check for `if (options.fn)`
    if (program || inverse) {
      if (!program) {
        this.context.aliases.self = "this";
        program = "self.noop";
      }

      if (!inverse) {
       this.context.aliases.self = "this";
        inverse = "self.noop";
      }

      options.push("inverse:" + inverse);
      options.push("fn:" + program);
    }

    for(var i=0; i<paramSize; i++) {
      param = this.popStack();
      params.push(param);

      if(this.options.stringParams) {
        types.push(this.popStack());
        contexts.push(this.popStack());
      }
    }

    if (this.options.stringParams) {
      options.push("contexts:[" + contexts.join(",") + "]");
      options.push("types:[" + types.join(",") + "]");
      options.push("hashContexts:hashContexts");
      options.push("hashTypes:hashTypes");
    }

    if(this.options.data) {
      options.push("data:data");
    }

    options = "{" + options.join(",") + "}";
    if (useRegister) {
      this.register('options', options);
      params.push('options');
    } else {
      params.push(options);
    }
    return params.join(", ");
  }
};

var reservedWords = (
  "break else new var" +
  " case finally return void" +
  " catch for switch while" +
  " continue function this with" +
  " default if throw" +
  " delete in try" +
  " do instanceof typeof" +
  " abstract enum int short" +
  " boolean export interface static" +
  " byte extends long super" +
  " char final native synchronized" +
  " class float package throws" +
  " const goto private transient" +
  " debugger implements protected volatile" +
  " double import public let yield"
).split(" ");

var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

for(var i=0, l=reservedWords.length; i<l; i++) {
  compilerWords[reservedWords[i]] = true;
}

JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
  if(!JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]+$/.test(name)) {
    return true;
  }
  return false;
};

Handlebars.precompile = function(input, options) {
  if (input == null || (typeof input !== 'string' && input.constructor !== Handlebars.AST.ProgramNode)) {
    throw new Handlebars.Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }
  var ast = Handlebars.parse(input);
  var environment = new Compiler().compile(ast, options);
  return new JavaScriptCompiler().compile(environment, options);
};

Handlebars.compile = function(input, options) {
  if (input == null || (typeof input !== 'string' && input.constructor !== Handlebars.AST.ProgramNode)) {
    throw new Handlebars.Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }
  var compiled;
  function compile() {
    var ast = Handlebars.parse(input);
    var environment = new Compiler().compile(ast, options);
    var templateSpec = new JavaScriptCompiler().compile(environment, options, undefined, true);
    return Handlebars.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  return function(context, options) {
    if (!compiled) {
      compiled = compile();
    }
    return compiled.call(this, context, options);
  };
};

;
// lib/handlebars/runtime.js

Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          programWrapper = Handlebars.VM.program(i, fn, data);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = Handlebars.VM.program(i, fn);
        }
        return programWrapper;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common) {
          ret = {};
          Handlebars.Utils.extend(ret, common);
          Handlebars.Utils.extend(ret, param);
        }
        return ret;
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop,
      compilerInfo: null
    };

    return function(context, options) {
      options = options || {};
      var result = templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);

      var compilerInfo = container.compilerInfo || [],
          compilerRevision = compilerInfo[0] || 1,
          currentRevision = Handlebars.COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = Handlebars.REVISION_CHANGES[currentRevision],
              compilerVersions = Handlebars.REVISION_CHANGES[compilerRevision];
          throw "Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").";
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw "Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").";
        }
      }

      return result;
    };
  },

  programWithDepth: function(i, fn, data /*, $depth */) {
    var args = Array.prototype.slice.call(arguments, 3);

    var program = function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
    program.program = i;
    program.depth = args.length;
    return program;
  },
  program: function(i, fn, data) {
    var program = function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
    program.program = i;
    program.depth = 0;
    return program;
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials, data) {
    var options = { helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    } else {
      partials[name] = Handlebars.compile(partial, {data: data !== undefined});
      return partials[name](context, options);
    }
  }
};

Handlebars.template = Handlebars.VM.template;
;
// lib/handlebars/browser-suffix.js
})(Handlebars);
;

define("handlebars", function(){});
