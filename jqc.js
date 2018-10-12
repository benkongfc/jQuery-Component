/* global getHtmlForChildren,extend,jqcDatas,jQuery,jqcModules,err_log,deepEqual,evalScope,removeChildItem,bindLoad,evalSet,extractKey,templates_counter,deepCopy */
(function($){
    window.jqcDatas = {};
    window.templates_counter = {};
    
    var loop = function(parent_obj, addData, nodeId){
        var name = parent_obj.attr("jqc");
        var html = '';
        if(!$.templates_deferred[name]){
            if(name && parent_obj.attr("jqcEmbedVar") && (!$.templates[name]) && (html = parent_obj.html().trim())){
                $.templates[name] = html;
                $.templates_deferred[name] = true;
                parent_obj.empty();
            }else{
                getHtmlForChildren(name);
            }
        }
        $.when($.templates_deferred[name]).done(function(){
            $.templates_deferred[name] = true; //let deferred quick run
            var html = $.templates[name];
            if(!jqcDatas[nodeId]){
                jqcDatas[nodeId] = deepCopy(jqcModules[name]);
                jqcDatas[nodeId].nodeId = nodeId;
                if(jqcDatas[nodeId].load) jqcDatas[nodeId].load();
            }
            jqcDatas[nodeId]['parent_nodeId'] = parent_obj.parent_nodeId;
            jqcDatas[nodeId]['parent_obj'] = parent_obj;
            if(addData) jqcDatas[nodeId] = extend(jqcDatas[nodeId], addData);
            //self init
            if(jqcDatas[nodeId].init) jqcDatas[nodeId].init();
            err_log(jqcDatas[nodeId]);
            
            //buggy, disabled
            /*if(false && !jqcDatas[nodeId].jqcNoCache && jqcDatas['clone_'+nodeId] && deepEqual(jqcDatas[nodeId], jqcDatas['clone_'+nodeId])){
                err_log("link " + nodeId);
                if(parent_obj[0] != jqcDatas['clone_'+nodeId].parent_obj[0]) {
                    parent_obj.children().detach();
                    parent_obj.append(jqcDatas['clone_'+nodeId].parent_obj.children()); 
                    jqcDatas['clone_'+nodeId].parent_obj = jqcDatas[nodeId].parent_obj = parent_obj;
                }
                return;
            }*/
            
            err_log('loop ' + nodeId);
            
            var node = $(html); //data is old but always rebuild html
            var objs = $('<div></div>').append(node);
            
            var loopObjs = function(objs) {

                var matchedObjs = objs.find("[jqcEach],[jqcBind],[jqcOn],[jqcIf],[jqcText],[jqcAttr],[jqcIfClass],[jqcAttr]");
                
                matchedObjs.each(function(k, obj) {
                    obj = $(obj);
                    if(obj.parents('[jqc]').length > 0) return;
     
                    if(obj.attr('jqcBind')){
                        var bind = obj.attr('jqcBind');
                        bind = evalScope(`\'${bind}\'`, jqcDatas[nodeId]); //translate any var in code for click later
                        obj.change(function(){
                            if(obj.attr("type") == 'checkbox')
                                evalSet(bind, jqcDatas[nodeId], obj.prop('checked'));
                            else if(null !== obj.val())
                                evalSet(bind, jqcDatas[nodeId],  obj.val()); 
                            if(obj.is("[jqcOnBind]"))
                                jqcDatas[nodeId].update();
                        });
                        bindLoad(obj, bind, jqcDatas[nodeId]);
                    }               
                    if(obj.attr('jqcEach') && !obj.parents().is("[jqc]")){
                        err_log('Each');
                        
                        var html = obj[0].outerHTML;
                        var code = obj.attr('jqcEach');
                        var initObj = obj;
                        removeChildItem(initObj, matchedObjs); //stop child render
                        var v = evalScope(code, jqcDatas[nodeId]);
                        $.each(v, function(kk, vv){
                            var new_obj = $(html);
                            obj.after(new_obj);
                            obj = new_obj;
                            obj.attr('jqcEachI', kk);
                            jqcDatas[nodeId][extractKey(obj.attr('jqcEach'))+'_i'] = kk;
                            renderTags(obj);
                            loopObjs(obj);
                        });
                        initObj.remove(); // init item now can be removed
                        var p = obj.parent();
                        if(p.attr('jqcBind') && p.is("select")) 
                            bindLoad(p, p.attr('jqcBind'), jqcDatas[nodeId]);
                        return;
                    }
                    
                    function renderTags(obj){
                        if(obj.attr('jqcIf') && !evalScope(obj.attr('jqcIf'), jqcDatas[nodeId])){
                            removeChildItem(obj, matchedObjs)
                            obj.remove();    
                        } 
                        
                        if(obj.attr('jqcOn')){
                            var val = evalScope('e={'+obj.attr('jqcOn')+'}', jqcDatas[nodeId]);
                            $.each(val, function(onKey, onVal){
                                obj.on(onKey, function(){
                                    err_log("jqcOn " + obj.attr('jqcOn'));
                                    $.each(onVal.split("&&"), function(k, onVal1){
                                        var name = onVal1.split("(")[0];
                                        var remoteId = nodeId;
                                        if(jqcDatas[nodeId][name]){
                                            if(typeof jqcDatas[nodeId][name].func == 'function'){
                                                remoteId = jqcDatas[nodeId][name].nodeId;
                                                onVal1 = onVal1.replace(name, jqcDatas[nodeId][name].func.name);
                                            }
                                            evalScope(`jqcDatas[\'${remoteId}\'].`+onVal1, jqcDatas[nodeId]);
                                            jqcDatas[remoteId].update();
                                        }
                                    });
                                    return false;
                                });
                            });
                        }
                        if(obj.attr('jqcIfClass')){
                            var b = evalScope(obj.attr('jqcIfClass'), jqcDatas[nodeId]);
                            if(b[0]){
                                b[1].split(" ").forEach(function(v, k){
                                    obj.addClass(v);
                                });
                            }
                        }
                        if(obj.is('[jqcText]')){
                            obj.html(delayiFrame(evalScope("\`"+obj.html()+"\`", jqcDatas[nodeId])));
                        }
                        
                        if(obj.attr('jqcIfAttr')){
                            var b = evalScope(obj.attr('jqcIfAttr'), jqcDatas[nodeId]);
                            if(b[0]){
                                obj.attr(b[1], b[2]);
                            }
                        }
                        if(obj.attr('jqcAttr')){
                            var b = evalScope(obj.attr('jqcAttr'), jqcDatas[nodeId]);
                            obj.attr(b[0], b[1]);
                        }
                    };
                    renderTags(obj);
                });
            };
            loopObjs(objs);
            
            //last order
            objs.find('[jqc]').each(function(k, obj){
                obj = $(obj);
                var childName = obj.attr('jqc');
                var counterName = nodeId+'_'+childName;
                templates_counter[counterName] = templates_counter[counterName] || 0;
                templates_counter[counterName]++;
                obj.parent_nodeId = nodeId;
            
                if(obj.html() && obj.attr('jqcEmbedVar')) {
                    obj.attr('jqcEmbedVar').split(",").forEach(function(v){
                        if(!jqcModules[childName]) jqcModules[childName] = {};
                        v = v.trim();
                        v = v.split(":");
                        jqcModules[childName][v[0]] = v[1];
                    });
                }
                var addData = {};
                if(!obj.is("[jqcKeepData]")){
                    $.each(jqcModules[childName], function(k, v){
                        if(typeof v != 'function') addData[k] = extend(v);
                    }); // init data if parent need render
                }
                if(obj.attr('jqcEach') && obj.attr('jqcEachI')){
                    var code = obj.attr('jqcEach') + '[' + obj.attr('jqcEachI') + ']';
                    addData = evalScope(code, jqcDatas[nodeId]);
                    jqcDatas[nodeId][extractKey(obj.attr('jqcEach'))+'_i'] = obj.attr('jqcEachI');
                }
                if(obj.attr('jqcLink')){
                    var links = obj.attr('jqcLink').split(",");
                    $.each(links, function(i, link){
                        var field = link.split(/->/)[0].trim();
                        var destField = link.split(/->/)[1].trim();  
                        if(typeof jqcDatas[nodeId][field] == 'function')
                            addData[destField] = {nodeId: nodeId, func: jqcDatas[nodeId][field]};
                        else
                            addData[destField] = evalScope(field, jqcDatas[nodeId]);
                    });
                }
                loop(obj, addData, `${nodeId}_${childName}_${templates_counter[counterName]}`);
            });
            
            jqcDatas[nodeId].update = function() {
                var data = jqcDatas[nodeId];
                if(data.__scrollToTop) data.__scrollTop = $("html, body").scrollTop();
                rTimeOut(function() {
                    err_log("update " + nodeId);
                    for(var k in templates_counter){
                        if(k.indexOf(nodeId) > -1) 
                            templates_counter[k] = 0;
                    } 
                    
                    loop(parent_obj, null, nodeId);
                    
                    if(data.__scrollToTop){
                        $("html, body").scrollTop(0);
                        data.__scrollToTop = 0;
                    }else if(data.__scrollTop){
                        $("html, body").scrollTop(data.__scrollTop); 
                        data.__scrollTop = 0;
                    }
                }, data.__jqcDelayRender?data.__jqcDelayRender:0);
            }
            parent_obj.children().detach();
            parent_obj.append(objs.children()); 
            //if(!jqcDatas[nodeId].jqcNoCache)
            //    jqcDatas['clone_'+nodeId] = deepCopy(jqcDatas[nodeId]);
            
            parent_obj.attr("id", nodeId + new Date().getTime());
            if(jqcDatas[nodeId].after) jqcDatas[nodeId].after();
        });
    };
    
    //root loop
    window.jqcLoop = function(id, appName, ver){
        window.jqcAppVer = ver;
        loop(jQuery(id), null, appName);     
    };
})(jQuery);