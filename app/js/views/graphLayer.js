define(["views/scoreVsGraph","models/scoreVs","models/GIRvsFairwayPercent"],function(ScoreVsGraph,ScoreVsModel,GIRvsFairwayPercent){
    var GraphLayer = Backbone.View.extend({
        el: '#graphLayer',
        tagName:'div',
        events:{
            "click a.scoreVsGIR":"scoreVsGIR",
            "click a.scoreVsPutts":"scoreVsPutts",
            "click a.scoreVsFairways":"scoreVsFairways",
            "click a.scoreVsPlayable":"scoreVsPlayable",
            "click a.scoreVsDrPenPoints":"scoreVsDrPenPoints",
            "click a.scoreVsScramble":"scoreVsScramble",
            "click a.girVsFw":"girVsFw"
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
            }else{                
                this.model.set({stat:stat});
            }
            if(!this.graph){
                this.graph = new ScoreVsGraph({el:"#graphHolder",model:this.model});    
            }else{
                this.graph.changeModel(this.model);
            }
            var self = this;
            this.model.fetch({success:function(){
                self.graph.render();
            }});
        },
        girVsFw : function(e){
            e.preventDefault();
            this.$el.find("#graphTitle").html("GIR vs Fairway %");
            
            if(!this.model2){
                this.model2 = new GIRvsFairwayPercent();
            }
            
            if(!this.graph){
                this.graph = new ScoreVsGraph({el:"#graphHolder",model:this.model2});    
            }else{
                this.graph.changeModel(this.model2);
            }
            
            
              var self = this;
            this.model2.fetch({success:function(){
                self.graph.render();
            }});
        }
    });
    return GraphLayer;
});