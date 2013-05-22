define(['xdate','scoreCalculator'],function(xdate,scoreCalculator){
    var Score = Backbone.Model.extend({
        url:'scores',
        initialize:function(){
            var pretty,shortName,className,scrambleText;
           
            if(this.get("isGoal")){
                pretty="Gaol";
                shortName="Goal";
                className="goalFoot";
              
            }else{
                className="";
                pretty = (new xdate(this.get("date"),true)).toString('yyyy-MM-dd');     
                shortName = this.get("course")._id.substring(0,10) + "<span class=\"slash\">-</span>" + this.get("tee").name.substring(0,10);      
                
            }
            var stats =  this.get("stats");
            var fairwayText;
            var playableText;
            
            if(stats){
            scrambleText = stats.scrambles + "/" + stats.scrambleChances;
                fairwayText = stats.fairways + "/" + stats.totalFairways;
                playableText = stats.playable + "/" + stats.totalFairways;
            }else{
                fairwayText="";
                playableText="";
            }
            var eagles = this.get("eagles");
            var eagleAstrix = (eagles && eagles > 0)?"*":"";
            
            this.set({"scrambleText":scrambleText,"fairwayText":fairwayText,"playableText":playableText,"prettyDate":pretty,"eagleAstrix":eagleAstrix,'shortName':shortName,"className":className});
            
            
      }
    });
    return Score;
});