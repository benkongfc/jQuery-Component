jqcModules.cmd_details = {
        __detail: {},
        prices: [],
        hasDecks: false,
        adultSelected: 2,
        enqAdult: 2,
        cabinSelected: 0,
        showBook: false,
        
        init: function() {
          if(this.__detail && this.__detail.ships){
            this.hasDecks = this.__detail.ships[0].decks.length > 0;
            this.shipCount = this.__detail.ships.length;
          }
        },
        
        clickBook: function(adult, idx) {
          this.adultSelected = adult;
          this.cabinSelected = idx;
          this.showBook = true;
          
          $("html, body").animate({ scrollTop: $("#formTabs").offset().top }, "slow");
        }
    }