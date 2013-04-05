

var manager = exports;

manager.GetGoals = function (reduction){
    var goals = [];
    goals.push({"index":1,"id":"3 putt",name:"threePutts",goal:2.2,text:"practice putting touch, 10' w/ 10 balls, each one past the last, but no more then by a foot"});
    goals.push({"index":2,"id":"Total Putts",name:"putts",goal:32.8,text:"practice 3,4,5 foot puts as much as possible, get consistent stroke, setup and routine don't cut across the ball. Above and below stats should knock off 1 putt each per round, so this is just one more to that average."});
    goals.push({"index":3,"id":"Extra Chips",name:"extraChips",goal:1.3,text:"luke donald practice, focus on every chip during a round, make ball contact first"});
    goals.push({"index":4,"id":"Scramble %",name:"scramblePercent",goal:30.0,text:"same as above, hrs of the gospel of Luke, master all 4 shots"});
    goals.push({"index":5,"id":"Extra Shots",name:"extras",goal:5.6,text:"mostly focus, tempo and being smart"});
    goals.push({"index":6,"id":"GIR",name:"GIR",goal:5.0,text:"new grip, range time, track club and distances, tempo (read Watson again)"});
    goals.push({"index":7,"id":"Driver Pen. Pts.",name:"drivePoints",goal:9.8,text:"smooth swing, turn body, keep it in play ( get arms extended behind you)"});
    goals.push({"index":'=',"id":"Average Score",name:"score",goal:86,text:""});
    
    
    var y = 0;
    reduction.forEach(function(r){
        goals.forEach(function(g){
            if(y===0){
                g.lastYear = r.value[g.name];
            }else{
                g.thisYear = r.value[g.name];
            }
        });
        y++;
    });

    goals.forEach(function(i){
       if(i.thisYear){
            //todo years need to be dynamic
           i.yearDiff = Math.round( (i.thisYear - i.lastYear) * 10.0)/10;
           i.goalDiff = Math.round( (i.goal - i.thisYear) * 10.0)/10;
       }else{
           i.thisYear = 0;
           i.yearDiff = 0;
           i.goalDiff = 0;
       }
    });
    return goals;
};