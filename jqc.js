(function($){
    //console.log = function() {};
    $.templates = {};
    $.templates_deferred = {};
    var datas = {};
    var parent_objs = {};
    var loop = function(parent_obj, initData, nodeId){
        initData = initData || 0;
        var name = parent_obj.attr("jqc");
        if(!$.templates[name] && !$.templates_deferred[name]){
            $.templates_deferred[name] = $.Deferred();
            $.get(`components/${name}.html?` + Math.random().toString(), '').done(function (html){ //load from cache can be qiucker
                $.templates[name] = html;
                $.templates_deferred[name].resolve();
            });
        }
        $.when($.templates_deferred[name]).done(function(){
            var html = $.templates[name];
            var script = html.match(/<script>([\S\s]*?)<\/script>/i);
            html = html.replace(/<script>([\S\s]*?)<\/script>/i);
            var data;
            var data1;
            if(initData) data = initData;
            else if(script){
                script = script[1];           
                data = eval(script);
                if(!data) data = {};
                data.__bRun = true;
                if(data.load) data.load();
                data.bFirstInit = true;
            }
            var node = $(html);
            if(nodeId) datas[nodeId] = node;
            if(nodeId) parent_objs[nodeId] = parent_obj;
            var tmpObj = $('<div></div>').html(node);
            data1 = jQuery.extend(true, {}, data); //for compare

            //local scope function
            node.scope = function(func, remoteData){
                for (var i in remoteData) {
                    if(i.indexOf('__') != 0 && !(remoteData[i] instanceof Function)) eval("var " + i + " = (" + JSON.stringify(remoteData[i]) + ")");
                }
                return eval(func); //local scope
            };

            node.copy = function(k, v){
                data1[k] = JSON.parse(JSON.stringify(v));
            };
            node.set = function(k, v){
                if(v instanceof Object)
                    data[k] = JSON.parse(JSON.stringify(v));
                else
                    data[k] = v;
            };
            node.get = function(k){
                if(data[k] instanceof Object)
                    return JSON.parse(JSON.stringify(data[k]));
                return data[k];
            };
            node.reload = function() { //slow func
                //console.log("reload " + name);
                loop(parent_objs[nodeId], data, nodeId);
            }
            node.addLink = function(field, destField, localNode, obj){
                destField = destField || field;
                localNode = localNode || nodeId;
                obj = obj || 0;
                if(!node.link) node.link = {};
                if(!node.link[field]) node.link[field] = [];
                var b = false;
                node.link[field].forEach(function(i){
                    if(i.targetNode == localNode && i.targetObj == obj && i.destField == destField)
                        b = true;
                });
                if(!b){
                    //console.log("add link " + nodeId + " > " + localNode + " : " + destField);
                    node.link[field].push({targetNode: localNode, targetObj: obj, destField: destField}); //link autorender
                }
            }

            var parseFieldName = function(str){
                return str.split(/[ .=\[]/)[0];
            }

            //linking
            node.onReload = function() {
                if(parent_objs[nodeId].is('[jqcLink]')){ //REVERSE linking
                    var links = parent_objs[nodeId].attr('jqcLink').split(",");
                    $.each(links, function(i, link){
                        var field = link.split(/<?->/)[0].trim();
                        var destField = link.split(/<?->/)[1].trim();
                        var targetNode = parent_objs[nodeId].parent_node;
                        if(link.indexOf("<->") > -1)
                            node.addLink(destField, field, targetnodeId); //up
                        targetNode.addLink(field, destField, nodeId); //down
                        if(data.bFirstInit){
                            //console.log("loadData from up link");
                            data[destField] = targetNode.get(field);
                        }
                    });
                }
            };
            node.onReload();
            if(data.init) 
                data.init();
            //console.log(data);
            //init tags
            var templates_counter = {};
            function resolve(path, obj) {
                return path.split('.').reduce(function(prev, curr) {
                    return prev ? prev[curr] : null
                }, obj || self)
            }
            node.loopObjs = function(objs, eachStr, eachStr1){
                var eachStr = eachStr || '';
                var eachStr1 = eachStr1 || '';
                objs.find("[jqcBind],[jqcOn],[jqcCallback],[jqcEach],[jqcIf],[jqcText],[jqcSrc],[jqcIfClass]").each(function(k, obj){
                    obj = $(obj);   
                    if(obj.parents().is('[jqcEach]') && obj.parents('[jqcEach]')[0] != objs[0]) return true; //skip child each
                    if(obj.attr('jqcBind')){
                        var bind = obj.attr('jqcBind');
                        obj.change(function(){
                            data[bind] = obj.val(); //2 way binding
                        });
                        obj.val(data[bind]);
                        node.addLink(bind, bind, nodeId, obj);
                    }

                    if(obj.attr('jqcOn')){
                        var val = eval('e={'+obj.attr('jqcOn')+'}');
                        $.each(val, function(onKey, onVal){
                            obj.on(onKey, function(){
                                $.each(onVal, function(vk, vv){
                                    vv = vv.replace("{.}", eachStr1);
                                    if(vk != 'fire'){
                                        data[vk] = vv;
                                    }else{ //fire functions
                                        if(vv.substr(0, 7) == 'parent.'){
                                            eval("parent_objs[nodeId].parent_node.scope('data." + vv.substr(7) + ";data.update()', data);");
                                        }else{
                                            for (var i in data) {
                                                if(i.indexOf('__') != 0 && !(data[i] instanceof Function))
                                                    eval("var " + i + " = (" + JSON.stringify(data[i]) + ")");
                                            }
                                            
                                            eval("data." + vv);                           
                                        }
                                    }
                                });
                                data.update(); 
                            });
                        });
                    }

                    if(obj.attr('jqcCallback')){
                        var val = obj.attr('jqcCallback').split(":");
                        data[val[0]] = data[val[1]];
                    }

                    if(obj.attr('jqcEach')){
                        var each = obj.attr('jqcEach');
                        each = each.replace("{.}", eachStr);
                        node.addLink(parseFieldName(each));
                        var html = obj[0].outerHTML;
                        var bFirst = true;
                        //cdata[0].chars
                        //if(each == 'learnChars')console.log(resolve(each, data));
                        $.each(resolve(each, data), function(kk, vv){
                            if(!bFirst){
                                var new_obj = $(html);
                                obj.after(new_obj);
                                obj = new_obj;
                            }
                            obj.parent_node = node;
                            if(obj.attr('jqc')){
                                var childName = obj.attr('jqc');
                                templates_counter[childName] = templates_counter[childName] || 0;
                                templates_counter[childName]++;
                                var nodeFullId = `${nodeId}_${childName}_${templates_counter[childName]}`;
                                loop(obj, vv, nodeFullId);
                            }else 
                                node.loopObjs(obj, `${each}.${kk}`, `${each}[${kk}]`);
                            bFirst = false;
                        });
                    }

                    if(obj.attr('jqcIf')){
                        var code = obj.attr('jqcIf');
                        node.addLink(parseFieldName(code));
                        var b = false;
                        for (var i in data) {
                            if(i.indexOf('__') != 0 && !(data[i] instanceof Function))
                                eval("var " + i + " = (" + JSON.stringify(data[i]) + ")");
                        }
                        b = eval(code);
                        if(!b){
                            var i = $.inArray(obj[0], node);
                            //console.log("if remove " + code);
                            var counter = {};
                            obj.find("[jqc]").each(function(j, itm){
                                itm = $(itm);
                                var name = itm.attr("jqc");
                                counter[name]= counter[name] || 0;
                                counter[name]++;
                                if(datas[nodeId + '_' + name + '_' + counter[name]])
                                    datas[nodeId + '_' + name + '_' + counter[name]].set('__bRun', false);
                            });
                            if(i > -1){
                                obj.remove();
                                node.splice(i,1); //node is another array having this obj, so have to manually remove it
                            }else obj.remove();
                        }else{
                            var counter = {};
                            obj.find("[jqc]").each(function(j, itm){
                                itm = $(itm);
                                var name = itm.attr("jqc");
                                counter[name]= counter[name] || 0;
                                counter[name]++;
                                datas[nodeId + '_' + name + '_' + counter[name]] = null; //reload
                                //console.log("reset " + nodeId + '_' + name + '_' + counter[name]);
                            });
                        }
                    }
                    if(obj.attr('jqcIfClass')){
                        var code = obj.attr('jqcIfClass');
                        code = code.replace("{.}", eachStr1);
                        node.addLink(parseFieldName(code));
                        var b = false;
                        for (var i in data) {
                            if(i.indexOf('__') != 0 && !(data[i] instanceof Function))
                                eval("var " + i + " = (" + JSON.stringify(data[i]) + ")");
                        }
                        b = eval(code);
                        if(b){
                            obj.attr('class', b);
                        }
                    }

                    if(obj.attr('jqcText')){
                        var name = obj.attr("jqcText");
                        //cdata[0].chars[0].char
                        name = name.replace("{.}", eachStr);
                        obj.html(resolve(name, data));
                        node.addLink(parseFieldName(name));
                    }
                    if(obj.attr('jqcSrc')){
                        var name = obj.attr("jqcSrc");
                        name = name.replace("{.}", eachStr);
                        obj.attr('src', resolve(name, data));
                        node.addLink(parseFieldName(name));
                    }
                });

                //last order
                objs.find('[jqc]').each(function(k, obj){
                    obj = $(obj);
                    if(obj.is("[jqcEach]")) return;
                    var childName = obj.attr('jqc');
                    templates_counter[childName] = templates_counter[childName] || 0;
                    templates_counter[childName]++;
                    var nodeFullId = `${nodeId}_${childName}_${templates_counter[childName]}`;
                    if(datas[nodeFullId]){
                        //console.log("has data " + nodeFullId);
                        obj.parent_node = node;
                        parent_objs[nodeFullId] = obj;
                        datas[nodeFullId].onReload();
                        obj.html(datas[nodeFullId]);
                    }else{
                        //console.log("no data");
                        obj.parent_node = node;
                        loop(obj, null, nodeFullId);
                    }
                });
            }
            node.loopObjs(tmpObj);
            data.update = function(){ //be careful of current scope!!! not match var node
                //console.log("data checking " + name);
                //var node = datas[nodeId];
                var nodes = [];
                $.each(data, function(k, v){
                    if(k.indexOf('__') != 0 && !(v instanceof Function) && k != 'bFirstInit'){
                        //console.log("data checking field " + k);
                        var bChanged = false;
                        if(JSON.stringify(v) != JSON.stringify(data1[k])){ //deep compare
                            //console.log("data not eq "+k);
                            bChanged = true;
                        }else{
                            $.each(node.link[k], function(i, event){
                                var destField = event.destField;
                                var targetNode = datas[event.targetNode];
                                var targetObj = event.targetObj || 0;
                                if(targetNode != node)
                                    bChanged = true; //always update others node link
                            });
                        }
                        //if(bChanged)console.log(node.link);
                        if(bChanged && node.link && node.link[k]){
                            //console.log("data not eq link "+k);
                            $.each(node.link[k], function(i, event){
                                var destField = event.destField;
                                var targetNode = datas[event.targetNode];
                                var targetObj = event.targetObj || 0;
                                //console.log(JSON.stringify(targetNode.get(destField)) + " " + JSON.stringify(v));
                                //todo targetNode removed somethings
                                if((targetNode == node) || (JSON.stringify(targetNode.get(destField)) != JSON.stringify(v))){
                                    targetNode.set(destField, v);
                                    //console.log("data changed " + targetNode.scope("name", []) + " " + destField);
                                    if(targetObj){
                                        //console.log("quick load data");
                                        if(targetObj.is("input,select,textarea")) targetObj.val(v); 
                                        else targetObj.text(v);
                                    }else nodes.push(targetNode); //re-render                               
                                    targetNode.copy(destField, v);   
                                    node.copy(k, v); //make signal off
                                }
                            });     
                        }
                    }                                       
                });
                nodes = $.unique(nodes);
                nodes = nodes.filter(function(i){
                    var b = true;
                    $.each(nodes, function(z, j){
                        if(j.find(i).length > 0)
                            b = false;
                    });
                    return b;
                });
                $.each(nodes, function(){
                    this.reload();
                })
            };

            //console.log("load " + name);
            //console.log(node);
            data.bFirstInit = false;
            parent_objs[nodeId].html(node);
            /*parent_objs[nodeId].css("border", "1px solid gray");
            var cObj = parent_objs[nodeId];
            setTimeout(function() {
                cObj.css("border", "1px solid transparent");
            }, 1000);*/
            if(data.after) data.after();
        });  
    };  
    window.jqcLoop = function(id, appName){
        loop($(id), null, appName);     
    }  
})(jQuery);