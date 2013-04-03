define([],function(){
    var ScoreCard = Backbone.Model.extend({
        initialize:function(){
            var front = {"par":0};
            var back = {"par":0};
            for(var i = 0;i<9;i++){
                var t = this.get("tee").holes[i];
                front.par += t.par;
            }
            for(var j = 9;j<18;j++){
                var teeHole = this.get("tee").holes[j];
                back.par += teeHole.par;
            }
            var tee = this.get("tee");
            tee.par =0;
            tee.yards=0;
            this.get("tee").holes.forEach(function(t){
                tee.par += t.par;
                tee.yards += t.yards;
            });
            this.set({"tee":tee, "front":front,"back":back});
            console.log("scorecard init",this.toJSON());
            
        },
    });
    return ScoreCard;
});