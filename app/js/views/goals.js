define(['views/goal'],function(GoalItemView){
    var GoalsView = Backbone.View.extend({
        el: '#goallist',
        tagName:'tbody',        
        events:{
        
        },
        initialize: function(){
             //this.collection.on('add', this.render, this);
        },
        render:function(){
            
            var self = this;
            self.$el.empty();
            this.collection.forEach(function(goal){
                console.log("goal calling render:",goal);
              var item = new GoalItemView({model:goal});
               self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return GoalsView;
});