

var manager = exports;

manager.GetGoals = function (reduction){
    var goals = [];
    var goal = {"id":"3 putt",name:"threePutts",goal:2.2};
    
    var goal2 = {"id":"Extra Chips",name:"extraChips",goal:1.3};
    goals.push(goal);
    goals.push(goal2);
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