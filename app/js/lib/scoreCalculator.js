var ScoreCalculator = (function(){

    var proto = ScoreCalculator.prototype;
    function ScoreCalculator() {
        return init(
		    (this instanceof ScoreCalculator) ? this : new ScoreCalculator(),
		    arguments
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
            //result.shortGamePercent = Math.round(result.shortGame / result.score *1000)/10;
            //result.fairwayPercent = Math.round(result.fairways / result.totalFairways * 1000) / 10;
            //result.playablePercent = Math.round(result.playable / result.totalFairways * 1000) /10;  
            
            return result;
        };
        
    var processHoles= function (total,holes,tee){
            total.gir = 0;
            total.ch15 =0;
            total.chips=0;
            total.extraChips = 0;
            total.eagles=0;
            /*
            
            var holesWChip=0,holesNoChip=0,puttsAfterChip=0,puttsAfterNoChip=0;
        	var totalFairways=0,fairways=0,playable=0,drivePoints=0,penalties=0;
        	var scrambleChances=0,scrambles=0;
            
        */
        	for(var i = 0;i<holes.length;i++){
                var h = processHole(holes[i],tee.holes[i]);
                total.putts += h.putts;
        	
        		if(h.GIR){
        			total.gir++;
        		}
        		if(h.Ch15) total.ch15++;
        		
        		total.chips += h.chips;
                if(h.chips > 1){
                    h.extraChips = h.chips - 1;
                    total.extraChips += h.extraChips;
                }
        		total.penalties += h.penalties;
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
        /*
        		if(h.par > 3){
        			totalFairways++;
        			if(/[Hh]it/.test(h.fairway)){
        				fairways++;
        			}
        			if(h.drivePoints)
        				drivePoints += h.drivePoints;
        			if(h.playable)
        				playable++;
        		}
        		if(h.putts ==0){
        			obj.chipIn++;
        		}else if(h.putts == 1){
        			obj.onePutts++;
        		}else if(h.putts ==3){
        			obj.threePutts++;
        		}
        		if(h.chips > 0){
        			holesWChip++;
        			puttsAfterChip +=h.putts;
        		}else{
        			holesNoChip ++;
        			puttsAfterNoChip += h.putts;
        		} 
                        if(h.scramble != null){
        		  scrambleChances ++;
        		}
        		if(h.scramble){
        			scrambles++;
        		}
        */
            }
            /*
        	obj.shortGame = chips+putts;
        	if(scrambleChances > 0){
        		obj.scramblePercent = Math.round(scrambles/scrambleChances*100);
        	}else{
        		obj.scramblePercnet = 'N/A';
        	}
        	if(holesWChip  > 0)
        		obj.avgPuttsAfterChip = puttsAfterChip / holesWChip;	
        	if(holesNoChip < 18)
        		obj.avgPuttsWithoutChip = (putts - puttsAfterChip) / (18 - holesWChip);
        	obj.avgPuttsAfterChip = Math.round(obj.avgPuttsAfterChip * 10 )/10;
        	obj.avgPuttsWithoutChip = Math.round(obj.avgPuttsWithoutChip * 10)/10;
            */
            total.puttsPerHole = Math.round(total.putts / 18 * 10)/10;
            return total;
        };
    var processHole = function (scoreHole,teeHole){
        	var result = scoreHole;
        	result.GIR = false;        	
        	if(result.putts && teeHole.par && result.score){
        	   result.GIR =((teeHole.par - 2) >= (result.score - result.putts));
        	}
        	result.Ch15 = (result.GIR && result.putts>2);
        	result.shortGame = result.chips+result.putts;	
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
    var Handicap= function (score,ESC,rating,slope){
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
 
 