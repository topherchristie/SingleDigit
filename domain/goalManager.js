

var manager = exports;

manager.GetGoals = function (reduction){
    var goals = [];
    var goal = {"id":"3 putt",name:"threePutts",goal:2.2};
    goals.push(goal);
    var y = 0;
    reduction.forEach(function(r){
        if(y===0){
            goal.lastYear = r.value[goal.name];
        }else{
            goal.thisYear = r.value[goal.name];
        }
        y++;
    });
    goals.forEach(function(i){
        //todo years need to be dynamic
       i.yearDiff = Math.round( (i.thisYear - i.lastYear) * 10.0)/10;
       i.goalDiff = Math.round( (i.goal - i.thisYear) * 10.0)/10;
    });
    return goals;
};