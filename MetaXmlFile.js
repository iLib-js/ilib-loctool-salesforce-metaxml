/*
 * MetaXmlFile.js - plugin to extract resources from a MetaXml source code file
 *
 * Copyright © 2020, Box, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var fs = require("fs");
var path = require("path");
var log4js = require("log4js");
var xml2json = require("xml2json");
var IString = require("ilib/lib/IString");

var logger = log4js.getLogger("loctool.lib.MetaXmlFile");

/**
 * Create a new java file with the given path name and within
 * the given project.
 *
 * @param {Project} project the project object
 * @param {String} pathName path to the file relative to the root
 * of the project file
 * @param {FileType} type the file type instance of this file
 */
var MetaXmlFile = function(options) {
    options = options || {};
    this.project = options.project;
    this.pathName = options.pathName;
    this.type = options.type;
    
    this.API = this.project.getAPI();
    
    this.set = this.API.newTranslationSet(this.project ? this.project.sourceLocale : "zxx-XX");
};

var reUnicodeChar = /\\u([a-fA-F0-9]{1,4})/g;
var reOctalChar = /\\([0-8]{1,3})/g;

/**
 * Unescape the string to make the same string that would be
 * in memory in the target programming language. This includes
 * unescaping both special and Unicode characters.
 *
 * @static
 * @param {String} string the string to unescape
 * @returns {String} the unescaped string
 */
