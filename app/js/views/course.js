define(['models/courseStats','views/courseStats','text!templates/course.html','collections/tees','views/tees','views/teesContent'],function(CourseStats,CourseStatsView,template,TeeList,TeeListView,TeesContentView){
    var CourseView = Backbone.View.extend({
        tagName:'li',
        template: Handlebars.compile(template),
        collections:{},
        views :{},
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
            var self = this;
            //set this course as active after clearing all other active ones
            this.$el.parent().find("a.active").removeClass('active');
            this.$el.find("a").addClass('active');
            
            var courseId = this.model.get("_id");
            var courseName = this.model.get("name");
            //fetch the course stats data
            var model = new CourseStats();
            model.fetch({data:{"courseId":courseId},success: function(res){ 
                res.set({"courseName":courseName});
                var courseStatsView = new CourseStatsView({model:res});
                courseStatsView.render();
            
            }});
            //fetch the tee List
            
            this.collections.tees = new TeeList();
            this.views.teeList = new TeeListView({collection:this.collections.tees});
            this.views.teesContent = new TeesContentView({collection:this.collections.tees});
            this.collections.tees.fetch({data:{"courseId":courseId},success: function(res){ 
                self.views.teeList.render();
                self.views.teesContent.render();
            }});
            
            //fetch prediction stats for first tee
            
           // var teeId = this.model.
            
            
            
        }
        
    });
    return CourseView;
});