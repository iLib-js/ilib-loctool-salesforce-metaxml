/*
 * testMetaXmlFileType.js - test the MetaXml file type handler object.
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

if (!MetaXmlFileType) {
    var MetaXmlFileType = require("../MetaXmlFileType.js");
    var CustomProject =  require("loctool/lib/CustomProject.js");
}

var p = new CustomProject({
    id: "webapp",
    name: "webapp",
    sourceLocale: "en-US"
}, "./test/testfiles", {
    locales:["en-GB"]
});


module.exports.metaxmlfiletype = {
    testMetaXmlFileTypeConstructor: function(test) {
        test.expect(1);

        var mxft = new MetaXmlFileType(p);

        test.ok(mxft);

        test.done();
    },

    testMetaXmlFileTypeHandlesMetaXmlTrue: function(test) {
        test.expect(2);

        var mxft = new MetaXmlFileType(p);
        test.ok(mxft);

        test.ok(mxft.handles("en_US.translation-meta.xml"));

        test.done();
    },

    testMetaXmlFileTypeHandlesMetaXmlFalseNotENUS: function(test) {
        test.expect(2);

        var mxft = new MetaXmlFileType(p);
        test.ok(mxft);

        test.ok(!mxft.handles("en.translation-meta.xml"));

        test.done();
    },

    testMetaXmlFileTypeHandlesMetaXmlFalseClose: function(test) {
        test.expect(2);

        var mxft = new MetaXmlFileType(p);
        test.ok(mxft);

        test.ok(!mxft.handles("foo.translation-meta.xml"));

        test.done();
    },

    testMetaXmlFileTypeHandlesMetaXmlFalseClose2: function(test) {
        test.expect(2);

        var mxft = new MetaXmlFileType(p);
        test.ok(mxft);

        test.ok(!mxft.handles("en_US.field-meta.xml"));

        test.done();
    },

    testMetaXmlFileTypeHandlesFalse: function(test) {
        test.expect(2);

        var mxft = new MetaXmlFileType(p);
        test.ok(mxft);

        test.ok(!mxft.handles("foo.html"));

        test.done();
    },

    testMetaXmlFileTypeHandlesMetaXmlTrueWithDir: function(test) {
        test.expect(2);

        var mxft = new MetaXmlFileType(p);
        test.ok(mxft);

        test.ok(mxft.handles("force-app/main/default/translations/en_US.translation-meta.xml"));

        test.done();
    },

    testMetaXmlFileTypeHandlesMetaXmlDontTranslateAlreadyTranslatedFiles: function(test) {
        test.expect(2);

        var mxft = new MetaXmlFileType(p);
        test.ok(mxft);

        test.ok(!mxft.handles("force-app/main/default/translations/de.translation-meta.xml"));

        test.done();
    },

    testMetaXmlFileTypeGetResourceFilePathDefaultLocaleForLanguage: function(test) {
        test.expect(2);

        var mxft = new MetaXmlFileType(p);
        test.ok(mxft);

        test.equal(mxft.getResourceFilePath("de-DE", "force-app/main/default/translation/en_US.translation-meta.xml"), "force-app/main/default/translations/de.translation-meta.xml");

        test.done();
    },

    testMetaXmlFileTypeGetResourceFilePathNonDefaultLocaleForLanguage: function(test) {
        test.expect(2);

        var mxft = new MetaXmlFileType(p);
        test.ok(mxft);

        test.equal(mxft.getResourceFilePath("de-AT", "force-app/main/default/translation/en_US.translation-meta.xml"), "force-app/main/default/translations/de_AT.translation-meta.xml");

        test.done();
    },
};
