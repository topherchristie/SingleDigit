define(['xdate'],function(xdate){
    var Score = Backbone.Model.extend({
        url:'scores',
        initialize:function(){
            var pretty = (new xdate(this.get("date"),true)).toString('yyyy-MM-dd');     
            var overPar = this.get("score") - this.get("tee").par;
            var eagles = this.get("eagles");
            var eagleAstrix = (eagles && eagles > 0)?"*":"";
            this.set({"overPar":overPar,"prettyDate":pretty,"eagleAstrix":eagleAstrix});
      }
   });
   
   return Score;
   
});