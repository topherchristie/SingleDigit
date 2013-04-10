define(['views/tee'],function(TeeView){
    var TeesView = Backbone.View.extend({
        el: '#courseNav',
        events:{
        },
        initialize: function(){
        },
        render:function(){
            var self = this;
            self.$el.find("li.tee").remove();
            this.collection.forEach(function(tee){
                console.log("tee calling render:",tee.get("name"));
                var item = new TeeView({model:tee});
                self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return TeesView;
});