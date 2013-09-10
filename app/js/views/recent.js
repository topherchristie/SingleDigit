define(['views/score'],function(ScoreItemView){
    var RecentView = Backbone.View.extend({
        el: '#recentScores',
        tagName:'div',        
        events:{
            "click button.last20":"last20",
            "click button.y2013":"y2013",
            "click button.y2012":"y2012",
            "click button.all":"all"
        },
        initialize: function(){
             this.collection.on('add', this.render, this);
        },
        y2013:function(){
            this.collection.setFilter("year",2013);
            this.render();
        },
        render:function(){
            
            var self = this;
            self.$el.empty();
            this.collection.filter().forEach(function(score){
              var item = new ScoreItemView({model:score});
               self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return RecentView;
});
