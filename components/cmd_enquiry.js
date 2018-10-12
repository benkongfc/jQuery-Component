jqcModules.cmd_enquiry = {
    err: [],
    errMsg: '',
    formData: {
      cabinAmount: 1,
      leadName: '',
      email: '',
      passengersAmount: 2,
      cruisedBefore: 'yes',
      terms: false,
      subscribe: true
    },
    enqAdult: 2,
    enqCabinIndex: 0,
    sent: false,
    
    changeCabin: function(adult, cabinIndex) {
      this.enqAdult = adult;
      this.enqCabinIndex = cabinIndex;
    },
    
    sendEnquiry: function() {
      var This = this;
      var required = ['cabinAmount', 'leadName', 'email', 'passengersAmount', 'cruisedBefore', 'terms'];
      This.err = [];
      required.forEach(function(v, k) {
        if(!This.formData[v]) This.err.push(v);
      })
      if(!this.err.length){
        var fb = firebase.database().ref("enquiry");
        this.formData['date'] = new Date+"";
        this.formData['cabinType'] = this.__detail.cabin_adults[this.enqAdult];
        this.formData['cabinName'] = this.__detail.prices[this.enqAdult][this.enqCabinIndex].name + " - $" + this.__detail.prices[this.enqAdult][this.enqCabinIndex].price;
        this.formData['productId'] = this.__detail.id;
        fb.push(this.formData).then(function(a) { 
            This.sent = true;
            This.update();
        });
      }else{
        this.errMsg = 'Fields ' + this.err.join(", ") + ' above are required. Please fill them in.'
      }
    }
}