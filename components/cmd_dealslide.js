jqcModules.cmd_dealslide = {
    favor: false,
    init: function() {
        var fav = JSON.parse(localStorage.getItem("favors"));
        if(fav) this.favor = !!fav[this.id];
        else this.favor = false;
    },
    switchFav: function(id){
        var fav = JSON.parse(localStorage.getItem("favors"));
        if(!fav) fav = {};
        fav[id] = !fav[id];
        if(!fav[id]) delete fav[id];
        localStorage.setItem("favors", JSON.stringify(fav));
        
        this.favor = fav[id];
    }
}