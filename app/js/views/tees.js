define(['views/tee'],function(TeeView){
    var TeesView = Backbone.View.extend({
        el: '#courseNav',
        events:{
        },
        initialize: function(){
        },
        render:function(){
            var self = this;
            var firstListElementLink = self.$el.children().first().children().first();
            firstListElementLink.click(); // click on the first tab to reset active content
            self.$el.find("li.tee").remove();
            this.collection.forEach(function(tee){
                var item = new TeeView({model:tee});
                self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return TeesView;
});