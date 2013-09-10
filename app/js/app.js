define(['views/app','collections/scorelist','collections/goallist','views/goals','config'
        ,'views/courseLayer' ,'views/graphLayer','views/scoreTable','models/scoreTable'
        ], function(AppView,ScoreList,GoalList,GoalsView,config
        , CourseLayer,GraphLayer,ScoreTableView,ScoreTableModel){
   var App = function(){
       
      console.log('app loaded');
      this.views.app = new AppView();
      this.views.app.render();
      
      this.collections.scores = new ScoreList();
      this.collections.goals = new GoalList();      
      
      
      this.views.scoreWrapper = new ScoreTableView({el:".scoreTableWrapper",collection:this.collections.scores});
            
      //this.views.recentTable = new RecentTableView({collection:this.collections.scores});
      
      this.views.goals = new GoalsView({collection:this.collections.goals});
      
      this.views.courseLayer = new CourseLayer();
      this.views.graphLayer = new GraphLayer();
      
      console.log("render!");
      this.init();
   } ;
   
   App.prototype= {
       views: {},
       collections: {},
       init:function(){
            var self = this;
       
            self.collections.goals.fetch({data:{},success: function(res){ self.views.goals.render();}});
            self.views.courseLayer.hide();
       
            $("body").on("click","#coursesLink",function(){
                $("#scoresLink").parent().removeClass('active');
                   $("#graphsLink").parent().removeClass('active');
                self.views.scoreWrapper.hide();
                self.views.graphLayer.hide();
                self.views.courseLayer.show();
              //  $('div#courseLayer').show();
                
                $("#coursesLink").parent().addClass('active');
                
            });
             $("body").on("click","#scoresLink",function(){
                $("#coursesLink").parent().removeClass('active');
                 $("#graphsLink").parent().removeClass('active');
                self.views.courseLayer.hide();
                self.views.graphLayer.hide();
                //$('div#courseLayer').hide();
                self.views.scoreWrapper.show();
                
                $("#scoresLink").parent().addClass('active');
            });
            $("body").on("click","#graphsLink",function(){
                $("#coursesLink").parent().removeClass('active');
                $("#scoresLink").parent().removeClass('active');
                self.views.courseLayer.hide();
                self.views.scoreWrapper.hide();
                //$('div#courseLayer').hide();
                self.views.graphLayer.show();
                $("#graphsLink").parent().addClass('active');
            });
            $('div#courseLayer').hide();
            self.views.courseLayer.hide();
            self.views.graphLayer.hide();
       }
       
   };
   
   return App;
});