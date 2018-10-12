window.err_log = function(log) {if(0)console.log(log);};
{
    var isArray = Array.isArray;
    var keyList = Object.keys;
    var hasProp = Object.prototype.hasOwnProperty;
    
    window.deepEqual = function(a, b) {
      if (a === b) return true;
    
      if (a && b && typeof a == 'object' && typeof b == 'object') {
        var arrA = isArray(a)
          , arrB = isArray(b)
          , i
          , length
          , key;
    
        if (arrA && arrB) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0;)
            if (!deepEqual(a[i], b[i])) return false;
          return true;
        }
    
        if (arrA != arrB) return false;
    
        var dateA = a instanceof Date
          , dateB = b instanceof Date;
        if (dateA != dateB) return false;
        if (dateA && dateB) return a.getTime() == b.getTime();
    
        var regexpA = a instanceof RegExp
          , regexpB = b instanceof RegExp;
        if (regexpA != regexpB) return false;
        if (regexpA && regexpB) return a.toString() == b.toString();
    
        var keys = keyList(a);
        length = keys.length;
    
        if (length !== keyList(b).length)
          return false;
    
        for (i = length; i-- !== 0;)
          if (!hasProp.call(b, keys[i])) return false;
    
        for (i = length; i-- !== 0;) {
          key = keys[i];
          if (!deepEqual(a[key], b[key])) return false;
        }
    
        return true;
      }
    
      return a!==a && b!==b;
    };
};

function extend(from, to)
{
    if (from == null || typeof from != "object") return from;
    if (from.constructor != Object && from.constructor != Array) return from;
    if (from.constructor == Date || from.constructor == RegExp || from.constructor == Function ||
        from.constructor == String || from.constructor == Number || from.constructor == Boolean)
        return new from.constructor(from);

    to = to || new from.constructor();

    for (var name in from)
    {
        to[name] = typeof to[name] == "undefined" ? extend(from[name], null) : to[name];
    }

    return to;
}

window.deepCopy = function(a){
    //return jQuery.extend(true, {}, a);
    //return Object.assign({}, a);
    //return Object.create(a);
    return extend(a, null);
}

window.rTimeOut=function(callback,delay){
 var dateNow=Date.now,
     requestAnimation=window.requestAnimationFrame,
     start=dateNow(),
     stop,
     timeoutFunc=function(){
      dateNow()-start<delay?stop||requestAnimation(timeoutFunc):callback()
     };
 requestAnimation(timeoutFunc);
 return{
  clear:function(){stop=1}
 }
}

window.delayiFrame = function(html){
    if(!html) return html;
    return html.replace(/<iframe .*?>/g, function(match, offset, input_string){
        if(!$.delayiFrameTimer) $.delayiFrameTimer = setTimeout(function() {
            $("[src_delay]").each(function(k, v) {
                $(v).attr("src", $(v).attr('src_delay')).removeAttr('src_delay');
            });
            $.delayiFrameTimer = 0;
        }, 1200);
        return match.replace("src=", "src_delay=");
    });        
};
window.jsClone = function(s){
    var r;
    if(typeof s == 'object')
        r = jQuery.extend(true, {}, s); 
    else if(typeof s == 'array')
        r = s.slice(0);
    else
        r = s;
    return r;
};

window.evalScope = function(code, dataScope) {
    err_log(code);
    var sc = ''; 
    for (var i in dataScope) {
        if(!(dataScope[i] instanceof Function)) {
            if(!sc) sc += 'var ';
            else sc += ', ';
            sc += i + " = dataScope['" + i + "']"; 
        }
    }
    sc += ";";
    eval(sc);
    function vfunc(vcode, re){
        do {
            var m = vcode.match(re);
            if(m){
                var v = veval(vfunc(m[2], re));
                if(v !== null)
                    vcode = vcode.replace(m[1], v);
                else
                    return null;
            }else
                return vcode;
        }while(1);
    }
    //  ${__detail.post_title} => seabouned cruises
    //  __detail.thumbul
    //  page == 'detail'
    //  ['src', __detail.thumburl]
    //  __detail.prices[${adult}] => __detail.prices[2]
    //  $${__detail.prices[${adult}][adult_i].price}
    //  __detail.ships.${cabinship_i}.cabins
    // __detail.ships[0].cabins[0].images undefined
    function veval(code){
        var m = code.match(/^[A-Z_a-z0-9.\[\]]*$/);
        var name = m && m[0];
        err_log("=> " + code);
        if(m){
            err_log("val only: " + name);
            try {
                return  eval(name); 
            } catch (e) {
                if (e instanceof TypeError) {
                    return null;
                }
            }
        }else
            return eval(code);
    }
    code = vfunc(code, /[.\[](\${(.*?)})/);
    if(code === null) return null;
    code = vfunc(code, /(\${(.*?)})/);
    if(code === null) return null;
    var vvv = veval(code);
    //console.log(vvv);
    return vvv;
};

window.evalSet = function(path, dataScope, val){
    if(typeof val == 'string') val = `'${val}'`;
    evalScope(`dataScope.${path} = ${val}`, dataScope);
};

window.extractKey = function(str){
    var key = str.split(/[.\[]/).pop();
    var m = key.match(/\${(.*)}/);
    if(m && m[1]) key = m[1];
    return key;
};

window.removeChildItem = function(obj, matchedObjs){
   matchedObjs.each(function(k, o){
        if(obj.find(o).length > 0) 
            matchedObjs.splice(k,1);
    });
};

//templates
(function($){
    $.templates = {};
    $.templates_deferred = {};
    window.jqcModules = {};
    window.checkHtmlJs = function (name, js){
        if(js && (typeof jqcModules[name] == 'undefined')) jqcModules[name] = 0;
        if($.templates[name] && (typeof jqcModules[name] != 'undefined')) $.templates_deferred[name].resolve();
    }
    window.getHtmlForChildren = function (name){
        if(!$.templates[name] && !$.templates_deferred[name]){
            $.templates_deferred[name] = $.Deferred();
            $.ajax({cache: true, ifModified: true, url: `components/${name}.html` + (jqcAppVer?`?${jqcAppVer}`:"")}).done(function (html){ //load from cache can be qiucker
                $.templates[name] = html;
                checkHtmlJs(name, 0); 
                var re = / jqc=['"](.*?)['"] .*?>\s*?<\//g;
                while (m = re.exec(html)) {
                    getHtmlForChildren(m[1]);
                }
            });
            if(typeof jqcModules[name] == 'undefined'){
                var scriptEl = document.createElement("script");
                scriptEl.type = "text/javascript";
                scriptEl.src = `components/${name}.js` + (jqcAppVer?`?${jqcAppVer}`:"");
                scriptEl.onload = function() {
                  checkHtmlJs(name, 1);
                };
                document.getElementsByTagName('head')[0].appendChild(scriptEl);
            }
        }
    };
    window.bindLoad = function(obj, bind, data){
        err_log("bind load");
        var val = evalScope(bind, data);
        if(obj.attr("type") == 'checkbox')
            obj.prop('checked', val);
        else if(obj.attr("type") == 'radio' || obj.is('select'))
            obj.val([val]);
        else
            obj.val(val);
    }
})(jQuery);