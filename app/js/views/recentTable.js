define(['views/scoreTableItem','models/score','models/sum'],function(ScoreTableItemView,Score, Sum){
    var RecentView = Backbone.View.extend({
        el: '#recentTable',  
        goalScore : {
            _id:"goal",
            isGoal:true,
            date: new Date(),
            dateString:"*",
            courseName:"Goal",
            course:{name:""},
            tee:{name:""},
            score:86,
            stats:{
                handicap:12.5,
                GIR:8,
                putts:33,
                onePutts:5,
                threePutts:1,
                chipIn:1,
                shortGame:42,
                ch15:0,
                avgPuttsWithoutChip:2,
                avgPuttsWithChip:1.6,
                fairways:8, totalFairways:14,
                fairwayPercent:57,
                drivePoints:4,
                playable:12,
                playablePercent:85.7,
                chips:10,
                penalties:0,
                shortGamePercent:50.0,
                extra:2.5,
                scrambles:4,
                scrambleChances:10,
                scramblePercent:25,
                pars:9,
                bogies:7,
                birdies:1,
                extraChips:0,
                doubles:2,
                others:0,
                eagles:0    
            }
        },
        events:{
        
        },
        initialize: function(){
            // this.collection.on('add', this.render, this);
        },
        render:function(){
            console.log("rendering: score table view");
            var self = this;
            self.$el.empty();
            var sum = new Sum();
            this.collection.last20().forEach(function(score){
                sum.add(score);
              var item = new ScoreTableItemView({model:score});
               self.$el.append(item.render().el);
            });
            var item = new ScoreTableItemView({model:new Score(self.goalScore)});
            self.$el.append(item.render().el);         
            sum.roundNumbers();
            var sumitem = new ScoreTableItemView({model:sum});
            self.$el.append(sumitem.render().el);            
           // ColorCells();
            return this;
        },
        colorCells: function(){
            for(var i=2;i<=29;i++){
                switch(i){
                case 5:
                case 7:
                case 9:
                //   case 16:
                case 17:
                case 19:
                case 20:
                case 24:
                case 25:
                case 26:
                   
                this.doAverages(i,true);
                break;
                case 23:
                case 27:
                case 16:
                break;
                default:
                this.doAverages(i,false);
                }
		    }
        },
        doAverages:function(child,isAboveBetter){
            /*var goalscore = $("div#scores tfoot tr:last-child").find(":nth-child(" + child + ")").html();
            goalScore = parseFloat(goalscore);
            $("div#scores tbody td:nth-child(" + child + ")").each(function(){
                var thisScore = parseFloat($(this).html());
                var isAbove;
                if(thisScore > goalScore){
                    isAbove = true;
                }else{
                    isAbove = false;
                }
                if(thisScore == goalScore || (isAboveBetter && isAbove) || (!isAboveBetter && !isAbove)){
                    $(this).css("color","#0000d7").css("font-weight","800");
                }else{
                    $(this).css("color","#985404");
                }
            });
            */
        }
    });
    return RecentView;
});