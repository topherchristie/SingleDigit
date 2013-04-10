define(['text!templates/tee.html'],function(template){
    var TeeView = Backbone.View.extend({
        tagName:'li',
        className:'tee' ,
        template: Handlebars.compile(template),
        events:{
           // "click a.showStats":"showStats"
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
        showPrediction:function(e){
            e.preventDefault();
            /*//set this course as active after clearing all other active ones
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
            this.collections.tees.fetch({data:{"courseId":courseId},success: function(res){ 
                this.views.teeList.render();
            }});
            
            //fetch prediction stats for first tee
            
           // var teeId = this.model.
            */
            
            
        }
        
    });
    return TeeView;
});