MetaXmlFile.unescapeString = function(string) {
    var unescaped = string;

    while ((match = reUnicodeChar.exec(unescaped))) {
        if (match && match.length > 1) {
            var value = parseInt(match[1], 16);
            unescaped = unescaped.replace(match[0], IString.fromCodePoint(value));
            reUnicodeChar.lastIndex = 0;
        }
    }

    while ((match = reOctalChar.exec(unescaped))) {
        if (match && match.length > 1) {
            var value = parseInt(match[1], 8);
            unescaped = unescaped.replace(match[0], IString.fromCodePoint(value));
            reOctalChar.lastIndex = 0;
        }
    }

    unescaped = unescaped.
        replace(/^\\\\/g, "\\").
        replace(/([^\\])\\\\/g, "$1\\").
        replace(/\\'/g, "'").
        replace(/\\"/g, '"');

    return unescaped;
};

/**
 * Clean the string to make a source string. This means
 * removing leading and trailing white space, compressing
 * whitespaces, and unescaping characters. This changes
 * the string from what it looks like in the source
 * code.
 *
 * @static
 * @param {String} string the string to clean
 * @returns {String} the cleaned string
 */
MetaXmlFile.cleanString = function(string) {
    var unescaped = MetaXmlFile.unescapeString(string);

    unescaped = unescaped.
        replace(/\\[btnfr]/g, " ").
        replace(/[ \n\t\r\f]+/g, " ").
        trim();

    return unescaped;
};

/**
 * Make a new key for the given string. This must correspond
 * exactly with the code in htglob jar file so that the
 * resources match up. See the class IResourceBundle in
 * this project under the java directory for the corresponding
 * code.
 *
 * @private
 * @param {String} source the source string to make a resource
 * key for
 * @returns {String} a unique key for this string
 */
MetaXmlFile.prototype.makeKey = function(source) {
    return this.API.utils.hashKey(MetaXmlFile.cleanString(source));
};

/*
var reGetStringBogusConcatenation1 = new RegExp(/(^R|\WR)B\.getString\s*\(\s*"((\\"|[^"])*)"\s*\+/g);
var reGetStringBogusConcatenation2 = new RegExp(/(^R|\WR)B\.getString\s*\([^\)]*\+\s*"((\\"|[^"])*)"\s*\)/g);
var reGetStringBogusParam = new RegExp(/(^R|\WR)B\.getString\s*\([^"\)]*\)/g);

var reGetString = new RegExp(/(^R|\WR)B\.getString\s*\(\s*"((\\"|[^"])*)"\s*\)/g);
var reGetStringWithId = new RegExp(/(^R|\WR)B\.getString\("((\\"|[^"])*)"\s*,\s*"((\\"|[^"])*)"\)/g);

var reI18nComment = new RegExp("//\\s*i18n\\s*:\\s*(.*)$");
*/

/**
 * Walk the node tree looking for properties that have localizable values, then extract
 * them and resourcify them.
 * @private
 */
MetaXmlFile.prototype.walkLayout = function(node) {
    var comment;
    for (var p in node) {
        var subnode = node[p];
        if (typeof(subnode) === "object") {
            this.walkLayout(subnode);
        } else if (typeof(subnode) === "string") {
            if (subnode.length && localizableAttributes[p]) {
                comment = node.i18n;
                logger.trace("Found resource " + p + " with string " + subnode + " and comment " + comment);
                if (!this.API.utils.isDNT(comment)) {
                    logger.trace("Resourcifying");
                    var key = this.makeKey(p, subnode);
                    node[p] = "@string/" + key;
                    var res = this.API.newResource({
                        datatype: this.type.datatype,
                        resType: "string",
                        key: key,
                        source: subnode,
                        pathName: this.pathName,
                        sourceLocale: this.locale || this.sourceLocale,
                        context: this.context || undefined,
                        project: this.project.getProjectId(),
                        autoKey: true,
                        comment: comment,
                        dnt: this.API.utils.isDNT(comment),
                        datatype: this.type.datatype,
                        flavor: this.flavor,
                        index: this.resourceIndex++
                    });
                    this.set.add(res);
                    this.dirty = true;
                    this.replacements[reEscape(p + '="' + subnode + '"')] = p + '="' + node[p] + '"';
                    logger.trace("Recording replacement " + p + '="' + subnode + '" to ' + p + '="' + node[p] + '"');
                }
            }
        } else if (ilib.isArray(subnode)) {
            for (var i = 0; i < subnode.length; i++) {
                this.walkLayout(subnode[i]);
            }
        }
    }
};

/**
 * Parse the data string looking for the localizable strings and add them to the
 * project's translation set.
 * @param {String} data the string to parse
 */
MetaXmlFile.prototype.parse = function(data) {
    logger.debug("Extracting strings from " + this.pathName);

    this.xml = data;
    this.contents = xml2json.toJson(data, {object: true});
    this.resourceIndex = 0;

    this.walkLayout(this.contents);

    /*
    this.resourceIndex = 0;

    reGetString.lastIndex = 0; // for safety
    var result = reGetString.exec(data);
    while (result && result.length > 1 && result[2]) {
        logger.trace("Found string key: " + this.makeKey(result[2]) + ", string: '" + result[2] + "', comment: " + (result.length > 4 ? result[4] : undefined));
        if (result[2] && result[2].length) {

            var last = data.indexOf('\n', reGetString.lastIndex);
            last = (last === -1) ? data.length : last;
            var line = data.substring(reGetString.lastIndex, last);
            var commentResult = reI18nComment.exec(line);
            comment = (commentResult && commentResult.length > 1) ? commentResult[1] : undefined;

            var r = this.API.newResource({
                resType: "string",
                project: this.project.getProjectId(),
                key: this.makeKey(result[2]),
                sourceLocale: this.project.sourceLocale,
                source: this.API.utils.trimEscaped(MetaXmlFile.unescapeString(result[2])),
                autoKey: true,
                pathName: this.pathName,
                state: "new",
                comment: comment,
                datatype: this.type.datatype,
                flavor: this.flavor,
                index: this.resourceIndex++
            });
            this.set.add(r);
        } else {
            logger.warn("Warning: Bogus empty string in get string call: ");
            logger.warn("... " + data.substring(result.index, reGetString.lastIndex) + " ...");
        }
        result = reGetString.exec(data);
    }

    reGetStringWithId.lastIndex = 0; // for safety
    result = reGetStringWithId.exec(data);
    while (result && result.length > 2 && result[2] && result[4]) {
        logger.trace("Found string '" + result[2] + "' with unique key " + result[4] + ", comment: " + (result.length > 4 ? result[4] : undefined));
        if (result[2] && result[4] && result[2].length && result[4].length) {

            var last = data.indexOf('\n', reGetStringWithId.lastIndex);
            last = (last === -1) ? data.length : last;
            var line = data.substring(reGetStringWithId.lastIndex, last);
            var commentResult = reI18nComment.exec(line);
            comment = (commentResult && commentResult.length > 1) ? commentResult[1] : undefined;

            var r = this.API.newResource({
                resType: "string",
                project: this.project.getProjectId(),
                key: result[4],
                sourceLocale: this.project.sourceLocale,
                source: MetaXmlFile.cleanString(result[2]),
                pathName: this.pathName,
                state: "new",
                comment: comment,
                datatype: this.type.datatype,
                flavor: this.flavor,
                index: this.resourceIndex++
            });
            this.set.add(r);
        } else {
            logger.warn("Warning: Bogus empty string in get string call: ");
            logger.warn("... " + data.substring(result.index, reGetString.lastIndex) + " ...");
        }
        result = reGetStringWithId.exec(data);
    }

    // now check for and report on errors in the source
    this.API.utils.generateWarnings(data, reGetStringBogusConcatenation1,
        "Warning: string concatenation is not allowed in the RB.getString() parameters:",
        logger,
        this.pathName);

    this.API.utils.generateWarnings(data, reGetStringBogusConcatenation2,
        "Warning: string concatenation is not allowed in the RB.getString() parameters:",
        logger,
        this.pathName);

    this.API.utils.generateWarnings(data, reGetStringBogusParam,
        "Warning: non-string arguments are not allowed in the RB.getString() parameters:",
        logger,
        this.pathName);
    */
};

/**
 * Extract all the localizable strings from the java file and add them to the
 * project's translation set.
 */
MetaXmlFile.prototype.extract = function() {
    logger.debug("Extracting strings from " + this.pathName);
    if (this.pathName) {
        var p = path.join(this.project.root, this.pathName);
        try {
            var data = fs.readFileSync(p, "utf8");
            if (data) {
                this.parse(data);
            }
        } catch (e) {
            logger.warn("Could not read file: " + p);
            logger.warn(e);
        }
    }
};

/**
 * Return the set of resources found in the current MetaXml file.
 *
 * @returns {TranslationSet} The set of resources found in the
 * current MetaXml file.
 */
MetaXmlFile.prototype.getTranslationSet = function() {
    return this.set;
}

//we don't localize or write java source files
MetaXmlFile.prototype.localize = function() {};
MetaXmlFile.prototype.write = function() {};

module.exports = MetaXmlFile;
