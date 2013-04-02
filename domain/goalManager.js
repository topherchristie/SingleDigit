

var manager = exports;

manager.GetGoals = function (reduction){
    var goals = [];
    goals.push({"index":1,"id":"3 putt",name:"threePutts",goal:2.2});
    goals.push({"index":2,"id":"Total Putts",name:"putts",goal:32.8});
    goals.push({"index":3,"id":"Extra Chips",name:"extraChips",goal:1.3});
    goals.push({"index":4,"id":"Scramble %",name:"scramblePercent",goal:30.0});
    goals.push({"index":5,"id":"Extra Shots",name:"extras",goal:5.6});
    goals.push({"index":6,"id":"GIR",name:"GIR",goal:5.0});
    goals.push({"index":7,"id":"Driver Pen. Pts.",name:"drivePoints",goal:9.8});
    goals.push({"index":'=',"id":"Average Score",name:"score",goal:86});
    
    
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