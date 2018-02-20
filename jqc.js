(function($){
    $.templates = {};
    $.templates_deferred = {};
    $.nodes = {};
    var loop = function(parent_obj, initData, nodeId){
        initData = initData || 0;
        nodeId = nodeId || '';
        var name = parent_obj.attr("jqc");
        if(!$.templates[name] && !$.templates_deferred[name]){
            $.templates_deferred[name] = $.Deferred();
            $.get(`components/${name}.html?` + Math.random().toString(), '', function (html){
                $.templates[name] = html;
                $.templates_deferred[name].resolve();
            });
        }
        $.when($.templates_deferred[name]).done(function(){
            //console.log("start " + name);
            var html = $.templates[name];
            var script = html.match(/<script>([\S\s]*?)<\/script>/i);
            var data = data1 = {};
            if(script){
                script = script[1];
                html = html.replace(/<script>([\S\s]*?)<\/script>/i);
                if(!initData){
                    data = eval(script);
                    if(data.init) data.init();
                }
            }
            if(initData) data = initData;
            var node = $(html);
            node.parent_obj = parent_obj;
            if(nodeId) $.nodes[nodeId] = node;
            var tmpObj = $('<div></div>').html(node);
            data1 = jQuery.extend(true, {}, data); //for compare

            //local scope function
            node.scope = function(func, remoteData){
                for (var i in remoteData) {
                    if(!(remoteData[i] instanceof Function)) eval("var " + i + " = '" + remoteData[i] + "'");
                }
                eval(func); //local scope
            };

            node.copy = function(k, v){
                data1[k] = JSON.parse(JSON.stringify(v));
            };
            node.set = function(k, v){
                data[k] = v;
            };
            node.get = function(k){
                return data[k];
            };
            node.reload = function() { //slow func
                if(nodeId) $.nodes[nodeId] = null;
                loop(node.parent_obj, data, nodeId);
            }
            node.addLink = function(field, destField, localNode, obj){
                //console.log("addLink " + field);
                destField = destField || field;
                localNode = localNode || node;
                obj = obj || 0;
                if(!node.link) node.link = {};
                    node.link[field] = {targetNode: localNode, targetObj: obj, destField: destField}; //link autorender
            }

            var parseFieldName = function(str){
                return str.split(/[ .=\[]/)[0];
            }

            //linking
            node.onReload = function() {
                if(node.parent_obj.is('[jqcLink]')){ //REVERSE linking
                    var field = node.parent_obj.attr('jqcLink').split(":")[0];
                    var destField = node.parent_obj.attr('jqcLink').split(":")[1];
                    var targetNode = node.parent_obj.parent_node;
                    targetNode.addLink(field, destField, node);
                    data[destField] = targetNode.get(field);
                }
            };
            node.onReload();

            //init tags
            var templates_counter = {};
            node.loopObjs = function(objs, eachData1){
                var eachData = eachData1 || 0;
                objs.find("[jqcBind],[jqcOn],[jqcCallback],[jqcEach],[jqcIf],[jqcText]").each(function(k, obj){
                    obj = $(obj);   

                    if(obj.attr('jqcBind')){
                        var bind = obj.attr('jqcBind');
                        obj.change(function(){
                            data[bind] = obj.val(); //2 way binding
                        });
                        obj.val(data[bind]);
                        if(!node.link) node.link = {};
                        node.link[bind] = {targetNode: node, targetObj: obj, destField: bind}; //2 way binding
                    }

                    if(obj.attr('jqcOn') && (eachData || !obj.parents().is('[jqcEach]'))){
                        var val = eval('e={'+obj.attr('jqcOn')+'}');
                        $.each(val, function(onKey, onVal){
                            obj.on(onKey, function(){
                                $.each(onVal, function(vk, vv){
                                    vv = vv.replace("{.}", `"${eachData}"`);
                                    if(vk != 'fire'){
                                        data[vk] = vv;
                                        data.update(); 
                                    }else{ //fire functions
                                        if(vv.substr(0, 7) == 'parent.'){
                                            eval("node.parent_obj.parent_node.scope('data." + vv.substr(7) + ";data.update()', data);");
                                        }else{
                                            for (var i in data) {
                                                if(!(data[i] instanceof Function))
                                                    eval("var " + i + " = '" + data[i] + "'");
                                            }
                                            eval("data." + vv + ";data.update()");                           
                                        }
                                    }
                                });
                            });
                        });
                    }

                    if(obj.attr('jqcCallback')){
                        var val = obj.attr('jqcCallback').split(":");
                        data[val[0]] = data[val[1]];
                    }

                    if(obj.attr('jqcEach')){
                        var each = obj.attr('jqcEach');
                        node.addLink(each);
                        var html = obj[0].outerHTML;
                        var bFirst = true;
                        $.each(data[each], function(kk, vv){
                            if(!bFirst){
                                var new_obj = $(html);
                                obj.after(new_obj);
                                obj = new_obj;
                            }
                            if(obj.attr('jqc'))
                                loop(obj, vv);
                            else 
                                node.loopObjs(obj, vv);
                            bFirst = false;
                        });
                    }

                    if(obj.attr('jqcIf')){
                        var code = obj.attr('jqcIf');
                        node.addLink(parseFieldName(code));
                        var b = false;
                        for (var i in data) {
                            if(!(data[i] instanceof Function))
                                eval("var " + i + " = '" + data[i] + "'");
                        }
                        eval("b = (" + code + ")");
                        if(!b){
                            var i = $.inArray(obj[0], node);
                            if(i > -1){
                                obj.remove();
                                node.splice(i,1); //node is another array having this obj, so have to manually remove it
                            }else obj.remove();
                        }
                    }

                    if(obj.attr('jqcText')){
                        var name = obj.attr("jqcText");
                        if(name == '{.}'){
                            if(eachData)obj.text(eachData);
                        }else{
                            obj.text(eval("data." + obj.attr("jqcText")));
                            node.addLink(parseFieldName(obj.attr('jqcText')));
                        }
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
                    if($.nodes[nodeFullId]){
                        var childNode = $.nodes[nodeFullId];
                        obj.parent_node = node;
                        childNode.parent_obj = obj;
                        childNode.onReload();
                        obj.html(childNode);
                    }else{
                        obj.parent_node = node;
                        loop(obj, null, nodeFullId);
                    }
                });
            }
            node.loopObjs(tmpObj);
            data.update = function(){
                console.log("data checking");
                var nodes = [];
                $.each(data, function(k, v){
                    if(!(v instanceof Function)){
                        if(JSON.stringify(v) != JSON.stringify(data1[k])){ //deep compare
                            if(node.link && node.link[k]){
                                var destField = node.link[k].destField;
                                var targetNode = node.link[k].targetNode;
                                var targetObj = node.link[k].targetObj || 0;
                                targetNode.set(destField, v);
                                console.log("data changed " + destField);
                                if(targetObj){
                                    //console.log("quick load data");
                                    if(targetObj.is("input,select,textarea")) targetObj.val(v); 
                                    else targetObj.text(v);
                                }else nodes.push(targetNode); //re-render
                                targetNode.copy(destField, v);   
                                if(targetNode != node) node.copy(k, v);      
                            }                 
                        }
                    }
                });
                nodes = $.unique(nodes);
                $.each(nodes, function(){
                    this.reload();
                })
            };

            console.log("load " + name);
            node.parent_obj.html(node);
        });  
    };  
    window.jqcLoop = function(id, appName){
        loop($(id), null, appName);     
    }  
})(jQuery);