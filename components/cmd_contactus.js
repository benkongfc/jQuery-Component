jqcModules.cmd_contactus = {
        sent: false,
        fullname: '',
        email: '',
        phone: '',
        message: '',
        err: false,
        sendcontact: function() {
            var This = this;
            var fb = firebase.database().ref("contactus");
            if(!this.fullname || !this.email || !this.message) {
                This.err = true;
            }else{
                This.err = false;
                var da = {};
                $.each(this, function(k, v){ 
                    if(typeof v != 'function')
                        da[k] = v; 
                }); 
                da['date'] = new Date+"";
                fb.push(da).then(function(a) { 
                    This.sent = true;
                    this.fullname = this.email = this.phone = this.message = '';
                    This.update();
                });
            }
        }
    }