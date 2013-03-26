define(['models/goal'],function(Goal){
   var GoalList = Backbone.Collection.extend({
       model: Goal,
       url:'goals'
     
   });
   return GoalList;
});