jqcModules.cmd_onecabin = {
    ppl: [] ,
    ppl_source: { first: '', last: '', dob: ''},
    
    init : function() {
        if(this.ppl.length == 0){
            for(; this.ppl.length < this.enqAdult; )
                this.ppl.push( deepCopy(this.ppl_source ) ); 
        }
    },
    
    changeCabin : function(adult, cabinIndex){
        this.enqAdult = adult;
        this.enqCabinIndex = cabinIndex;
        if(this.ppl.length > adult) this.ppl.splice(adult, this.ppl.length - adult);
        for(; this.ppl.length < adult; )
            this.ppl.push( deepCopy(this.ppl_source ) );    
    }
    
}