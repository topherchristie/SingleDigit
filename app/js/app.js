define(['views/app','collections/scorelist','views/recent','views/recentTable','collections/goallist','views/goals','config'
        ,'views/courseLayer' ,'views/graphLayer'
        ], function(AppView,ScoreList,RecentView,RecentTableView,GoalList,GoalsView,config
        , CourseLayer,GraphLayer){
   var App = function(){
       
      console.log('app loaded');
      this.views.app = new AppView();
      this.views.app.render();
     
      this.collections.scores = new ScoreList();
      this.collections.goals = new GoalList();      
      
      this.views.recentTable = new RecentTableView({collection:this.collections.scores});
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
           self.collections.scores.fetch({data:{},success: function(res){ self.views.recentTable.render(); }});
           self.collections.goals.fetch({data:{},success: function(res){ self.views.goals.render();}});
           
           self.views.courseLayer.hide();
            $("body").on("click","#coursesLink",function(){
                $("#scoresLink").parent().removeClass('active');
                   $("#graphsLink").parent().removeClass('active');
                self.views.recentTable.hide();
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
                self.views.recentTable.show();
                
                $("#scoresLink").parent().addClass('active');
            });
            $("body").on("click","#graphsLink",function(){
                $("#coursesLink").parent().removeClass('active');
                $("#scoresLink").parent().removeClass('active');
                self.views.courseLayer.hide();
                self.views.recentTable.hide();
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