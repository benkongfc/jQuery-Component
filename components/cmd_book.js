jqcModules.cmd_book = {
    err: false,
    errMsg: '',
    formData: {
      leadName: '',
      email: '',
      phone: '',
      postcode: '',
      cruisedBefore: 'Yes',
      comments: '',
      terms: false,
      subscribe: true,
      cabins: {}
    },
    enqAdult: 2,
    enqCabinIndex: 0,
    sent: false,
    
    sendBooking: function() {
      var This = this;
      var required = ['leadName', 'email', 'cruisedBefore', 'terms'];
      This.err = [];
      //validate
      required.forEach(function(v, k) {
        if(!This.formData[v]) This.err.push(v);
      });
      this.formData['cabinAmount'] = jqcDatas[this.nodeId+'_cmd_multicabins_1']['cabinsAmount'].length;
      for(var ci = 0;ci < this.formData['cabinAmount']; ci++){
        var ppl = jqcDatas[this.nodeId+'_cmd_multicabins_1_cmd_onecabin_'+(ci+1)]['ppl'];
        for(var pi = 0;pi < ppl.length; pi++){
          if(!ppl[pi].first) This.err.push('cabin\'s first name');
          if(!ppl[pi].last) This.err.push('cabin\'s last name');
          if(!ppl[pi].dob) This.err.push('cabin\'s dob');
        }
      }
      ///////////
      if(!this.err.length){
        var fb = firebase.database().ref("booking");
        this.formData['date'] = new Date+"";
        this.formData['productId'] = this.__detail.id;
        for(var ci = 0;ci < this.formData['cabinAmount']; ci++){
          var adult = jqcDatas[this.nodeId+`_cmd_multicabins_1_cmd_onecabin_${ci+1}`]['enqAdult'] + 0;
          var cabinIndex = jqcDatas[this.nodeId+`_cmd_multicabins_1_cmd_onecabin_${ci+1}`]['enqCabinIndex'] + 0;
          this.formData['cabins'][ci] = {};
          this.formData['cabins'][ci]['Adult_Based'] = this.__detail.cabin_adults[adult];
          this.formData['cabins'][ci]['Cabin_Index'] = this.__detail.prices[adult][cabinIndex].name + " - $" + this.__detail.prices[adult][cabinIndex].price;
          this.formData['cabins'][ci]['People'] = jqcDatas[this.nodeId+'_cmd_multicabins_1_cmd_onecabin_'+(ci+1)]['ppl'];
        }
        fb.push(this.formData).then(function(a) { 
            This.sent = true;
            This.update();
        });
      }else{
        this.errMsg = 'Fields ' + this.err.join(", ") + ' above are required. Please fill them in.'
      }
    }
}