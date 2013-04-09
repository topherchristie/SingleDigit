define(['models/courseStats','views/courseStats','text!templates/course.html'],function(CourseStats,CourseStatsView,template){
    var GoalView = Backbone.View.extend({
        tagName:'li',
        template: Handlebars.compile(template),
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
            this.$el.parent().find("a.active").removeClass('active');
            this.$el.find("a").addClass('active');
            var courseId = this.model.get("_id");
            var courseName = this.model.get("name");
            console.log('fecthing stats for',courseId);
            var model = new CourseStats();
            model.fetch({data:{"courseId":courseId},success: function(res){ 
                res.set({"courseName":courseName});
                var courseStatsView = new CourseStatsView({model:res});
                courseStatsView.render();
            
            }});
            
            
        }
        
    });
    return GoalView;
});