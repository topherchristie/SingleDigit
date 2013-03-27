define(['views/scoreTableItem'],function(ScoreTableItemView){
    
    function courseName(row, cell, value, columnDef, dataContext) {
        return dataContext.course.name;
    }
    function teeName(row, cell, value, columnDef, dataContext) {
        return dataContext.tee.name;
    }
    function statsFormatter(row, cell, value, columnDef, dataContext) {
        return dataContext.stats[columnDef.field];
    }
    var RecentView = Backbone.View.extend({
        el: '#recentTable',  
        columns:[
                {id:"prettyDate",name:"date",field:"prettyDate",width:80},
                {id:"course",name:"Course",field:"course",formatter:courseName},
                {id:"tee",name:"Tee",field:"tee.name",formatter:teeName},
                {id:"score",name:"Score",field:"score"}
            ],
        events:{
        
        },
        initialize: function(){
            
            // this.collection.on('add', this.render, this);
        },
        render:function(){
            var data = this.collection.toJSON();
            for(var i in data[0].stats){
                console.log(i);
                this.columns.push({id:i,name:i,field:i,formatter:statsFormatter}  )
            }
          /*     ,{id:"handicap",name:"Handicap",field:"handicap",formatter:statsFormatter}
                ,{id:"GIR",name:"GIR",field:"GIR",formatter:statsFormatter}
                ,{id:"putts",name:"Putts",field:"handicap",formatter:statsFormatter}
                ,{id:"handicap",name:"Handicap",field:"handicap",formatter:statsFormatter}
                ,{id:"handicap",name:"Handicap",field:"handicap",formatter:statsFormatter}
                ,{id:"handicap",name:"Handicap",field:"handicap",formatter:statsFormatter}
                ,{id:"handicap",name:"Handicap",field:"handicap",formatter:statsFormatter}
            */
            
            
         
                
            console.log("rendering: score table view");
            var self = this;
       /*     self.$el.empty();
            this.collection.last20().forEach(function(score){
              var item = new ScoreTableItemView({model:score});
               self.$el.append(item.render().el);
            });*/
           var options = {explicitInitialization:true, enableColumnReorder:false};
           
           console.log(data);
            this.grid = new Slick.Grid(self.$el,data,this.columns,options);
            this.grid.init();
            return this;
        }
    });
    return RecentView;
});