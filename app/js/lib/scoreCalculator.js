var ScoreCalculator = (function(){
    var proto = ScoreCalculator.prototype;
    function ScoreCalculator() {
        return init(
            (this instanceof ScoreCalculator) ? this : new ScoreCalculator(),arguments
        );
    }
    function init(scoreCalculator, args) {
        return scoreCalculator;
    }

    proto.calc = function (score,ESC,holes,course,tee){
            if(course === null) throw "Course cannot be null";
            var result = {onePutts:0,threePutts:0,chipIn:0,putts:0, handicap:0,birdies:0,eagles:0,pars:0,bogies:0,others:0,doubles:0};
            result.handicap = Handicap(score,ESC,tee.rating,tee.slope);
            result = processHoles(result,holes,tee);
            result.shortGamePercent = Math.round(result.shortGame / score *1000)/10;
            result.fairwayPercent = Math.round(result.fairways / result.totalFairways * 1000) / 10;
            result.playablePercent = Math.round(result.playable / result.totalFairways * 1000) /10;  
            
            return result;
        };
    var isGIR = function (par,score,putts){
            return ((par - 2) >= (score - putts));
        };
    proto.calculateHole = function(hole,par){
        var stats = {};
        if(par === undefined)
            throw "error par is required parameter";
        stats.hasFairway = (par > 3);
        if(stats.hasFairway)
            stats.fairwayHit = (/[Hh]it/.test(hole.fairway));
        stats.GIR = isGIR(par, hole.score,hole.putts); //stats.fairw
        stats.overPar = hole.score - par;
        //if(par)
        return stats;  
    };
    var processHoles= function (total,holes,tee){
            total.GIR = 0;
            total.ch15 =0;
            total.chips=0;
            total.extraChips = 0;
            total.eagles=0;
            total.totalFairways=0
            total.fairways=0;
            total.playable=0;
            total.drivePoints=0;
            total.penalties=0;             
            total.holesWChip=0;
            total.holesNoChip=0;
            total.puttsAfterChip=0;
            total.puttsAfterNoChip=0;
            total.scrambleChances=0;
            total.scrambles=0;
            total.extra = 0;
            
       
        	for(var i = 0;i<holes.length;i++){
                var h = processHole(holes[i],tee.holes[i]);
                total.putts += h.putts;
        	
        		if(h.GIR){
        			total.GIR++;
        		}
        		if(h.Ch15) total.ch15++;
        		
        		total.chips += h.chips;
                if(h.chips > 1){
                    h.extraChips = h.chips - 1;
                    total.extraChips += h.extraChips;
                }
        		total.penalties += h.penalties;
                total.extra += h.extra;
        		if(h.par == h.score){
        			total.pars ++;
        		}else if(h.par + 1 == h.score){
        			total.bogies ++;
        		}else if(h.par + 2 == h.score){
        			total.doubles ++;
        		}else if(h.par + 2 < h.score){
        			total.others ++;
        		}else if(h.par -2 >= h.score){
            		total.eagles ++;
        		}else{
        			total.birdies ++;
        		}
        
        		if(h.par > 3){
        			total.totalFairways++;
        			if(/[Hh]it/.test(h.fairway)){
        				total.fairways++;
        			}
        			if(h.drivePoints)
        				total.drivePoints += h.drivePoints;
        			if(h.playable)
        				total.playable++;
        		}
        		if(h.putts ==0){
        			total.chipIn++;
        		}else if(h.putts == 1){
        			total.onePutts++;
        		}else if(h.putts ==3){
        			total.threePutts++;
        		}
        		if(h.chips > 0){
        			total.holesWChip++;
        			total.puttsAfterChip +=h.putts;
        		}else{
        			total.holesNoChip ++;
        			total.puttsAfterNoChip += h.putts;
        		} 
                if(h.scramble != null){
        		  total.scrambleChances ++;
        		}
        		if(h.scramble){
        			total.scrambles++;
        		}
    
            }
            
            total.shortGame = total.chips+total.putts;
            if(total.scrambleChances > 0){
                total.scramblePercent = Math.round(total.scrambles/total.scrambleChances*100);
            }else{
                total.scramblePercnet = 'N/A';
            }
            if(total.holesWChip  > 0)
                total.avgPuttsWithChip = total.puttsAfterChip / total.holesWChip;	
            if(total.holesNoChip < 18)
                total.avgPuttsWithoutChip = (total.putts - total.puttsAfterChip) / (18 - total.holesWChip);
            total.avgPuttsWithChip = Math.round(total.avgPuttsWithChip * 10 )/10;
            total.avgPuttsWithoutChip = Math.round(total.avgPuttsWithoutChip * 10)/10;
            total.puttsPerHole = Math.round(total.putts / 18 * 10)/10;
            return total;
        };
    var getExtra = proto.getExtra = function(scoreHole, teeHolePar){
            return scoreHole.score - (scoreHole.chips+scoreHole.putts) - (teeHolePar -2);// - (scoreHole.penalties?scoreHole.penalties:0);
        };
    var Handicap= proto.Handicap =  function (score,ESC,rating,slope){
      var useScore;
      if(ESC && ESC < score){
        useScore = ESC;
      }else{
        useScore = score;
      }
      return Math.round(
        (
           (useScore - rating)/ slope*113
        )*100) /100;
    };
    var processHole = function (scoreHole,teeHole){
        var result = scoreHole;
        result.GIR = false;
        if(scoreHole.putts && teeHole.par && scoreHole.score){
            result.GIR = isGIR(teeHole.par,scoreHole.score,scoreHole.putts);
        }
        
        result.Ch15 = (result.GIR && result.putts>2);
        result.shortGame = result.chips+result.putts;	
        if(scoreHole.penalties)
            result.penalties = scoreHole.penalties;
        else
            result.penalties = 0;
        result.extra = getExtra(result,teeHole.par);
        result.par = teeHole.par;
        result.yards = teeHole.yards;
        result.fairway = scoreHole.fairway;
        if(result.chips && result.chips > 0){
            result.scramble = result.chips == 1 && result.putts <= 1;
        }else{
            result.scramble = null;
        }
        if(scoreHole.penalties)
            result.penalties = scoreHole.penalties;
        else
            result.penalties = 0;
        if(scoreHole.playable){
            result.playable = true;
        }else
            result.playable = false;
        return result;
    };
    
     // Export for Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ScoreCalculator;
    }
    
    // AMD
    if (typeof define === 'function' && define.amd) {  
      define([], function() {
        return ScoreCalculator;
      });
    }
    
    

return ScoreCalculator;

})();
 
 