var Calc = require('../app/js/lib/scoreCalculator');

var predictor = exports;
var last20 = [
            {id:0,handicap:24.6,date:'2011-01-01'},
            {id:1,handicap:19.4,date:'2011-01-02'},
            {id:2,handicap:21.3,date:'2011-01-03'},
            {id:3,handicap:19.8,date:'2011-01-04'},
            {id:4,handicap:12.8,date:'2011-01-05'},
            {id:5,handicap:8.9,date:'2011-01-06'},
            {id:6,handicap:13.9,date:'2011-01-07'},
            {id:7,handicap:18.7,date:'2011-01-08'},
            {id:8,handicap:17.1,date:'2011-01-09'},
            {id:9,handicap:23.8,date:'2011-01-10'},
            {id:10,handicap:17,date:'2011-01-11'},
            {id:11,handicap:22,date:'2011-01-12'},
            {id:12,handicap:17.6,date:'2011-01-13'},
            {id:13,handicap:18.6,date:'2011-01-14'},
            {id:14,handicap:22.9,date:'2011-01-15'},
            {id:15,handicap:15.2,date:'2011-01-16'}];
var MAX_HANDICAP = 21.5;
var MIN_HANDICAP = 7;
var calcNewHandicap = predictor.calcNewHandicap = function(handicap,sumTop9Scores){
    return Math.round((handicap + sumTop9Scores) / 10 *0.96 *100)/100;
}
var getListOf20 = predictor.getListOf20  = function(storedScores){
    var newList = [];
    // add all scores to possible results
    for(var i = 0;i<storedScores.length;i++){
        newList.push(storedScores[i]);
    }
    // also add my 2011 scores that are not sored in db
    for(var j = last20.length-1;j>=0;j--){
        newList.push(last20[j]);
    }
    //only need the most recent 20
    while(newList.length > 20){
        newList.pop();
    }  
    //add an index to the top 20, use this to tell if score will be bumped on next round
    for(var sIndex=0;sIndex< newList.length;sIndex++){
        newList[sIndex].index=sIndex;
    }
    return newList;
};
var getTenBest = function(scores){
    var list = [];
    scores.forEach(function(s){
        list.push(s);
    });
    list.sort(function(a,b){return (a.handicap||a.stats.handicap)-(b.handicap||b.handicap)});
    while(list.length > 10){
      list.pop();
    }
    return list;
};
var Handicap = predictor.Handicap = function(scores){
  if(scores.length >= 10){
      var total = 0;
      var tenBest = getTenBest(scores);
      tenBest.forEach(function(s){
         total += s.handicap || s.stats.handicap; 
      });
      return Math.round(total / 10 * 0.96 * 100) /100;
  }else{
      return 0;
  }
};
predictor.compileScores = function(storedScores){
    var scores= [];
    scores = getListOf20(storedScores);
    
    //sort by handicap so we can get the best 10
    scores.sort(function(a,b){return a.handicap-b.handicap});
    //get the best 11, see next note
    while(scores.length > 11){
      scores.pop();
    }
    //get the 11th best score, incase #10 gets bumped we can see what it would be like
    
    var nextBest = scores.pop().handicap;
    var currentHandicap = Handicap(scores);
    var fifthBest = scores[4].handicap;
    
    // sort by index, which is same as date
    scores.sort(function(a,b){return a.index-b.index});
    // figure out if the 10
    
    var isScoreBeingBumped = scores[scores.length-1].index === 19;
    var sumOfTop9Scores=0;
    for(var i=0;i<scores.length-1;i++){
        sumOfTop9Scores += scores[i].handicap;
    }
    return {
        "scores":scores,
        "sumOfTop9Scores":sumOfTop9Scores,
        "isScoreBeingBumped":isScoreBeingBumped,
        "nextBest":nextBest,
        "currentHandicap":currentHandicap,
        "fifthBest":fifthBest
        };
};
predictor.coursePredictByGrouping = function(rating,slope,scoreGrouping){
    return coursePredict(
        rating,
        slope,
        scoreGrouping.sumOfTop9Scores,
        scoreGrouping.currentHandicap,
        scoreGrouping.nextBest,
        scoreGrouping.fifthBest,
        scoreGrouping.isScoreBeingBumped,
        scoreGrouping.fifthBest
    );   
}
var coursePredict = predictor.coursePredict = function(rating,slope,sumTop9Scores,currentHandicap,tenthHandicap,top5,isBeingBumped,nextBestHandicap){
    var results = [];
    if(rating === undefined)
        throw 'ERROR coursePredict rating is required';
    if(slope === undefined)
        throw 'ERROR coursePredict slope is required';
    if(currentHandicap === undefined)
        throw 'ERROR coursePredict currentHandicap is required';
    if(tenthHandicap === undefined)
        throw 'ERROR coursePredict tenthHandicap is required';
    if(top5 === undefined)
        throw 'ERROR coursePredict top5 is required';
    var calc = new Calc();
    var currentScore = 110;
    var handicap = 100;
    while(handicap >MIN_HANDICAP){
        handicap = calc.Handicap(currentScore,currentScore,rating,slope);
        if(handicap < MAX_HANDICAP){
            var newHandicap = calcNewHandicap(handicap,sumTop9Scores);
            
            var model = {
                "score":currentScore,
                "handicap":handicap,
                "newHandicap":newHandicap
                };
            model.counts = (handicap <= tenthHandicap || (isBeingBumped && handicap < nextBestHandicap));
            model.isSingleDigit = (handicap*0.96 < 10);
            model.isTop5 = (handicap <= top5);
            model.keepsOrImprovesHandicap = (newHandicap <= currentHandicap)
            results.push(model);
        }
        
        currentScore--;
    }
    
    return results;
};