define(['models/score'],function(Score){
   var ScoreList = Backbone.Collection.extend({
       model: Score,
       url:'scores',
       last20 : function(){
           
           var result = this.sortBy(function(i){
               return i.get("prettyDate");
           }).reverse();
           if(result.length > 20){
                result = result.slice(0,20);
           }
           return result;
       }
     
   });
   return ScoreList;
});