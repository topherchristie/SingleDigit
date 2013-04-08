define(['views/app','collections/scorelist','views/recent','views/recentTable','collections/goallist','views/goals','config'
        ,'views/courseLayer'
        ], function(AppView,ScoreList,RecentView,RecentTableView,GoalList,GoalsView,config
        , CourseLayer){
   var App = function(){
       
      console.log('app loaded');
      this.views.app = new AppView();
      this.views.app.render();
     
      this.collections.scores = new ScoreList();
      this.collections.goals = new GoalList();      
      
      this.views.recentTable = new RecentTableView({collection:this.collections.scores});
      this.views.goals = new GoalsView({collection:this.collections.goals});
      
      this.views.courseLayer = new CourseLayer();
      
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
                self.views.recentTable.hide();
                self.views.courseLayer.show();
              //  $('div#courseLayer').show();
            });
             $("body").on("click","#scoresLink",function(){
                self.views.courseLayer.hide();
                //$('div#courseLayer').hide();
                self.views.recentTable.show();
            });
            $('div#courseLayer').hide();
            self.views.courseLayer.hide();
       }
       
   };
   
   return App;
});