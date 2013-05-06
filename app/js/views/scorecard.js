define(['text!templates/scorecard.html','scoreCalculator'],function(template,scoreCalculator){
    var RecentView = Backbone.View.extend({
        el: '#scoreModal',  
        tagName:"div",
        template: Handlebars.compile(template),
        events:{
            "click #btnscoreBack":"showBackTable",
            "click #btnscoreFront":"showFrontTable",
            "click #btnstats":"showStats"
        },
        initialize: function(){
            // this.collection.on('add', this.render, this);
            this.model.set({"frontTable":this.getFrontTable(),"backTable":this.getBackTable()});
            this.render();
        },
        render:function(){
            var $el = $('<div id="scoreModal" class="modal hide fade scorecard" tabindex="-1" role="dialog" aria-hidden="true"/>');
            var html =this.template(this.model.toJSON());
            $el.html(html);
            $("body").append($el);
            $el.modal('show');
            $el.find(".scoreBack").hide();
            $el.find(".stats").hide();
            this.$el = $el;
            return this;
        },
        showFrontTable:function(e){
            e.preventDefault();
           /* this.$el.find(".scoreFront").show();
            this.$el.find("#btnFront").addClass("btn-primary");
            this.$el.find("#btnBack").removeClass("btn-primary");
            this.$el.find(".scoreBack").hide();
            this.$el.find(".stats").hide();
            this.$el.find("#btnStats").removeClass("btn-primary");*/
            this.hideThese(["stats","scoreBack"]);
            this.showThis("scoreFront");
        },
        showBackTable:function(e){
            e.preventDefault();
        /*    this.$el.find(".scoreBack").show();
            this.$el.find(".scoreFront").hide();
            this.$el.find(".stats").hide();
            this.$el.find("#btnBack").addClass("btn-primary");
            this.$el.find("#btnFront").removeClass("btn-primary");
            this.$el.find("#btnStats").removeClass("btn-primary");*/
            this.hideThese(["scoreFront","stats"]);
            this.showThis("scoreBack");
        },
        showStats:function(e){
            e.preventDefault();
            this.hideThese(["scoreFront","scoreBack"]);
            this.showThis("stats");
        },
        hideThese:function(items){
            var self = this;
            items.forEach(function(key){
                self.$el.find("." + key).hide();
                self.$el.find("#btn" + key ).removeClass("btn-primary");    
            });
        },
        showThis:function(key){
            this.$el.find("." + key).show();
            this.$el.find("#btn" + key ).addClass("btn-primary");    
        },
        getFrontTable: function(){
           return this.getTable(0);
         },
        getBackTable: function(){
           return this.getTable(9);
         },
        getTable: function(index){
            var tee = this.model.get("tee");
            var holes = this.model.get("holes");
            var html = "<tbody>";
            html += this.getRow(tee.holes,index,"Yards","yards",tee.yards);
            html += this.getRow(tee.holes,index,"Par","par",tee.par);
            html += this.getScoreRow(holes,tee.holes,index,"Score","score",this.model.get("score"));
            html += this.getRow(holes,index,"Putts","putts",this.model.get("stats").putts);
            html += this.getBoolRow(holes,tee.holes,index,"GIR","GIR",this.model.get("stats").GIR);
            html += this.getRow(holes,index,"Chips","chips",this.model.get("stats").chips,function(d){
                if(d.chips == 1){
                    if(d.putts === 0){
                        return "chipin";
                    }else if(d.putts === 1){
                        return "upAndDown";
                    }
                }
                return "";
            });
            html += this.getFairwayRow(holes,tee.holes,index,"Fairway","fairway",this.model.get("stats").fairwayPercent,function(val) {return (val=="Hit"||val=="hit");});
            html += this.getFairwayRow(holes,tee.holes,index,"Playable","playable",this.model.get("stats").playablePercent,function(val) {return val;});
            html += this.getExtraRow(holes,tee.holes,index,"Extras",this.model.get("stats").extra);
            html += this.getRow(holes,index,"Penalties","penalties",this.model.get("stats").penalties);
            html += this.getRow(holes,index,"Dr Pnts","drivePoints",this.model.get("stats").drivePoints);
            
            html += "</tbody>";
            return html;
         },
        getRow: function(holes,index,label,stat,total,classFunction){
            var html =  this.htmlTop(label);
                var sum = 0;
                for(var i = 0;i< 9;i++){
                    var val = holes[index+i][stat];
                    var className ="";
                    if(classFunction){
                        className = classFunction(holes[index+i]);
                    }
                    if(typeof val != 'undefined'){
                        sum += val;
                        html += "<td class='"  + className + "'>" + val + "</td>";
                    }else{
                        html += "<td class='"  + className + "'>0</td>";
                    }
                }
                 html += this.htmlBottom(sum,total);
            return html;
        },
        
        getExtraRow: function(holes,teeHoles,index,label,total){
            var html =  this.htmlTop(label);
                var sum = 0;
                for(var i = 0;i< 9;i++){
                    var scoreHole = holes[index+i];
                    var teeHole = teeHoles[index+i];
                    var val = (new scoreCalculator()).getExtra(scoreHole,teeHole.par);//holes[index+i][stat];
                    console.log("getExtraRow:",val);
                    if(typeof val != 'undefined'){
                        sum += val;
                        html += "<td>" + val + "</td>";
                    }else{
                        html += "<td>0</td>";
                    }
                }
                html += this.htmlBottom(sum,total);
            return html;
        },
      
        getScoreRow: function(holes,teeHoles,index,label,stat,total){
            var html =  this.htmlTop(label);
                var sum = 0;
                for(var i = 0;i< 9;i++){
                    var val = holes[index+i][stat];
                    if(typeof val != 'undefined'){
                        sum += val;
                        var diff = val - teeHoles[index+i].par;
                        var className = getScoreClassName(diff);
                        html += "<td class='" + className + "'>" + val + "</td>";
                    }else{
                        html += "<td class='bogie'>0</td>";
                    }
                }
                html += "<td class='bogie'>" + sum + "</td>";
                html += "<td class='bogie'>" + total + "</td>";
            html += "</tr>";
            return html;
        },
        getBoolRow: function(holes,teeHoles,index,label,stat,total){
            var html =  this.htmlTop(label);
            var sum = 0;
            for(var i = 0;i< 9;i++){
                var val = holes[index+i];
                var gir = ((teeHoles[index+i].par - 2 ) >= ( val.score - val.putts));
                
                console.log('bool row:',index+i,gir);
                if(gir){
                    sum += 1;
                    html += "<td><i class='icon icon-ok' /></td>";
                }else{
                    html += "<td><i class='icon icon-remove' /></td>";
                }
            }
            html  += this.htmlBottom(sum,total);
            return html;
        },
        getFairwayRow: function(holes,teeHoles,index,label,stat,total,test){
            var html =  this.htmlTop(label);
                var sum = 0;
                var cnt = 0;
             
                for(var i = 0;i< 9;i++){
                    var val = holes[index+i][stat];
                    if(teeHoles[index+i].par > 3 && typeof val != 'undefined'){
                        cnt += 1;
                        if(test(val)){
                            sum += 1;    
                            html += "<td><i class='icon icon-ok' /></td>";
                        }else{
                            html += "<td><i class='icon icon-remove' /></td>";
                        }
                    }else{
                        html += "<td>&nbsp;</td>";    
                    }
                }
                html += this.htmlBottom((sum / cnt*100).toFixed(0),total);
            return html;
        },
        htmlTop : function(label){
            return "<tr><th>" + label + "</th>";
        },
        htmlBottom :function(sum,total){
             return "<td>" + sum + "</td><td>" + total + "</td></tr>";
        }
    });
    function getScoreClassName(diff){
        switch(diff){
            case -3:
            case -2:
                return "eagle";
            case -1:
                return "birdie";
            case 0:
                return "par";
            case 1:
                return "bogie";
            case 2:
                return "double";
            default:
                return "other";
        }
    }
    return RecentView;
});