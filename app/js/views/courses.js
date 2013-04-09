define(['views/course'],function(CourseView){
    var CoursesView = Backbone.View.extend({
        el: '#courselist',
        subEl:null,
        events:{
        
        },
        initialize: function(){
             //this.collection.on('add', this.render, this);
        },
        render:function(){
            var self = this;
            self.$el.empty();
            this.collection.forEach(function(course){
                console.log("course calling render:",course.get("name"));
              var item = new CourseView({model:course});
               self.$el.append(item.render().el);
            });
            return this;
        }
    });
    return CoursesView;
});