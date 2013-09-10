define(['views/scoreTableItem','models/score','models/sum'],function(ScoreTableItemView,Score, Sum){
    var RecentView = Backbone.View.extend({
   //     el: '#recentTable',  
        events:{
        },
        initialize: function(){
            // this.collection.on('add', this.render, this);
        },
        hide:function(){
          this.$el.parent().parent().hide();  
          return this;
        },
        show:function(){
          this.$el.parent().parent().show();  
          return this;
        },
        render:function(){
            console.log("rendering: score table view");
            var self = this;
            self.$el.empty();
            var sum = new Sum();
            console.log(this.collection.filter());
            this.collection.filter().forEach(function(score){
                sum.add(score);
              var item = new ScoreTableItemView({model:score});
               self.$el.append(item.render().el);
            });
            //add sum record
            sum.roundNumbers();
            var sumitem = new ScoreTableItemView({model:sum});
            self.$el.append(sumitem.render().el);            
            
            //add Goal Record
            var item = new ScoreTableItemView({model:new Score(self.goalScore)});
            self.$el.append(item.render().el);         
            // color cells based on goal record
            this.colorCells();
            return this;
        },
        colorCells: function(){
            for(var i=3;i<=31;i++){
                switch(i){
                case 5:
                case 7:
                case 11:
                case 15:
                case 20:
                case 23:    
                case 26:
                case 27:
                case 28:
                    this.doAverages(i,true);
                    break;
                case 14:
                case 19:
                case 22:
                case 29:
                    break; //dont average these
                default:
                    this.doAverages(i,false);
                }
            }
        },
        doAverages:function(child,isAboveBetter){
            var goalscore = this.$el.find("tr:last-child").find(":nth-child(" + child + ")").html();
            var goalScore = parseFloat(goalscore);
             this.$el.find("td:nth-child(" + child + ")").each(function(){
                if($(this).parent().hasClass('goalFoot'))
                    return;
                
                var thisScore = parseFloat($(this).html());
                var isAbove;
                if(thisScore > goalScore){
                    isAbove = true;
                }else{
                    isAbove = false;
                }
                if(thisScore == goalScore || (isAboveBetter && isAbove) || (!isAboveBetter && !isAbove)){
                    $(this).css("color","#002900").css("font-weight","800").css("background-color","#2fddff");
                }else{
                   // $(this).css("color","#985404");
                }
            });
            
        },
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
                handicap:13,
                GIR:7,
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
                drivePoints:7,
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
                eagles:1    
            }
        }
    });
    
    return RecentView;
});