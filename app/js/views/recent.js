define(['views/score'],function(ScoreItemView){
    var RecentView = Backbone.View.extend({
        el: '#recentScores',
        tagName:'div',        
        events:{
        
        },
        initialize: function(){
             this.collection.on('add', this.render, this);
        },
        render:function(){
            
            var self = this;
            self.$el.empty();
            this.collection.last20().forEach(function(score){
              var item = new ScoreItemView({model:score});
               self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return RecentView;
});