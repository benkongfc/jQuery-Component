jQuery(function($){
    $.templates = {};
    $.templates_deferred = {};
    var loop = function(parent_obj, initData){
        initData = initData || 0;
        var name = parent_obj.attr("jqc");
        if(!$.templates[name] && !$.templates_deferred[name]){
            $.templates_deferred[name] = $.Deferred();
            $.get(`components/${name}.html?` + Math.random().toString(), '', function (html){
                $.templates[name] = html;
                $.templates_deferred[name].resolve();
            });
        }
        $.when($.templates_deferred[name]).done(function(){
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
            var tmpObj = $('<div><?div>').html(node);
            data1 = jQuery.extend(true, {}, data); //for compare

            var render = function(tObj){
                tObj.find("[jqcText]").each(function(k, obj){
                    obj = $(obj);
                    obj.text(data[obj.attr("jqcText")]);
                });
            };
            render(tmpObj); //run first render;

            //init event
            tmpObj.find("[jqcBind]").each(function(k, obj){
                obj = $(obj);
                var name = obj.attr('jqcBind');
                obj.change(function(){
                    data[name] = obj.val();
                });
            }); 

            tmpObj.find("[jqcOn]").each(function(k, obj){
                obj = $(obj);
                var val = eval('e={'+obj.attr('jqcOn')+'}');
                $.each(val, function(onKey, onVal){
                    obj.on(onKey, function(){
                        var changed = false;
                        $.each(onVal, function(vk, vv){
                            if(vk != 'fire'){
                                if(data[vk] != vv){
                                    data[vk] = vv;
                                    changed = true;
                                }
                            }else{ //fire functions
                                if(vv.substr(0, 7) == 'parent.'){
                                    eval("parent_obj.parent_node.scope('data." + vv.substr(7) + ";data.update()', data);");
                                }else{
                                    for (var i in data) {
                                        if(!(data[i] instanceof Function))
                                            eval("var " + i + " = '" + data[i] + "'");
                                    }
                                    eval("data." + vv + ";data.update()");                           
                                }
                            }
                            if(changed)
                                render(parent_obj);    
                        });
                    });
                });
                data.rendered = 1;
            });

            tmpObj.find("[jqcCallback]").each(function(k, obj){
                obj = $(obj);
                var val = obj.attr('jqcCallback').split(":");
                data[val[0]] = data[val[1]];
            });

            tmpObj.find("[jqcEach]").each(function(k, obj){
                obj = $(obj);
                var name = obj.attr('jqcEach');
                if(!node.link) node.link = {};
                node.link[name] = {targetNode: node, destField: name}; //link autorender
                var html = obj[0].outerHTML;
                var bFirst = true;
                $.each(data[name], function(kk, vv){
                    if(!bFirst){
                        var new_obj = $(html);
                        obj.after(new_obj);
                        obj = new_obj;
                    }
                    if(obj.attr('jqc'))
                        loop(obj, vv);
                    bFirst = false;
                });
                render(obj.parent());
            });
            tmpObj.find("[jqcIf]").each(function(k, obj){
                obj = $(obj);
                var code = obj.attr('jqcIf');
                var b = false;
                for (var i in data) {
                    if(!(data[i] instanceof Function))
                        eval("var " + i + " = '" + data[i] + "'");
                }
                eval("b = (" + code + ")");
                if(!b)
                    obj.remove();
            });

            tmpObj.find('[jqc]').each(function(k, obj){
                obj = $(obj);
                if(obj.is("[jqcEach]")) return;
                obj.parent_node = node;
                loop(obj);
            });

            //linking
            if(parent_obj.is('[jqcLink]')){
                var field = parent_obj.attr('jqcLink').split(":")[0];
                var destField = parent_obj.attr('jqcLink').split(":")[1];
                var targetNode = parent_obj.parent_node;
                if(!targetNode.link) targetNode.link = {};
                targetNode.link[field] = {targetNode: node, destField: destField};
                data[destField] = targetNode.get(field);;
            }
            data.update = function(){
                $.each(data, function(k, v){
                    if(!(v instanceof Function)){
                        if(JSON.stringify(v) != JSON.stringify(data1[k])){ //deep compare
                            if(node.link && node.link[k]){
                                var destField = node.link[k].destField;
                                var targetNode = node.link[k].targetNode;
                                targetNode.set(destField, v); //re-render
                                targetNode.copy(destField, v);   
                                if(targetNode != node)
                                    node.copy(k, v);      
                            }                 
                        }
                    }
                });
            };

            //local scope function
            node.scope = function(func, remoteData){
                for (var i in remoteData) {
                    if(!(remoteData[i] instanceof Function))
                        eval("var " + i + " = '" + remoteData[i] + "'");
                }
                eval(func); //local scope
            };

            node.copy = function(k, v){
                data1[k] = JSON.parse(JSON.stringify(v));
            };
            node.set = function(k, v){
                data[k] = v;
                loop(parent_obj, data);
            };
            node.get = function(k){
                return data[k];
            };

            parent_obj.html(node);
        });  
    };         
    loop($('[jqc]'));
});