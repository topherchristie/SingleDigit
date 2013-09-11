define(['models/score','xdate'],function(Score,xdate){
   var ScoreList = Backbone.Collection.extend({
       model: Score,
       url:'scores',
       lastN : function(n){
           var result = this.sortBy(function(i){
               return i.get("prettyDate");
           }).reverse();
           if(result.length > n){
                result = result.slice(0,n);
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
                    return _.filter(this.models,function(a){ 
                        return self.fValue == (new xdate(a.get("date"))).getFullYear();});
                case "last":
                    return this.lastN(this.fValue);
                    
           }
           return this;
       }
     
   });
   return ScoreList;
});