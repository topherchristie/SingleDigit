define(['collections/courselist','views/courses'],function(CourseList,CourseListView){
    var CourseLayer = Backbone.View.extend({
        el: '#courseLayer',
        tagName:'div',
        events:{
        
        },
        hide:function(){
            $(this.el).hide();
        },
        show:function(){
            var self = this;
            this.collections.courses.fetch({
                data:{},
                success: function(res){
                    self.views.courses.render(); 
                    $(self.el).show();
                }
            });
        },
        collections:[],
        views:[],
        initialize: function(){
             //this.collection.on('add', this.render, this);
            this.collections.courses = new CourseList();
            this.views.courses = new CourseListView({collection:this.collections.courses});
        },
        render:function(){  
            
            
            return this;
        }
    });
    return CourseLayer;
});