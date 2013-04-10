define(['views/teeContent'],function(TeeContentView){
    var TeesView = Backbone.View.extend({
        el: '#teeContent',
        events:{
        },
        initialize: function(){
        },
        render:function(){
            var self = this;
            self.$el.find("div.tee").remove();
            this.collection.forEach(function(tee){
                var item = new TeeContentView({model:tee});
                self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return TeesView;
});