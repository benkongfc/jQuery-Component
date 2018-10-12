jqcModules.cmd_multicabins = {
    cabinsAmount: [0],
    
    addCab : function() {
        this.cabinsAmount.push(this.cabinsAmount.length);
    },
    
    delCab : function(index) {
        for(var i=0;i < this.cabinsAmount.length;i++){
            if(i <= index) continue;
            jqcDatas[this.nodeId + "_cmd_onecabin_" + (i)].ppl = extend(jqcDatas[this.nodeId + "_cmd_onecabin_" + (i+1)].ppl);
        }
        var c = this.cabinsAmount.length;
        this.cabinsAmount = [];
        for(var i=0;i < c-1;i++) this.cabinsAmount.push(i);
    }
}