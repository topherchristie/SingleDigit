define(['views/app','collections/scorelist','views/recent','views/recentTable','collections/goallist','views/goals','config'
        ,'collections/courselist','views/courses'
        ], function(AppView,ScoreList,RecentView,RecentTableView,GoalList,GoalsView,config
        ,CourseList,CourseListView){
   var App = function(){
       
      console.log('app loaded');
      this.views.app = new AppView();
      this.views.app.render();
     
      this.collections.scores = new ScoreList();
      this.collections.goals = new GoalList();      
      this.collections.courses = new CourseList();
      
      //this.views.recent = new RecentView({collection:this.collections.scores});
      this.views.recentTable = new RecentTableView({collection:this.collections.scores});
      this.views.goals = new GoalsView({collection:this.collections.goals});
      this.views.courses = new CourseListView({collection:this.collections.courses});
      
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
           self.collections.courses.fetch({data:{},success: function(res){ self.views.courses.hide().render(); }});
            $("body").on("click","#coursesLink",function(){
                self.views.recentTable.hide();
                self.views.courses.show();
            });
             $("body").on("click","#scoresLink",function(){
                self.views.courses.hide();
                self.views.recentTable.show();
            });
       }
       
   };
   
   return App;
});