(function($){
    console.log = function() {};
    $.templates = {};
    $.templates_deferred = {};
    var datas = {};
    var loop = function(parent_obj, initData, nodeId){
        initData = initData || 0;
        var name = parent_obj.attr("jqc");
        if(!$.templates[name] && !$.templates_deferred[name]){
            $.templates_deferred[name] = $.Deferred();
            $.get(`components/${name}.html?` + Math.random().toString(), '', function (html){ //load from cache can be qiucker
                $.templates[name] = html;
                $.templates_deferred[name].resolve();
            });
        }
        $.when($.templates_deferred[name]).done(function(){
            //console.log("start " + name);
            var html = $.templates[name];
            var script = html.match(/<script>([\S\s]*?)<\/script>/i);
            html = html.replace(/<script>([\S\s]*?)<\/script>/i);
            var data = {};
            var data1 = {};
            if(initData) data = initData;
            else if(script){
                script = script[1];           
                data = eval(script);
                if(!data) data = {};
                if(data.load) data.load();
                data.bFirstInit = true;
            }
            if(nodeId) datas[nodeId] = data;
            if(name != 'post_row' && name != 'post_table')
                console.log(data);
            var node = $(html);
            node.parent_obj = parent_obj;
            var tmpObj = $('<div></div>').html(node);
            data1 = jQuery.extend(true, {}, data); //for compare

            //local scope function
            node.scope = function(func, remoteData){
                for (var i in remoteData) {
                    if(!(remoteData[i] instanceof Function)) eval("var " + i + " = (" + JSON.stringify(remoteData[i]) + ")");
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
                //if(nodeId) $.datas[nodeId] = null;
                loop(node.parent_obj, data, nodeId);
            }
            node.addLink = function(field, destField, localNode, obj){
                destField = destField || field;
                localNode = localNode || node;
                obj = obj || 0;
                if(!node.link) node.link = {};
                if(!node.link[field]) node.link[field] = [];
                node.link[field].push({targetNode: localNode, targetObj: obj, destField: destField}); //link autorender
            }

            var parseFieldName = function(str){
                return str.split(/[ .=\[]/)[0];
            }

            //linking
            node.onReload = function() {
                if(node.parent_obj.is('[jqcLink]')){ //REVERSE linking
                    var links = node.parent_obj.attr('jqcLink').split(",");
                    $.each(links, function(i, link){
                        var field = link.split(/<?->/)[0].trim();
                        var destField = link.split(/<?->/)[1].trim();
                        var targetNode = node.parent_obj.parent_node;
                        if(link.indexOf("<->") > -1)
                            node.addLink(destField, field, targetNode); //up
                        targetNode.addLink(field, destField, node); //down
                        if(data.bFirstInit){
                            console.log("loadData from up link");
                            data[destField] = targetNode.get(field);
                        }
                    });
                }
            };
            node.onReload();
            if(data.init) data.init();
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
                        node.addLink(bind, bind, node, obj);
                    }

                    if(obj.attr('jqcOn') && (eachData || !obj.parents().is('[jqcEach]'))){
                        var val = eval('e={'+obj.attr('jqcOn')+'}');
                        $.each(val, function(onKey, onVal){
                            obj.on(onKey, function(){
                                console.log(data);
                                console.log(datas[nodeId]);
                                console.log(datas.app_search_bar_1);
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
                                                    eval("var " + i + " = (" + JSON.stringify(data[i]) + ")");
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
                                eval("var " + i + " = (" + JSON.stringify(data[i]) + ")");
                        }
                        b = eval(code);
                        if(!b){
                            var i = $.inArray(obj[0], node);
                            console.log("if remove " + code);
                            if(i > -1){
                                obj.remove();
                                node.splice(i,1); //node is another array having this obj, so have to manually remove it
                            }else obj.remove();
                        }
                    }

                    if(obj.attr('jqcText')){
                        var name = obj.attr("jqcText");
                        if(name == '{.}'){
                            if(eachData)obj.html(eachData);
                        }else{
                            obj.html(eval("data." + obj.attr("jqcText")));
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
                    if(datas[nodeFullId]){
                        console.log("has data");
                        console.log(datas[nodeFullId]);
                        obj.parent_node = node;
                        loop(obj, datas[nodeFullId], nodeFullId); //load data
                    }else{
                        console.log("no data");
                        obj.parent_node = node;
                        loop(obj, null, nodeFullId);
                    }
                });
            }
            node.loopObjs(tmpObj);
            data.update = function(){
                console.log("data checking " + name);
                console.log(data);
                console.log(data1);
                console.log(datas.app_search_bar_1);
                var nodes = [];
                $.each(data, function(k, v){
                    if(!(v instanceof Function) && k != 'bFirstInit'){
                        console.log("data checking field " + k);
                        var bChanged = false;
                        if(JSON.stringify(v) != JSON.stringify(data1[k])){ //deep compare
                            console.log("data not eq "+k);
                            bChanged = true;
                        }else{
                            $.each(node.link[k], function(i, event){
                                var destField = event.destField;
                                var targetNode = event.targetNode;
                                var targetObj = event.targetObj || 0;
                                if(targetNode != node)
                                    bChanged = true; //always update others node link
                            });
                        }
                        if(bChanged && node.link && node.link[k]){
                            console.log("data not eq link "+k);
                            $.each(node.link[k], function(i, event){
                                var destField = event.destField;
                                var targetNode = event.targetNode;
                                var targetObj = event.targetObj || 0;
                                //console.log(JSON.stringify(targetNode.get(destField)) + " " + JSON.stringify(v));
                                if((targetNode == node) || (JSON.stringify(targetNode.get(destField)) != JSON.stringify(v))){
                                    targetNode.set(destField, v);
                                    console.log("data changed " + targetNode.scope("name", []) + " " + destField);
                                    if(targetObj){
                                        console.log("quick load data");
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
                        j.each(function(z, k){
                            if(k == i.parent()[0])
                                b = false;
                        });
                    });
                    return b;
                });
                $.each(nodes, function(){
                    this.reload();
                })
            };

            console.log("load " + name);
            data.bFirstInit = false;
            node.parent_obj.html(node);
            if(data.after) data.after();
        });  
    };  
    window.jqcLoop = function(id, appName){
        loop($(id), null, appName);     
    }  
})(jQuery);