var Calc = require('../app/js/lib/scoreCalculator');

var predictor = exports;
var last20 = [
            {id:0,handicap:24.6},
            {id:1,handicap:19.4},
            {id:2,handicap:21.3},
            {id:3,handicap:19.8},
            {id:4,handicap:12.8},
            {id:5,handicap:8.9},
            {id:6,handicap:13.9},
            {id:7,handicap:18.7},
            {id:8,handicap:17.1},
            {id:9,handicap:23.8},
            {id:10,handicap:17},
            {id:11,handicap:22},
            {id:12,handicap:17.6},
            {id:13,handicap:18.6},
            {id:14,handicap:22.9},
            {id:15,handicap:15.2}];
var MAX_HANDICAP = 21.5;
var MIN_HANDICAP = 7;
var calcNewHandicap = predictor.calcNewHandicap = function(handicap,sumTop9Scores){
    return Math.round((handicap + sumTop9Scores) / 10 *0.96 *100)/100;
}
predictor.compileScores = function(storedScores){
    var result= {"scores":[]};
    var pushToScores = function(s){
       result.scores.push(s);
    };
    // add all scores to possible results
    storedScores.forEach(pushToScores);
    // also add my 2011 scores that are not sored in db
    last20.reverse();
    last20.forEach(pushToScores);
    //only need the most recent 20
    while(result.scores.length > 20){
        result.scores.pop();
    }  
    //add an index to the top 20, use this to tell if score will be bumped on next round
    for(var sIndex=0;sIndex< result.scores.length;sIndex++){
        result.scores[sIndex].index=sIndex;
    }
    //sort by handicap so we can get the best 10
    result.scores.sort(function(a,b){return a.handicap-b.handicap});
    //get the best 11, see next note
    while(result.scores.length > 11){
      result.scores.pop();
    }
    //get the 11th best score, incase #10 gets bumped we can see what it would be like
    result.nextBest = result.scores.pop().handicap;
    // sort by index, which is same as date
    result.scores.sort(function(a,b){return a.index-b.index});
    // figure out if the 10
    result.isScoreBeingBumped = result.scores[result.scores.length-1].index === 19;
    result.sumOfTop9Scores=0;
    for(var i=0;i<result.scores.length-1;i++){
        console.log("result.scores[i].handicap",result.scores[i].handicap)
        result.sumOfTop9Scores += result.scores[i].handicap;
    }
    return result;
};
predictor.coursePredict = function(rating,slope,sumTop9Scores){
    var results = [];
    if(rating === undefined)
        throw 'ERROR coursePredict rating is required';
    if(slope === undefined)
        throw 'ERROR coursePredict slope is required';
    var calc = new Calc();
    var currentScore = 110;
    var handicap = 100;
    while(handicap >MIN_HANDICAP){
        handicap = calc.Handicap(currentScore,currentScore,rating,slope);
        if(handicap < MAX_HANDICAP){
            var newHandicap = calcNewHandicap(handicap,sumTop9Scores);
            results.push({
                "score":currentScore,
                "handicap":handicap,
                "newHandicap":newHandicap
                });
        }
        
        currentScore--;
    }
    
    return results;
};