define(['models/courseStats','views/courseStats','text!templates/course.html'],function(CourseStats,CourseStatsView,template){
    var GoalView = Backbone.View.extend({
        tagName:'li',
        template: _.template(template),
        events:{
            "click a.showStats":"showStats"
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
        },
        render: function(){
            var $el = $(this.el);
         //   $el.data('scoreId', this.model.get('_id'));
            var html =this.template(this.model.toJSON());
            $el.html(html);
            return this;
        },
        showStats:function(e){
            e.preventDefault();
            var courseId = this.model.get("_id");
            console.log('fecthing stats for',courseId);
            var model = new CourseStats();
            model.fetch({data:{"courseId":courseId},success: function(res){ 
        
                var courseStatsView = new CourseStatsView({model:res});
                courseStatsView.render();
            
            }});
            
            
        }
        
    });
    return GoalView;
});