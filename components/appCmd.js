
    jqcModules.appCmd = {
        //server: 'http://dev.cruisemegadeals.com:31381/wp-json/cmd_app/v1/all_deals',
        server: "data/all_deals.json",
        __deals : [],
        ldeals: [],
        detail: null,
        page: 'list',
        ldealsIndex: 10,
        searchTxt: '',
        updated: false,
        scrolling: false,
        deals_length: 0,
        jqcNoCache: 1,
        
        replaceDomains: function(v){
            v = v.replace('http://www.firstclass.com.au/wp-content/', "https://www.firstclass.com.au/wp-content/");
            v = v.replace('http://www.cruisemegadeals.com/wp-content/', "https://www.firstclass.com.au/wp-content/") 
            return v;
        },

        getImgFromHtml: function(html) {
            if(!html) return [];
            var images = html.match(/<img.*?src=[\'\"](.*?)[\'\"]/);
            if(images){
                if(typeof images[1] == 'array'){
                    images[1].forEach(function(v){
                        if(v.indexOf("https:") < 0 && v.indexOf("http:") < 0 ) v = "https://www.firstclass.com.au" + v; 
                        else v = this.replaceDomains(v);
                    });             
                    return images[1];
                }else{
                    
                    if(images[1].indexOf("https:") < 0 && images[1].indexOf("http:") < 0 ) images[1] = "https://www.firstclass.com.au" + images[1];
                    else images[1] = this.replaceDomains(images[1]);
                    return [images[1]];
                }
            }
        },
        processHtml: function(html){
            html = html.replace(/<img(.*?)src=[\'\"](.*?)[\'\"]/g, function(match, others, src, offset, input_string){
                if(src.indexOf("://") < 0) src = "https://www.firstclass.com.au" + src;
                else src = src.replace(/https*?:\/\/.*?\//, function(domain, offset, input){
                    if(domain.indexOf("firstclass.com.au") > -1 || domain.indexOf("cruisemegadeals.com") > -1 || domain.indexOf("platinumcruising.com") > -1)
                        return "https://www.firstclass.com.au/";
                    else
                        return domain;
                });
                return `<img${others}src='${src}'`;
            });
            
            html = html.replace(/<iframe(.*?)>/g, function(match, iframe, offset, input_string){
                var wm = iframe.match(/width=[\'\"](.*?)[\'\"]/);
                var w = wm[1];
                var hm = iframe.match(/height=[\'\"](.*?)[\'\"]/);
                var h = hm[1];
                if(w && h){
                    var w1 = w;
                    w = window.innerWidth - 50;
                    h = Math.floor(w/(w1/h));
                    iframe = iframe.replace(wm[0], `width='${w}'`);
                    iframe = iframe.replace(hm[0], `height='${h}'`);
                }
                var src = iframe.match(/src=[\'\"](.*?)[\'\"]/);
                if(src[1] && src[1].indexOf("//www.") === 0){
                    iframe = iframe.replace(src[0], `src='https:${src[1]}'`);    
                }
                return `<iframe${iframe}>`;
            });
            return html;
        },
        processData: function(data, extra){
            //enable rest api for cruise and acf rest api plugin
            var This = this;
            data.forEach(function(d, i){
                var images = d.acf.itinerary_map;
                if(!images) images = d.acf.images;
                images = This.getImgFromHtml(images);
                d.thumburl = images[0];
                d.thumbul = [];
                var dep = n = f = c = p = 0;
                if(typeof d.acf.departure_dates[0] != 'undefined')
                    dep = moment(d.acf.departure_dates[0].departure_date, "YYYYMMDD").format('D MMM YYYY');
                n = d.acf.duration;
                f = d.acf.ports.split(",").shift();
                c = d.acf.ports.split(",").pop();
                if(d.acf.selling_price)
                    p = `${d.acf.selling_currency_sign}${d.acf.selling_price}`;
                else
                    p = `${d.acf.currency_sign}${d.acf.price}`;
                d.thumbul.push(`Departs ${dep}, ${n} nights`);
                d.thumbul.push(`Travel from ${f} to ${c}`);
                d.thumbul.push(d.acf.saving_text.replace(/<br>/g, " "));
                d.thumbul.push(`Book now from ${p}`);
                d.index = i;
                
                d.cabin_adults = {};
                d.rates.forEach(function(r){
                    if(r.cabin_adult_quantity == "1") d.cabin_adults[1] = "Single Adult Per Cabin";
                    if(r.cabin_adult_quantity == "2") d.cabin_adults[2] = "Two Adults Per Cabin";
                    if(r.cabin_adult_quantity == "3") d.cabin_adults[3] = "Three Adults Per Cabin";
                    if(r.cabin_adult_quantity == "4") d.cabin_adults[4] = "Four Adults Per Cabin";
                });
                d.prices = {};
                $.each(d.cabin_adults, function(k, v){
                    var idx = 0;
                    d.rates.forEach(function(r){
                        if(r.cabin_adult_quantity == k && r.cabin_price){
                            if(typeof d.prices[k] == 'undefined') d.prices[k] = [];
                            d.prices[k].push({idx: idx, name: r.cabin_name, price: r.cabin_price});  
                            idx++;
                        }
                     });
                });
                
                d.acf.itinerary_map = This.getImgFromHtml(d.acf.itinerary_map);   
                d.acf.itinerary = d.acf.itinerary.replace(/<p>&nbsp;<\/p>/g, '');
                d.shipIds.forEach(function(sid){
                    $.each(extra.ships, function(id, ship){
                       if(id == sid){
                            if(typeof d.ships == 'undefined') d.ships = [];
                            if(!ship.processed){
                                if(ship.cabins){
                                    ship.cabins.forEach(function(v){
                                        v['images'] = This.getImgFromHtml(v.images);    
                                    });
                                }
                                if(ship.decks){
                                    ship.decks.forEach(function(v){
                                        v['images'] = This.processHtml(v.images);    
                                        v['info'] = This.processHtml(v.info); 
                                    });
                                }
                                ship.post_content = This.processHtml(ship.post_content);
                                ship.processed = true;
                            }
                           d.ships.push(ship);
                           return true;
                       } 
                    });
                });
                d.cruiseline.forEach(function(cid){
                    $.each(extra.cruiselines, function(id, cl){
                       if(id == cid){
                            if(typeof d.cruiselines == 'undefined') d.cruiselines = [];
                            if(!cl.processed){
                                cl.post_content = This.processHtml(cl.post_content);
                                cl.processed = true;
                            }
                           d.cruiselines.push(cl);
                           return true;
                       } 
                    });
                });
            });
            return data;
        },
        load: function() {
            var This = this;
            
            // Initialize Firebase
            var config = {
              apiKey: "ffff-ffff",
              authDomain: "cmd-app-40bf4.firebaseapp.com",
              databaseURL: "https://cmd-app-40bf4.firebaseio.com",
              projectId: "cmd-app-40bf4",
              storageBucket: "",
              messagingSenderId: "ffff"
            };
            firebase.initializeApp(config);
    
            var deals = localStorage.getItem("deals");
            if(!deals || (jqcAppVer && localStorage.getItem("ver") != jqcAppVer)){
                $.get(this.server, {code: window.btoa(Math.floor(new Date().getTime())/1000+"")}, function(data){
                    localStorage.setItem("deals", JSON.stringify(data.posts));
                    localStorage.setItem("extra", JSON.stringify(data.extra));
                    localStorage.setItem("ver", jqcAppVer);
                    This.lastDealsTime = data.t;
                    localStorage.setItem("time", This.lastDealsTime);
                    This.__deals = This.processData(data.posts, data.extra);
                    This.deals_length = This.__deals.length;
                    This.ldeals = This.__deals.slice(0, 10);
                    This.update();
                });
            }else{
                This.reload(deals);
                This.hotLoad();
            }
            var w = $(window);
            var d = $(document);
            w.on("scroll", {passive: true}, function() {
                if(This.page != "list") return true;
                if (!This.scrolling){
                    This.scrolling = 1;
                    This.scrolling = setTimeout(function(){
                    
                        if(w.scrollTop() + w.height() > d.height() - 100) {
                            This.load10deals();
    
                            if(This.update)
                                This.update();
                        }
                        This.scrolling = false;
                    }, 1000); 
                }
                return true;
            }); 
        },
        resetSearch: function() {
            this.searchTxt = '';
            this.alldeals();
        },
        reload: function(data){
            if(data !== null){
                data = data || localStorage.getItem("deals");
                var extra = localStorage.getItem("extra");
                this.__deals = this.processData(JSON.parse(data), JSON.parse(extra));
                this.deals_length = this.__deals.length;
                this.ldealsIndex = 10;
            }
            this.ldeals = this.__deals.slice(0, this.ldealsIndex);
            this.updated = false;
        },
        reverseAnimation: function() { // need to keep all DOM un-changed for DOM caching
            var objs = $('.mainContainer>div.animated');
            objs.removeClass('slideInLeft').addClass('fadeOut');    
            setTimeout(function() {
                objs.removeClass('fadeOut').addClass('slideInLeft');   
            }, 200);
        },
        showPost: function(index){
            if(this.page != 'detail') {
                this.reverseAnimation();
                this.detail = this.__deals[index];
                this.page = 'detail';
                this.__jqcDelayRender = this.__scrollToTop = 100;
            }
        },
        back: function() {
            this.reverseAnimation();
            if(this.searchTxt == '')
                this.page = 'list';
            else
                this.page = 'search';
            this.__jqcDelayRender = 100;
        },
        todaydeals: function() {
            if(this.page != 'todaydeals') {
                this.reverseAnimation();
                this.page = 'todaydeals';
                this.detail = null;
                var This = this;
                this.__deals.some(function(c){
                    if(c.tags.indexOf(614) > -1){
                        This.detail = c;  
                        return true; 
                    }
                });
                this.__jqcDelayRender = this.__scrollToTop = 100; 
            }
        },
        hotLoad: function() {
            var This = this;
            This.updated = false;
            this.lastDealsTime = localStorage.getItem("time");
            $.get(this.server, {code: window.btoa(Math.floor(new Date().getTime())/1000+""), t: this.lastDealsTime}, function(data){
                if(typeof data.data != 'undefined')
                    data = JSON.parse(window.atob(data.data));
                var bFound = false;
                if(typeof data.t != 'undefined'){
                    This.lastDealsTime = data.t;
                    $.each(data.posts, function(k, newItm){
                        This.__deals.forEach(function(oldItm){
                            if(newItm.id == oldItm.id) bFound = true;
                        });
                        if(!bFound) return false;
                    });
                    localStorage.setItem("deals", JSON.stringify(data.posts)); 
                    localStorage.setItem("extra", JSON.stringify(data.extra));
                    localStorage.setItem("ver", jqcAppVer);
                    localStorage.setItem("time", This.lastDealsTime);
                    if(!bFound) {
                        This.updated = true;
                        This.update();
                    }
                }
            });
        },
        alldeals: function() {
            if(this.page != 'list'){
                this.reverseAnimation();
                var This = this;
                this.page = 'list';
                This.updated = false;
                this.hotLoad();
                if(this.__deals.length < 1){
                    var deals = localStorage.getItem("deals");
                    this.reload(deals);
                }else this.reload(null);
                this.__jqcDelayRender = this.__scrollToTop = 100; 
            }
        },
        favourites: function() {
            if(this.page != 'favourites'){
                this.reverseAnimation();
                this.page = 'favourites';
                this.doFavour();
                this.__jqcDelayRender = this.__scrollToTop = 100; 
            }
        },
        reloadFavour: function() {
            if(this.page == 'favourites'){
                this.doFavour();
            }
        },
        doFavour: function() {
            this.ldeals = [];
            var fav = JSON.parse(localStorage.getItem("favors"));
            if(fav){
                fav = Object.keys(fav);
                var This = this;
                this.__deals.forEach(function(v, k){
                    if(fav.indexOf(v.id+"") > -1) This.ldeals.push(v);
                });
            }            
        },
        aboutus: function(){
            if(this.page != 'aboutus'){
                this.reverseAnimation();
                this.page = 'aboutus';
                this.__jqcDelayRender = this.__scrollToTop = 100; 
            }
        },
        contactus: function(){
            if(this.page != 'contactus'){
                this.reverseAnimation();
                this.page = 'contactus';
                this.__jqcDelayRender = this.scrollToTop = 100; 
            }
        },
        load10deals: function(){
            if(this.ldealsIndex < this.__deals.length){
                var endIndex;
                if((this.ldealsIndex+10) < this.__deals.length) endIndex = this.ldealsIndex + 10;
                else endIndex = this.__deals.length;
                this.ldeals = this.__deals.slice(0, endIndex);
                this.ldealsIndex = endIndex;
            }
        },
        dosearch: function() {
            this.page = 'search';
            var This = this;
            this.ldeals = this.__deals.map(function(d, i){
                var words = This.searchTxt.toLowerCase().split(" ");
                var c = 0;
                words.forEach(function(w){
                    if(d.post_title.toLowerCase().indexOf(w) > -1) c++; 
                    else if(JSON.stringify(d.thumbul).toLowerCase().indexOf(w) > -1) c++;
                });
                if(c == words.length) return d;
                return null;
            });
            this.ldeals = this.ldeals.filter(function(i){ return !!i;});
        }
    }