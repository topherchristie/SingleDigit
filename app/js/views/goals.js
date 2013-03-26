define(['views/goal'],function(GoalItemView){
    var GoalsView = Backbone.View.extend({
        el: '#goallist',
        tagName:'div',        
        events:{
        
        },
        initialize: function(){
             this.collection.on('add', this.render, this);
        },
        render:function(){
            
            var self = this;
            self.$el.empty();
            this.collection.forEach(function(goal){
              var item = new GoalItemView({model:goal});
               self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return GoalsView;
});