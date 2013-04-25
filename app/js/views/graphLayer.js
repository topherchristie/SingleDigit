define(["views/scoreVsGraph","models/scoreVs"],function(ScoreVsGraph,ScoreVsModel){
    var GraphLayer = Backbone.View.extend({
        el: '#graphLayer',
        tagName:'div',
        events:{
            "click a.scoreVsGIR":"scoreVsGIR",
            "click a.scoreVsPutts":"scoreVsPutts",
            "click a.scoreVsFairways":"scoreVsFairways",
            "click a.scoreVsPlayable":"scoreVsPlayable",
            "click a.scoreVsDrPenPoints":"scoreVsDrPenPoints",
            "click a.scoreVsScramble":"scoreVsScramble"
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
        scoreVsPlayable:function(e){
            e.preventDefault();
            this.createOrUpdate('playablePercent');
        },
        scoreVsDrPenPoints:function(e){
            e.preventDefault();
            this.createOrUpdate('drivePoints');
        },
        scoreVsScramble:function(e){
            e.preventDefault();
            this.createOrUpdate('scramblePercent');
        },
        scoreVsGIR:function(e){
            e.preventDefault();
            this.createOrUpdate('GIR');
        },
        scoreVsPutts:function(e){
            e.preventDefault();
            this.createOrUpdate('putts');
        },
        scoreVsFairways:function(e){
            e.preventDefault();
            this.createOrUpdate('fairwayPercent');
        },
        createOrUpdate : function(stat){
            this.$el.find("#graphTitle").html("Score vs " + stat);
            if(!this.model){
                this.model = new ScoreVsModel({stat:stat});
                this.graph = new ScoreVsGraph({el:"#graphHolder",model:this.model});    
            }else{
                this.model.set({stat:stat});
            }
            this.model.fetch();
        }
    });
    return GraphLayer;
});