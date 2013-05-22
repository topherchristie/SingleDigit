define([],function(xdate,scoreCalculator){
    var ScoreSum = Backbone.Model.extend({
        url:'scores',
        blank: {
            _id:"sum",
            isGoal:true,
            date: new Date(),
            courseName:"Sum",
            course:{name:""},
            tee:{name:""},
            score:0,
            stats:{
                handicap:0,
                GIR:0,
                putts:0,
                onePutts:0,
                threePutts:0,
                chipIn:0,
                shortGame:0,
                ch15:0,
                avgPuttsWithoutChip:0,
                avgPuttsWithChip:0,
                fairways:0, totalFairways:0,
                fairwayPercent:0,
                drivePoints:0,
                playable:0,
                playablePercent:0,
                chips:0,
                penalties:0,
                shortGamePercent:0.0,
                extra:0,
                scrambles:0,
                scrambleChances:0,
                scramblePercent:0,
                pars:0,
                bogies:0,
                birdies:0,
                extraChips:0,
                doubles:0,
                others:0,
                eagles:0    
            }
            },
        initialize:function(){
            var pretty,shortName,className;
            pretty="Sum";
            shortName="Sum";
            className="goalFoot";
            this.set(this.blank);
            console.log("sum.isGoal",this.get("isGoal"));
            this.set({"scrambleText":"","fairwayText":"","playableText":"","prettyDate":pretty,"eagleAstrix":"",'shortName':shortName,"className":className});
                   
        },
        count:0,
        add:function(score){
            this.sum("score",score);
            for(var i in this.blank.stats){
                this.sumStat(i,score);    
            }
            this.count++;
        },
        roundNumbers:function(){
            for(var i in this.blank.stats){
                this.fixIt(i);    
            }
        },
        sum:function(attribute,model){
            var value = this.get(attribute);
            value = value * this.count + model.get(attribute);
            value = value/  (this.count+1);
            var result = {};
            result[attribute]=value;
            this.set(result);
        },
        sumStat:function(attribute,model){
            var stats = this.get('stats');
            var modelStats = model.get('stats');
            if(stats && modelStats){
                var value = stats[attribute] * this.count + modelStats[attribute];
                stats[attribute]=value/  (this.count+1);
                this.set({"stats":stats});
            }
        },
        fixIt:function(attribute){
            var stats = this.get('stats');
            var value = stats[attribute];
            var rounder;
            switch(attribute){
                case "handicap":
                case "putts":
                case "chipIn":
                case "avgPuttsWithoutChip":
                case "avgPuttsWithChip":
                case "extraChips":
                case "eagles":
                     rounder = 100;
                     break;
                default:
                   rounder = 10;
                   // console.log("rounding:",attribute,"by",rounder);
                    break;
            }
            
            stats[attribute]=Math.round(value*rounder)/rounder;
            this.set({"stats":stats});
        }
    });
    return ScoreSum;
});