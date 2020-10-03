// Bookmarklet save-snapshot
// For Firefox custom buttons: window --> content, head.copyScript(); --> head.copyScript(win.wrappedJSObject || win);

javascript: (function () {
    var getSelWin = function (w) {
        if (w.getSelection().toString()) return w;
        for (var i = 0, f, r; f = w.frames[i]; i++) {
            try {
                if (r = getSelWin(f)) return r;
            } catch(e) {}
        }
    };
    var selWin = getSelWin(window), win = selWin || window, doc = win.document, loc = win.location;

    var saveContent = function (fileContent, fileName) {
        var link = doc.createElement('a');
        link.download = fileName;
        link.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(fileContent);
        link.click();
    };
    var qualifyURL = function (url, base) {
        if (!url || /^([a-z]+:|#)/.test(url)) return url;
        var a = doc.createElement('a');
        if (base) {
            a.href = base;
            a.href = a.protocol + (url.charAt(0) == '/' ? (url.charAt(1) == '/' ? '' : '//' + a.host) : '//' + a.host + a.pathname.slice(0, (url.charAt(0) != '?' && a.pathname.lastIndexOf('/') + 1) || a.pathname.length)) + url;
        } else {
            a.href = url;
        };
        return a.href;
    };
    var encodeImg = function (src, obj) {
        var canvas, img, ret = src;
        if (/^https?:\/\//.test(src)) {
            canvas = doc.createElement('canvas');
            if (!obj || obj.nodeName.toLowerCase() != 'img') {
                img = doc.createElement('img');
                img.src = src;
            } else {
                img = obj;
            };
            if (img.complete) try{
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                ret = canvas.toDataURL((/\.jpe?g/i.test(src) ? 'image/jpeg' : 'image/png'));
            } catch (e) {};
            if (img != obj) img.src = '';
        };
        return ret;
    };
/*
    var toSrc = function (obj) {
        var strToSrc = function (str) {
            var chr, ret = '', i = 0, meta = {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '\x22' : '\\\x22', '\\': '\\\\'};
            while (chr = str.charAt(i++)) {
                ret += meta[chr] || chr;
            };
            return '\x22' + ret + '\x22';
        },
        arrToSrc = function (arr) {
            var ret = [];
            for (var i = 0; i < arr.length; i++) {
                ret[i] = toSrc(arr[i]) || 'null';
            };
            return '[' + ret.join(',') + ']';
        },
        objToSrc = function (obj) {
            var val, ret = [];
            for (var prop in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop) && (val = toSrc(obj[prop]))) ret.push(strToSrc(prop) + ': ' + val);
            };
            return '{' + ret.join(',') + '}';
        };

        switch (Object.prototype.toString.call(obj).slice(8, -1)) {
            case 'Array': return obj.length < 1000 ? arrToSrc(obj) : '[]';
            case 'Boolean':
            case 'Function':
            case 'RegExp': return obj.toString();
            case 'Date': return 'new Date(' + obj.getTime() + ')';
            case 'Math': return 'Math';
            case 'Number': return isFinite(obj) ? String(obj) : 'null';
            case 'Object': return objToSrc(obj);
            case 'String': return strToSrc(obj);
            default: return obj ? (obj.nodeType == 1 && obj.id ? 'document.getElementById(' + strToSrc(obj.id) + ')' : '{}') : 'null';
        }
    };
*/
    // clone selection or body
    var ele, pEle, clone, reUrl = /(url\(\x22?)(.+?)(\x22?\))/g;
    if (selWin) {
        var rng = win.getSelection().getRangeAt(0);
        pEle = rng.commonAncestorContainer;
        ele = rng.cloneContents();
    } else {
        pEle = doc.documentElement;
        ele = (doc.body || doc.getElementsByTagName('body')[0]).cloneNode(true);
    };
    while (pEle) {
        if (pEle.nodeType == 1) {
            clone = pEle.cloneNode(false);
            clone.appendChild(ele);
            ele = clone;
        };
        pEle = pEle.parentNode
    };
    var sel = doc.createElement('div');
    sel.appendChild(ele);

    // resolve urls and convert images to base64
    // <base> has problems with anchors and relative paths in css in firefox
    for (var el, all = sel.getElementsByTagName('*'), i = all.length; i--;) {
        el = all[i];
        if (el.style && el.style.backgroundImage) el.style.backgroundImage = el.style.backgroundImage.replace(reUrl, function (a, b, c, d) {return b + encodeImg(qualifyURL(c)) + d});
        switch (el.nodeName.toLowerCase()) {
            case 'link':
            case 'style':
            case 'script': el.parentNode.removeChild(el); break;
            case 'a': 
            case 'area': if (el.hasAttribute('href') && el.getAttribute('href').charAt(0) != '#') el.href = el.href; break;
            case 'img':
            case 'input': if (el.hasAttribute('src')) el.src = encodeImg(el.src, el); break;
            case 'audio':
            case 'video':
            case 'embed':
            case 'frame':
            case 'iframe': if (el.hasAttribute('src')) el.src = el.src; break;
            case 'object': if (el.hasAttribute('data')) el.data = el.data; break;
            case 'form': if (el.hasAttribute('action')) el.action = el.action; break;
            case 'textarea': el.innerHTML = el.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); break;
        }
    };

    // create new head
    var head = ele.insertBefore(doc.createElement('head'), ele.firstChild);
    var meta = doc.createElement('meta');
    meta.httpEquiv = 'content-type';
    meta.content = 'text/html; charset=utf-8';
    head.appendChild(meta);
    var title = doc.getElementsByTagName('title')[0];
    if (title) head.appendChild(title.cloneNode(true));
/*
    head.copyScript = function () {
        // ignore jquery
        if ('$' in win) return;
        var f = doc.createElement('iframe');
        f.src = '';
        f.setAttribute('style', 'position:fixed;left:0;top:0;visibility:hidden;width:0;height:0;');
        doc.documentElement.appendChild(f);
        var str, script = doc.createElement('script');
        script.type = 'text/javascript';
        for (var name in win) {
            // ignore default properties and incorrect names
            if (name in f.contentWindow || !/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name)) continue;
            try {
                str = toSrc(win[name]);
                if (!/\{\s*\[native code\]\s*\}/.test(str)) {
                    script.appendChild(doc.createTextNode('var ' + name + ' = ' + str.replace(/<\/(script>)/ig, '<\\/$1') + ';\n'));
                }
            } catch (e) {};
        };
        f.parentNode.removeChild(f);
        if (script.childNodes.length) this.nextSibling.appendChild(script);
    };
    head.copyScript();
*/
    head.copyStyle = function (s) {
        if (!s) return;
        var style = doc.createElement('style');
        style.type = 'text/css';
        if (s.media && s.media.mediaText) style.media = s.media.mediaText;
        try {
            for (var i = 0, rule; rule = s.cssRules[i]; i++) {
                if (rule.type != 3) {
                    // save only used styles
                    if((!rule.selectorText || rule.selectorText.indexOf(':') != -1) || (!sel.querySelector || sel.querySelector(rule.selectorText))) {
                        style.appendChild(doc.createTextNode(rule.cssText.replace(reUrl, function (a, b, c, d) {var url = qualifyURL(c, s.href); if(rule.type == 1 && rule.style && rule.style.backgroundImage) url = encodeImg(url); return b + url + d}) + '\n'));
                    }
                } else {
                    // save css import
                    this.copyStyle(rule.styleSheet);
                }
            }
        } catch(e) {
            if (s.ownerNode) {
                    style = s.ownerNode.cloneNode(false);
                    // qualify URL
                    if (style.href) style.href = style.href;
            }
        };
        this.appendChild(style);
    };
    var sheets = doc.styleSheets;
    for (var j = 0; j < sheets.length; j++) head.copyStyle(sheets[j]);
    head.appendChild(doc.createTextNode('\n'));

    var doctype = '', dt = doc.doctype;
    if (dt && dt.name) {
        doctype += '<!DOCTYPE ' + dt.name;
        if (dt.publicId) doctype += ' PUBLIC \x22' + dt.publicId + '\x22';
        if (dt.systemId) doctype += ' \x22' + dt.systemId + '\x22';
        doctype += '>\n';
    };
    // save the page	
    saveContent(doctype + sel.innerHTML + '\n<!-- This document saved from ' + (loc.protocol != 'data:' ? loc.href : 'data:uri') + ' -->', (doc.title || 'untitled') + '.html');

})();
