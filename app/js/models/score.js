define(['xdate','scoreCalculator'],function(xdate,scoreCalculator){
    var Score = Backbone.Model.extend({
        url:'scores',
        initialize:function(){
            var pretty = (new xdate(this.get("date"),true)).toString('yyyy-MM-dd');     
            
            
            var course = this.get("courseId");
            var teeName = this.get("teeName");
            this.set({"course":course});
            
            if(scoreCalculator === undefined){
                console.log('score calculator is still undefined');
            }
            
            var self = this;
            if(course.tees)
                course.tees.forEach(function(t){
                    if(t.name === teeName ){
                        var overPar = self.get("score") - t.par;
                        self.set({"overPar":overPar,"tee":t});        
                        var r = new scoreCalculator().calc(self.get("score"),self.get("ESC"),self.get("holes"),course,t);
                        self.set(r);
                    }
                });    
            var eagles = this.get("eagles");
            var eagleAstrix = (eagles && eagles > 0)?"*":"";
            console.log(course.name + ":" + eagles);
            this.set({"prettyDate":pretty,"eagleAstrix":eagleAstrix});
      }
    });
    return Score;
});