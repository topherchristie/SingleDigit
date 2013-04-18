define(["views/scoreVsGraph","models/scoreVs"],function(ScoreVsGraph,ScoreVsModel){
    var GraphLayer = Backbone.View.extend({
        el: '#graphLayer',
        tagName:'div',
        events:{
            "click a.scoreVsGIR":"scoreVsGIR"
        },
        hide:function(){
            $(this.el).hide();
        },
        show:function(){
            var self = this;
          $(self.el).show();
        },
        collections:[],
        views:[],
        initialize: function(){
             //this.collection.on('add', this.render, this);
         //   this.collections.courses = new CourseList();
           // this.views.courses = new CourseListView({collection:this.collections.courses});
        },
        render:function(){  
            return this;
        },
        scoreVsGIR:function(e){
            e.preventDefault();
            this.$el.find("#graphTitle").html("Score vs GIR");
            this.model = new ScoreVsModel({stat:"fairwayPercent"});
            this.graph = new ScoreVsGraph({el:"#graphHolder",model:this.model});
            this.model.fetch();
            
        }    
    });
    return GraphLayer;
});