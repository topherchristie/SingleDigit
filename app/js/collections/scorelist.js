define(['models/score','xdate'],function(Score,xdate){
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
       },
       setFilter:function(fType,fValue){
           this.fType = fType;
           this.fValue = fValue;
       },
       filter : function(){
           console.log('filtering',this.fType, this.fValue,this)
           var self = this;
           switch(this.fType){
               case "year":
                    return _.filter(this.models,function(a){ console.log((new xdate(a.get("date"))).getFullYear()); return true;});
           }
           return this;
       }
     
   });
   return ScoreList;
});