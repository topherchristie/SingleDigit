define(['models/tee'],function(Tee){
   var TeeList = Backbone.Collection.extend({
       model: Tee,
       url:'teePredictions'
   });
   return TeeList;
});