define(['views/course'],function(CourseView){
    var CoursesView = Backbone.View.extend({
        el: '#courselist',
        tagName:'div',
        subEl:null,
        events:{
        
        },
        initialize: function(){
             //this.collection.on('add', this.render, this);
        },
      /*hide:function(){
          this.$el.hide();  
          return this;
        },
        show:function(){
          this.$el.show();  
          return this;
        },*/
        render:function(){
            
            var self = this;
            if(self.subEl){
                self.subEl.empty();
            }else{
                
                self.subEl = $("<ul />").appendTo(self.$el);
            }
            
            this.collection.forEach(function(course){
                console.log("course calling render:",course.get("name"));
              var item = new CourseView({model:course});
               self.subEl.append(item.render().el);
            });
            return this;
        }
    });
    return CoursesView;
});