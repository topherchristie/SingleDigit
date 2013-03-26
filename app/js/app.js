define(['views/app','collections/scorelist','views/recent','views/recentTable','collections/goallist','views/goals','config'], function(AppView,ScoreList,RecentView,RecentTableView,GoalList,GoalsView,config){
   var App = function(){
       
      console.log('app loaded');
      this.views.app = new AppView();
      this.views.app.render();
     
      this.collections.scores = new ScoreList();
      this.collections.goals = new GoalList();      
     
      this.views.recent = new RecentView({collection:this.collections.scores});
      this.views.recentTable = new RecentTableView({collection:this.collections.scores});
      this.views.goals = new GoalsView({collection:this.collections.goals});
      
      console.log("render!");
      this.init();
   } ;
   
   App.prototype= {
       views: {},
       collections: {},
       init:function(){
           var self = this;
           self.collections.scores.fetch({data:{},success: function(res){ }});
           self.collections.goals.fetch({data:{},success: function(res){ }});
       }
       
   };
   
   return App;
});