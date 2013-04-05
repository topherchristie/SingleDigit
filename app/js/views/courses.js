define(['views/course'],function(CourseView){
    var GoalsView = Backbone.View.extend({
        el: '#courselist',
        tagName:'div',        
        events:{
        
        },
        initialize: function(){
             //this.collection.on('add', this.render, this);
        },
        hide:function(){
          this.$el.hide();  
          return this;
        },
        show:function(){
          this.$el.show();  
          return this;
        },
        render:function(){
            
            var self = this;
            self.$el.empty();
            var ul = $("<ul />").appendTo(self.$el);
           // ul = self.$el.find("ul");
            this.collection.forEach(function(course){
                console.log("course calling render:",course.get("name"));
              var item = new CourseView({model:course});
               $(ul).append(item.render().el);
            });
            return this;
        }
    });
    return GoalsView;
});