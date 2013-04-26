define([],function(){
    var Score = Backbone.Model.extend({
        url:'goals',
        initialize:function(){
            var goalDiffClass = "", yearDiffClass="";
            var higher = "";
            var lower = "";
            if(this.get("isHigherBetter")){
                higher = "better";
                lower ="worse";
            }else{
                lower = "better";
                higher ="worse";
            }
            
            
            if(this.get("yearDiff") > 0){
                yearDiffClass = higher;
            }else if(this.get("yearDiff") < 0){
                yearDiffClass = lower;
            }
            if(this.get("goalDiff") > 0){
                goalDiffClass = higher;
            }else if(this.get("goalDiff") < 0){
                goalDiffClass = lower;
            }
            this.set({"yearDiffClass":yearDiffClass,"goalDiffClass":goalDiffClass});
        }
        
    });
    return Score;
});