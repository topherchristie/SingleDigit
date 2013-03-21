define(['views/app','collections/scorelist','views/recent','config'], function(AppView,ScoreList,RecentView,config){
   var App = function(){
       
      console.log('app loaded');
      this.views.app = new AppView();
     this.views.app.render();
     
      this.collections.scores = new ScoreList();
     
      this.views.recent = new RecentView({collection:this.collections.scores});
      
      console.log("render!");
      this.init();
   } ;
   
   App.prototype= {
       views: {},
       collections: {},
       init:function(){
           var self = this;
           self.collections.scores.fetch({data:{},success: function(res){ }});
           
       }
       
   };
   
   return App;
});